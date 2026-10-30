import { RouteStop } from '@/types/route.types';
import { getStopProgress, isStopFinished } from '@/utils/shuttleRoute.utils';

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
