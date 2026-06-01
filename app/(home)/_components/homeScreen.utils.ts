import { RouteStop } from '@/types/route.types';

// ─────────────────────────────────────────────────────────────── //
// Time formatting
// ─────────────────────────────────────────────────────────────── //

export function formatTime(isoStr?: string): string {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─────────────────────────────────────────────────────────────── //
// Job type helpers
// ─────────────────────────────────────────────────────────────── //

export function getJobTypeLabel(jobType?: string): string {
  switch (jobType?.toLowerCase()) {
    case 'pickup': return 'Pickup';
    case 'service': return 'Service';
    default: return 'Delivery';
  }
}

export function getJobTypeIcon(jobType?: string): any {
  switch (jobType?.toLowerCase()) {
    case 'pickup': return 'return-up-back-outline';
    case 'service': return 'construct-outline';
    default: return 'cube-outline';
  }
}

// ─────────────────────────────────────────────────────────────── //
// Stop status helpers
// ─────────────────────────────────────────────────────────────── //

export function isStopDone(stop: RouteStop): boolean {
  return !!(
    stop.actual_departure_time ||
    stop.job?.status === 'completed' ||
    stop.job?.status === 'failed'
  );
}

export function getStopStatus(stop: RouteStop): 'completed' | 'failed' | 'pending' {
  if (stop.job?.status === 'failed') return 'failed';
  if (stop.job?.status === 'completed' || stop.actual_departure_time) return 'completed';
  return 'pending';
}

export default function DummyRouteComponent() {
  return null;
}
