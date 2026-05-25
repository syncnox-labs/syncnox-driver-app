import { create } from 'zustand';
import { apiClient } from '@/config/apiClient';
import { AssignedRoute, RouteStop } from '@/types/route.types';

interface RouteState {
  assignedRoute: AssignedRoute | null;
  isLoading: boolean;
  error: string | null;

  fetchMyRoute: () => Promise<void>;
  acknowledgeRoute: () => Promise<void>;
  updateStopStatus: (stopId: number, status: 'completed' | 'failed') => Promise<void>;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  assignedRoute: null,
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

      set({ assignedRoute: { ...current, stops: updatedStops } });
    } catch (e: any) {
      console.error('updateStopStatus error:', e);
      throw e;
    }
  },

  clearRoute: () => set({ assignedRoute: null, error: null }),
}));
