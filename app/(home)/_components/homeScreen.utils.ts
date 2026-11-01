import { RouteStop } from '@/types/route.types';
import { getStopProgress, isStopFinished } from '@/utils/shuttleRoute.utils';

// ─────────────────────────────────────────────────────────────── //
// Time formatting
// ─────────────────────────────────────────────────────────────── //

export function formatTime(value?: string | null): string {
  const input = value?.trim();
  if (!input) return '--:--';

  // Passenger pickup times are local clock values, not ISO timestamps.
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(input);
  let d: Date;
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    const seconds = Number(clock[3] ?? 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return '--:--';
    d = new Date(2000, 0, 1, hours, minutes, seconds);
  } else {
    d = new Date(input);
  }

  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─────────────────────────────────────────────────────────────── //
// Job type helpers
// ─────────────────────────────────────────────────────────────── //

export function getJobTypeLabel(jobType?: string): string {
  switch (jobType?.toLowerCase()) {
    case 'dropoff':
    case 'drop_off': return 'Drop-off';
    case 'pickup': return 'Pickup';
    case 'service': return 'Service';
    default: return 'Delivery';
  }
}

// ─────────────────────────────────────────────────────────────── //
// Stop status helpers
// ─────────────────────────────────────────────────────────────── //

export function isStopDone(stop: RouteStop): boolean {
  return isStopFinished(stop);
}

/**
 * Per-stop status. Shuttle pickup/dropoff stops of one job share a job record, so this
 * reads the stop's own progress (never only the job status). A skipped stop (its passenger
 * never boarded) is shown with the failed styling.
 */
export function getStopStatus(stop: RouteStop): 'completed' | 'failed' | 'pending' {
  const progress = getStopProgress(stop);
  if (progress === 'completed') return 'completed';
  if (progress === 'failed' || progress === 'skipped') return 'failed';
  return 'pending';
}

export default function DummyRouteComponent() {
  return null;
}
