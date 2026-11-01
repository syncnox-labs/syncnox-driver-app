import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouteStore } from '@/store/route.store';
import { AssignedRoute } from '@/types/route.types';

export function useStartRoute() {
  const startRoute = useRouteStore((state) => state.startRoute);
  const pendingRouteId = useRef<number | null>(null);
  const requestInFlight = useRef(false);
  const [startingRouteId, setStartingRouteId] = useState<number | null>(null);

  function requestStart(route: AssignedRoute, onStarted?: () => void) {
    if (
      pendingRouteId.current !== null ||
      requestInFlight.current ||
      !['pending', 'acknowledged'].includes(route.assignment_status)
    ) return;

    pendingRouteId.current = route.route_id;
    const vehicle = route.vehicle;
    const vehicleDetails = vehicle
      ? [
          vehicle.name && `Vehicle: ${vehicle.name}`,
          vehicle.type && `Type: ${vehicle.type.replace(/_/g, ' ')}`,
          vehicle.license_plate && `License plate: ${vehicle.license_plate}`,
          vehicle.capacity != null && `Capacity: ${vehicle.capacity} seats`,
        ].filter(Boolean).join('\n') || vehicle.vehicle_summary || 'Vehicle details unavailable.'
      : 'No vehicle assigned.';

    Alert.alert(
      'Start route?',
      `${route.name || `Route #${route.route_id}`}\n\n${vehicleDetails}\n\nConfirm to start this route.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => { pendingRouteId.current = null; },
        },
        {
          text: 'Start Route',
          onPress: async () => {
            // Ignore repeated confirmation taps while the request is running.
            if (pendingRouteId.current !== route.route_id) return;
            pendingRouteId.current = null;
            requestInFlight.current = true;
            setStartingRouteId(route.route_id);
            try {
              await startRoute(route.route_id);
              onStarted?.();
            } catch {
              Alert.alert('Error', 'Could not start the route. Please try again.');
            } finally {
              requestInFlight.current = false;
              setStartingRouteId(null);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => { pendingRouteId.current = null; } },
    );
  }

  return { requestStart, startingRouteId };
}
