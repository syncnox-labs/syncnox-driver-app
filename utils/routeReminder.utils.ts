import type { AssignedRoute } from '@/types/route.types';

export const ROUTE_REMINDER_KIND = 'route-start-reminder';
export const REMINDER_LEAD_MS = 30 * 60 * 1000;

/** API timestamps without an offset are wall-clock times in the tenant's timezone. */
export function routeTimestamp(value: string | undefined, timeZone: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value)) return null;
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(value) || !timeZone) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const wallClock = Math.floor(Date.parse(`${value.replace(' ', 'T')}Z`) / 1000) * 1000;
  if (!Number.isFinite(wallClock)) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    let candidate = wallClock;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
      const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
      const difference = wallClock - represented;
      if (difference === 0) return candidate;
      candidate += difference;
    }
    // A nonexistent local time during a daylight-saving transition must not trigger at a guessed time.
    return null;
  } catch {
    return null;
  }
}

export function getRouteReminder(route: AssignedRoute, timeZone: string | null, now: number) {
  if (!['pending', 'acknowledged'].includes(route.assignment_status)) return null;
  const stops = [...(route.stops ?? [])].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
  for (const stop of stops) {
    const startAt = routeTimestamp(stop.planned_arrival_time, timeZone) ?? routeTimestamp(stop.planned_departure_time, timeZone);
    if (startAt === null) continue;
    const remindAt = startAt - REMINDER_LEAD_MS;
    return remindAt > now ? { routeId: route.route_id, name: route.name || `Route #${route.route_id}`, startAt, remindAt } : null;
  }
  return null;
}
