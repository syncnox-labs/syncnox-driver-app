import {
  AssignedRoute,
  JobTemplateType,
  PassengerSummary,
  RouteStop,
  StopProgress,
} from '@/types/route.types';

// ─────────────────────────────────────────────────────────────── //
// Stop classification
// ─────────────────────────────────────────────────────────────── //

export type StopKind =
  | 'start'
  | 'end'
  | 'pickup'
  | 'dropoff'
  | 'delivery'
  | 'service'
  | 'job';

export function isDepotStop(stop: RouteStop): boolean {
  return (stop.stop_type ?? '').toLowerCase().startsWith('depot');
}

export function isShuttleStop(stop: RouteStop, template?: JobTemplateType | null): boolean {
  return (
    stop.job?.job_template_type === 'worker_shuttle' ||
    (template === 'worker_shuttle' && !isDepotStop(stop))
  );
}

/** What this stop IS, independent of the job record (stop_type wins for shuttle stops). */
export function getStopKind(stop: RouteStop, template?: JobTemplateType | null): StopKind {
  const type = (stop.stop_type ?? '').toLowerCase();
  if (type === 'depot_start' || type === 'depot') return 'start';
  if (type === 'depot_end') return 'end';
  if (isShuttleStop(stop, template)) {
    return type === 'dropoff' || type === 'drop_off' ? 'dropoff' : 'pickup';
  }
  const jobType = (stop.job?.job_type ?? type).toLowerCase();
  if (jobType === 'pickup') return 'pickup';
  if (jobType === 'service') return 'service';
  if (jobType === 'delivery') return 'delivery';
  return 'job';
}

// ─────────────────────────────────────────────────────────────── //
// Per-stop progress (pickup and dropoff of one job are independent)
// ─────────────────────────────────────────────────────────────── //

export function getStopProgress(stop: RouteStop): StopProgress {
  if (stop.status) return stop.status;
  // Legacy payloads without a per-stop status.
  if (stop.job?.status === 'failed') return 'failed';
  if (stop.job?.status === 'completed' || stop.actual_departure_time) return 'completed';
  return 'pending';
}

export function isStopFinished(stop: RouteStop): boolean {
  return getStopProgress(stop) !== 'pending';
}

// ─────────────────────────────────────────────────────────────── //
// Co-located stop grouping (mirrors the web dashboard's stopDisplay.utils)
// ─────────────────────────────────────────────────────────────── //

export type GroupProgress = 'pending' | 'partial' | 'completed' | 'failed' | 'skipped';

export interface GroupedRouteStop {
  key: string;
  kind: StopKind;
  representative: RouteStop;
  stops: RouteStop[];
  /** 1..N for physical visits; terminals (start/end) are not numbered. */
  displayNumber: number | null;
  progress: GroupProgress;
  finishedCount: number;
  passengerCount: number;
}

function coordKey(stop: RouteStop): string | null {
  const loc = stop.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
  return `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
}

function sameVisit(a: RouteStop, b: RouteStop, kindA: StopKind, kindB: StopKind): boolean {
  if (kindA !== kindB) return false;
  if (!a.planned_arrival_time || a.planned_arrival_time !== b.planned_arrival_time) return false;
  const ca = coordKey(a);
  const cb = coordKey(b);
  if (ca && cb) return ca === cb;
  return !!a.address_formatted && a.address_formatted === b.address_formatted;
}

/** Hide the redundant "Previous GO trip end" origin of a team-leader RETURN trip. */
export function isRedundantLeaderStart(route: Pick<AssignedRoute, 'is_team_leader' | 'leg'>, stops: RouteStop[], index: number): boolean {
  const stop = stops[index];
  const next = stops[index + 1];
  if (!route.is_team_leader || route.leg !== 'RETURN' || !stop || !next) return false;
  if (stop.stop_type !== 'depot_start' || stop.address_formatted !== 'Previous GO trip end') return false;
  const a = coordKey(stop);
  return !!a && a === coordKey(next);
}

function groupProgress(stops: RouteStop[]): GroupProgress {
  const states = stops.map(getStopProgress);
  const finished = states.filter((s) => s !== 'pending').length;
  if (finished === 0) return 'pending';
  if (finished < states.length) return 'partial';
  if (states.every((s) => s === 'skipped')) return 'skipped';
  if (states.every((s) => s === 'failed' || s === 'skipped')) return 'failed';
  return 'completed';
}

export function groupRouteStops(
  route: Pick<AssignedRoute, 'stops' | 'is_team_leader' | 'leg' | 'job_template_type'>,
  template?: JobTemplateType | null,
): GroupedRouteStop[] {
  const tpl = template ?? route.job_template_type ?? null;
  const ordered = [...(route.stops ?? [])].sort(
    (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0),
  );
  const groups: GroupedRouteStop[] = [];
  ordered.forEach((stop, index) => {
    if (isRedundantLeaderStart(route, ordered, index)) return;
    const kind = getStopKind(stop, tpl);
    const prev = groups[groups.length - 1];
    const terminal = kind === 'start' || kind === 'end';
    if (prev && !terminal && sameVisit(prev.representative, stop, prev.kind, kind)) {
      prev.stops.push(stop);
      return;
    }
    groups.push({
      key: `g${stop.id}`,
      kind,
      representative: stop,
      stops: [stop],
      displayNumber: null,
      progress: 'pending',
      finishedCount: 0,
      passengerCount: 0,
    });
  });

  let n = 0;
  for (const g of groups) {
    if (g.kind !== 'start' && g.kind !== 'end') g.displayNumber = ++n;
    g.progress = groupProgress(g.stops);
    g.finishedCount = g.stops.filter(isStopFinished).length;
    g.passengerCount = g.stops.filter((s) => !!s.job).length;
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────── //
// Passengers
// ─────────────────────────────────────────────────────────────── //

export interface StopPassenger {
  stopId: number;
  jobId?: number;
  name: string;
  phone?: string;
  candidateId?: string;
  notes?: string;
  pickupTime?: string;
  isTeamLeader: boolean;
  progress: StopProgress;
}

export function getStopPassenger(stop: RouteStop): StopPassenger {
  const job = stop.job;
  const ws = job?.worker_shuttle;
  const fullName = [job?.first_name, job?.last_name].filter(Boolean).join(' ').trim();
  const own: PassengerSummary | undefined = stop.passengers?.find((p) => p.stop_id === stop.id);
  return {
    stopId: stop.id,
    jobId: job?.id,
    name: ws?.candidate_name || own?.candidate_name || fullName || job?.business_name || 'Passenger',
    phone: ws?.candidate_phone || own?.candidate_phone || job?.phone_number,
    candidateId: ws?.candidate_id || ws?.quant_id,
    notes: ws?.notes || job?.additional_notes,
    pickupTime: ws?.client_pick_up_time,
    isTeamLeader: !!stop.is_team_leader_self_job || !!own?.is_team_leader_self_job,
    progress: getStopProgress(stop),
  };
}

export function getGroupPassengers(group: GroupedRouteStop): StopPassenger[] {
  return group.stops.filter((s) => !!s.job).map(getStopPassenger);
}

// ─────────────────────────────────────────────────────────────── //
// Labels
// ─────────────────────────────────────────────────────────────── //

export function getKindLabel(kind: StopKind, template?: JobTemplateType | null): string {
  if (kind === 'start') return 'Start';
  if (kind === 'end') return 'End';
  if (template === 'worker_shuttle') return kind === 'dropoff' ? 'Drop-off' : 'Pick-up';
  switch (kind) {
    case 'pickup': return 'Pickup';
    case 'service': return 'Service';
    default: return 'Delivery';
  }
}

/** Past-tense label for a completed stop. */
export function getDoneLabel(kind: StopKind, template?: JobTemplateType | null): string {
  if (template === 'worker_shuttle') return kind === 'dropoff' ? 'Dropped off' : 'Boarded';
  return 'Delivered';
}

export function getFailLabel(kind: StopKind, template?: JobTemplateType | null): string {
  if (template === 'worker_shuttle' && kind !== 'dropoff') return 'No-show';
  return 'Failed';
}

export function formatWaiting(seconds?: number | null): string | null {
  if (!seconds || seconds < 60) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Route display name that keeps the GO / RETURN leg visible. */
export function getRouteLegLabel(route: Pick<AssignedRoute, 'leg'>): string | null {
  if (route.leg === 'GO' || route.leg === 'RETURN') return route.leg;
  return null;
}

