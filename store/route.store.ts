import { create } from 'zustand';
import { apiClient } from '@/config/apiClient';
import { useAuthStore } from '@/store/auth.store';
import {
  AssignedRoute,
  JobTemplateType,
  NoShowScope,
  RouteStop,
  StopProgress,
} from '@/types/route.types';
import { DistanceUnit } from '@/utils/distance.utils';
import { isStopFinished } from '@/utils/shuttleRoute.utils';

let routesFetchRevision = 0;

export type StopStatusInput = 'completed' | 'failed' | 'pending';

export interface StopUpdateInput {
  stopId: number;
  status: StopStatusInput;
  /** Shuttle no-show only: skip just this leg's dropoff, or the whole job (all legs). */
  noShowScope?: NoShowScope;
}

interface ServerStopResult {
  stop_id: number;
  status: StopProgress | null;
  job_id: number | null;
  job_status: string | null;
}

interface StopUpdateResponse {
  progress_percentage?: number;
  assignment_status?: string | null;
  stops?: ServerStopResult[];
}

interface RouteState {
  assignedRoute: AssignedRoute | null;  // active route (in_progress > acknowledged > pending)
  allRoutes: AssignedRoute[];           // every route (active + completed)
  selectedRouteId: number | null;       // route the driver is viewing; null = follow active route
  distanceUnit: DistanceUnit;           // 'miles' | 'km'
  isLoading: boolean;
  error: string | null;
  routesOwnerId: number | null;
  tenantTimezone: string | null;

  fetchMyRoute: () => Promise<void>;
  fetchMyRoutes: (options?: { silent?: boolean }) => Promise<void>;
  selectRoute: (routeId: number | null) => void;
  acknowledgeRoute: (routeId?: number) => Promise<void>;
  startRoute: (routeId: number) => Promise<void>;
  updateStopStatus: (
    stopId: number,
    status: StopStatusInput,
    options?: { routeId?: number; noShowScope?: NoShowScope },
  ) => Promise<void>;
  updateBatchStopStatus: (routeId: number, updates: StopUpdateInput[]) => Promise<void>;
  setDistanceUnit: (unit: DistanceUnit) => Promise<void>;
  clearRoute: () => void;
}

/** The route the driver is currently looking at: explicit selection, else the active route. */
export function selectViewedRoute(state: Pick<RouteState, 'allRoutes' | 'assignedRoute' | 'selectedRouteId'>): AssignedRoute | null {
  if (state.selectedRouteId != null) {
    const found = state.allRoutes.find((r) => r.route_id === state.selectedRouteId);
    if (found) return found;
  }
  return state.assignedRoute;
}

export function findStopInRoutes(
  routes: AssignedRoute[],
  stopId: number,
  routeId?: number | null,
): { route: AssignedRoute; stop: RouteStop } | null {
  const candidates = routeId != null ? routes.filter((r) => r.route_id === routeId) : routes;
  for (const route of candidates) {
    const stop = route.stops.find((s) => s.id === stopId);
    if (stop) return { route, stop };
  }
  return null;
}

function pickActive(routes: AssignedRoute[]): AssignedRoute | null {
  const open = routes.filter((r) => r.assignment_status !== 'completed');
  return (
    open.find((r) => r.assignment_status === 'in_progress') ??
    open.find((r) => r.assignment_status === 'acknowledged') ??
    open.find((r) => r.assignment_status === 'pending') ??
    null
  );
}

/** Mirror the server's per-stop result onto local state (server is the source of truth). */
function applyStopResult(
  routes: AssignedRoute[],
  routeId: number,
  result: StopUpdateResponse,
): AssignedRoute[] {
  const byStop = new Map((result.stops ?? []).map((s) => [s.stop_id, s]));
  const jobStatus = new Map(
    (result.stops ?? []).filter((s) => s.job_id != null).map((s) => [s.job_id as number, s.job_status]),
  );
  const nowIso = new Date().toISOString();
  return routes.map((route) => {
    if (route.route_id !== routeId) return route;
    const stops = route.stops.map((stop) => {
      const server = byStop.get(stop.id);
      const status = server?.status ?? stop.status;
      const jobId = stop.job?.id;
      const newJobStatus = jobId != null && jobStatus.has(jobId) ? jobStatus.get(jobId) : undefined;
      const finished = status != null && status !== 'pending';
      return {
        ...stop,
        status: status ?? undefined,
        actual_arrival_time: finished ? stop.actual_arrival_time ?? nowIso : undefined,
        actual_departure_time: server ? (finished ? stop.actual_departure_time ?? nowIso : undefined) : stop.actual_departure_time,
        job: stop.job && newJobStatus ? { ...stop.job, status: newJobStatus } : stop.job,
      };
    });
    return {
      ...route,
      stops,
      assignment_status: result.assignment_status ?? route.assignment_status,
    };
  });
}

export const useRouteStore = create<RouteState>((set, get) => ({
  assignedRoute: null,
  allRoutes: [],
  selectedRouteId: null,
  distanceUnit: 'miles',
  isLoading: false,
  error: null,
  routesOwnerId: null,
  tenantTimezone: null,

  fetchMyRoute: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<AssignedRoute>('/driver/my-route');
      const route = response.data;

      // Auto-acknowledge when we receive a pending route
      if (route.assignment_status === 'pending') {
        try {
          await apiClient.post(`/driver/routes/${route.route_id}/acknowledge`);
          route.assignment_status = 'acknowledged';
        } catch (_) {
          // non-fatal
        }
      }

      set({ assignedRoute: route, isLoading: false });
    } catch (e: any) {
      const is404 = e?.response?.status === 404;
      set({
        assignedRoute: null,
        isLoading: false,
        error: is404 ? null : 'Failed to load route',
      });
    }
  },

  fetchMyRoutes: async (options) => {
    const revision = ++routesFetchRevision;
    const session = useAuthStore.getState();
    const ownerId = session.driverId;
    const activationCode = session.activationCode;
    const showSpinner = !options?.silent || get().allRoutes.length === 0;
    if (showSpinner) set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{
        routes: AssignedRoute[];
        distance_unit?: string;
        job_template?: JobTemplateType;
        tenant_timezone?: string;
      }>('/driver/my-routes');
      if (revision !== routesFetchRevision || useAuthStore.getState().activationCode !== activationCode) return;
      const routes = response.data.routes ?? [];
      const unitRaw = response.data.distance_unit;
      const unit: DistanceUnit = unitRaw === 'km' || unitRaw === 'kilometers' ? 'km' : 'miles';
      if (response.data.job_template) {
        useAuthStore.getState().setJobTemplate(response.data.job_template);
      }

      // Sanitize routes: if every job stop is finished, treat the assignment as completed
      const sanitizedRoutes = routes.map((r) => {
        const jobStops = r.stops?.filter((s) => !!s.job) ?? [];
        const isAllDone = jobStops.length > 0 && jobStops.every(isStopFinished);
        if (isAllDone && r.assignment_status !== 'completed') {
          return { ...r, assignment_status: 'completed' };
        }
        return r;
      });

      const selected = get().selectedRouteId;
      set({
        allRoutes: sanitizedRoutes,
        assignedRoute: pickActive(sanitizedRoutes),
        // Drop a selection that no longer exists (route was re-planned or unassigned).
        selectedRouteId:
          selected != null && sanitizedRoutes.some((r) => r.route_id === selected) ? selected : null,
        distanceUnit: unit,
        isLoading: false,
        error: null,
        routesOwnerId: ownerId,
        tenantTimezone: response.data.tenant_timezone ?? null,
      });
    } catch (e: any) {
      if (revision !== routesFetchRevision || useAuthStore.getState().activationCode !== activationCode) return;
      const is404 = e?.response?.status === 404;
      set({
        isLoading: false,
        error: is404 ? null : 'Failed to load routes',
        // A failed refresh does not revoke assignments or their scheduled reminders.
        ...(is404 ? { allRoutes: [], assignedRoute: null, selectedRouteId: null, routesOwnerId: ownerId } : {}),
      });
    }
  },

  selectRoute: (routeId) => set({ selectedRouteId: routeId }),

  acknowledgeRoute: async (routeId?: number) => {
    try {
      const target = routeId ?? get().assignedRoute?.route_id;
      if (target == null) return;
      await apiClient.post(`/driver/routes/${target}/acknowledge`);
      set((state) => ({
        assignedRoute:
          state.assignedRoute?.route_id === target
            ? { ...state.assignedRoute, assignment_status: 'acknowledged' }
            : state.assignedRoute,
        allRoutes: state.allRoutes.map((route) =>
          route.route_id === target ? { ...route, assignment_status: 'acknowledged' } : route,
        ),
      }));
    } catch (e) {
      console.warn('Acknowledge failed:', e);
    }
  },

  /** Starts a route; the server auto-checks-in a team leader riding their own booking. */
  startRoute: async (routeId: number) => {
    const activationCode = useAuthStore.getState().activationCode;
    await apiClient.post(`/driver/routes/${routeId}/start`);
    if (useAuthStore.getState().activationCode !== activationCode) return;
    // Update immediately so a pending reminder is cancelled even if the refresh fails.
    set((state) => ({
      allRoutes: state.allRoutes.map((route) => route.route_id === routeId ? { ...route, assignment_status: 'in_progress' } : route),
      assignedRoute: state.assignedRoute?.route_id === routeId
        ? { ...state.assignedRoute, assignment_status: 'in_progress' } : state.assignedRoute,
      error: null,
    }));
    // Re-sync: the server may have boarded the team leader.
    await get().fetchMyRoutes({ silent: true });
  },

  updateStopStatus: async (stopId, status, options) => {
    const found = findStopInRoutes(get().allRoutes, stopId, options?.routeId);
    const routeId = options?.routeId ?? found?.route.route_id;
    if (routeId == null) throw new Error('Stop not found');
    try {
      const { data } = await apiClient.post<StopUpdateResponse>(`/driver/stops/${stopId}/status`, {
        status,
        no_show_scope: options?.noShowScope ?? 'this_leg',
      });
      const allRoutes = applyStopResult(get().allRoutes, routeId, data);
      set({ allRoutes, assignedRoute: pickActive(allRoutes) });
      if (get().allRoutes.length > 1 && (options?.noShowScope === 'job' || status === 'pending')) {
        void get().fetchMyRoutes({ silent: true });
      }
    } catch (e: any) {
      console.error('updateStopStatus error:', e);
      throw e;
    }
  },

  /** Atomically update several stops of one route (e.g. everyone at a shared pickup). */
  updateBatchStopStatus: async (routeId, updates) => {
    try {
      const { data } = await apiClient.post<StopUpdateResponse>('/driver/stops/batch-status', {
        updates: updates.map((u) => ({
          stop_id: u.stopId,
          status: u.status,
          no_show_scope: u.noShowScope ?? 'this_leg',
        })),
      });
      const allRoutes = applyStopResult(get().allRoutes, routeId, data);
      set({ allRoutes, assignedRoute: pickActive(allRoutes) });
    } catch (e: any) {
      console.error('updateBatchStopStatus error:', e);
      throw e;
    }
  },

  setDistanceUnit: async (unit: DistanceUnit) => {
    // Optimistic update
    set({ distanceUnit: unit });
    try {
      await apiClient.patch('/driver/settings', { distance_unit: unit });
    } catch (e) {
      console.warn('Failed to persist distance unit setting:', e);
    }
  },

  clearRoute: () => {
    routesFetchRevision++;
    set({ assignedRoute: null, allRoutes: [], selectedRouteId: null, error: null, routesOwnerId: null, tenantTimezone: null });
  },
}));
