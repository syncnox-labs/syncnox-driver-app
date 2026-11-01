import type { GroupedRouteStop } from '@/utils/shuttleRoute.utils';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function searchableValues(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number') return [normalize(String(value))];
  if (Array.isArray(value)) return value.flatMap(searchableValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(searchableValues);
  return [];
}

/** Keep full physical visits when any job at that visit matches every search term. */
export function filterRouteStopGroups(groups: GroupedRouteStop[], query: string): GroupedRouteStop[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return groups;

  return groups.filter((group) => {
    if (group.kind === 'start' || group.kind === 'end') return false;
    return group.stops.some((stop) => {
      // Passenger summaries can include other jobs at this address; search only this job's summary.
      const passengers = stop.passengers?.filter((p) => p.stop_id === stop.id || p.job_id === stop.job?.id);
      const values = searchableValues([stop.job, passengers, stop.address_formatted, stop.planned_arrival_time]);
      return terms.every((term) => values.some((value) => {
        if (value.includes(term)) return true;
        // Let a phone number or ID match with or without spaces, punctuation, or a leading +.
        const compact = term.replace(/[^a-z0-9]/g, '');
        return compact.length > 0 && value.replace(/[^a-z0-9]/g, '').includes(compact);
      }));
    });
  });
}
