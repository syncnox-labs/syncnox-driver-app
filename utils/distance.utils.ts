export type DistanceUnit = 'miles' | 'km';

/**
 * Formats distance in meters into the user's preferred unit ('miles' or 'km').
 * @param meters - Distance in meters
 * @param unit - User preferred distance unit ('miles' or 'km')
 * @param withNewline - Whether to format as '12.5\nmi' for compact grid cards
 */
export function formatDistance(
  meters: number | undefined | null,
  unit: DistanceUnit = 'miles',
  withNewline: boolean = false,
): string {
  if (!meters || meters <= 0) return '—';
  if (unit === 'km') {
    const km = (meters / 1000).toFixed(1);
    return withNewline ? `${km}\nkm` : `${km} km`;
  } else {
    const mi = (meters / 1609.34).toFixed(1);
    return withNewline ? `${mi}\nmi` : `${mi} mi`;
  }
}
