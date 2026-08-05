import { create } from 'zustand';
import { apiClient } from '@/config/apiClient';
import { AssignedRoute, RouteStop } from '@/types/route.types';

interface RouteState {
  assignedRoute: AssignedRoute | null;  // active route for the map tab
  allRoutes: AssignedRoute[];           // all routes (active + completed) for home tab
  isLoading: boolean;
  error: string | null;

  fetchMyRoute: () => Promise<void>;
  fetchMyRoutes: () => Promise<void>;
  acknowledgeRoute: () => Promise<void>;
  updateStopStatus: (stopId: number, status: 'completed' | 'failed') => Promise<void>;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  assignedRoute: null,
  allRoutes: [],
  isLoading: false,
  error: null,

  fetchMyRoute: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<AssignedRoute>('/driver/my-route');
      const route = response.data;

      // Auto-acknowledge when we receive a pending route
      if (route.assignment_status === 'pending') {
        try {
          await apiClient.post('/driver/my-route/acknowledge');
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

  fetchMyRoutes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ routes: AssignedRoute[] }>('/driver/my-routes');
      const routes = response.data.routes ?? [];

      // Sanitize routes: if all job stops are completed, mark assignment_status as 'completed'
      const sanitizedRoutes = routes.map((r) => {
        const jobStops = r.stops?.filter((s) => !!s.job) ?? [];
        const isAllDone =
          jobStops.length > 0 &&
          jobStops.every(
            (s) =>
              !!s.actual_departure_time ||
              s.job?.status === 'completed' ||
              s.job?.status === 'failed',
          );
        if (isAllDone && r.assignment_status !== 'completed') {
          return { ...r, assignment_status: 'completed' };
        }
        return r;
      });

      // The "active" route is the first non-completed one
      const active = sanitizedRoutes.find(
        (r) => r.assignment_status !== 'completed',
      ) ?? null;

      set({ allRoutes: sanitizedRoutes, assignedRoute: active, isLoading: false });
    } catch (e: any) {
      const is404 = e?.response?.status === 404;
      set({
        allRoutes: [],
        assignedRoute: null,
        isLoading: false,
        error: is404 ? null : 'Failed to load routes',
      });
    }
  },

  acknowledgeRoute: async () => {
    try {
      await apiClient.post('/driver/my-route/acknowledge');
      const current = get().assignedRoute;
      if (current) {
        set({ assignedRoute: { ...current, assignment_status: 'acknowledged' } });
      }
    } catch (e) {
      console.warn('Acknowledge failed:', e);
    }
  },

  updateStopStatus: async (stopId: number, status: 'completed' | 'failed') => {
    try {
      await apiClient.post(`/driver/stops/${stopId}/status`, { status });

      // Optimistic UI update — flip the stop's job status locally
      const current = get().assignedRoute;
      if (!current) return;

      const updatedStops: RouteStop[] = current.stops.map((s) => {
        if (s.id !== stopId) return s;
        return {
          ...s,
          actual_arrival_time: s.actual_arrival_time ?? new Date().toISOString(),
          actual_departure_time: new Date().toISOString(),
          job: s.job ? { ...s.job, status } : s.job,
        };
      });

      const jobStops = updatedStops.filter((s) => !!s.job);
      const isAllDone =
        jobStops.length > 0 &&
        jobStops.every(
          (s) =>
            !!s.actual_departure_time ||
            s.job?.status === 'completed' ||
            s.job?.status === 'failed',
        );

      const newAssignmentStatus = isAllDone
        ? 'completed'
        : current.assignment_status === 'acknowledged' || current.assignment_status === 'pending'
        ? 'in_progress'
        : current.assignment_status;

      const updatedRoute: AssignedRoute = {
        ...current,
        stops: updatedStops,
        assignment_status: newAssignmentStatus,
      };

      const allRoutes = get().allRoutes.map((r) =>
        r.route_id === updatedRoute.route_id ? updatedRoute : r,
      );

      const nextActive =
        allRoutes.find((r) => r.assignment_status !== 'completed') ?? null;

      set({ allRoutes, assignedRoute: nextActive });
    } catch (e: any) {
      console.error('updateStopStatus error:', e);
      throw e;
    }
  },

  clearRoute: () => set({ assignedRoute: null, allRoutes: [], error: null }),
}));
