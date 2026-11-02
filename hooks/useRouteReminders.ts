import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/auth.store';
import { useRouteStore } from '@/store/route.store';
import { enableRouteReminders, syncRouteReminders } from '@/services/routeReminders';
import { ROUTE_REMINDER_KIND } from '@/utils/routeReminder.utils';

/** Schedule native reminders after successful route syncs, including while viewing other tabs. */
export function useRouteReminders() {
  const activationCode = useAuthStore((state) => state.activationCode);
  const driverId = useAuthStore((state) => state.driverId);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;
    const report = (error: unknown) => console.warn('Route reminders could not be updated:', error);
    if (!activationCode) {
      void syncRouteReminders(null, []).catch(report);
      return;
    }
    if (driverId === null) return;
    let active = true;
    let handledResponse: string | null = null;

    const reconcile = () => {
      if (!active) return;
      const state = useRouteStore.getState();
      const routes = state.routesOwnerId === driverId && !state.error ? state.allRoutes : undefined;
      void syncRouteReminders(driverId, routes, state.tenantTimezone).catch(report);
    };
    const refresh = () => {
      void useRouteStore.getState().fetchMyRoutes({ silent: true }).then(reconcile).catch(report);
    };
    const openReminder = async (response: Notifications.NotificationResponse | null) => {
      if (!active || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const { kind, routeId, driverId: owner } = response.notification.request.content.data ?? {};
      if (kind !== ROUTE_REMINDER_KIND || owner !== driverId || typeof routeId !== 'number') return;
      if (handledResponse === response.notification.request.identifier) return;
      handledResponse = response.notification.request.identifier;
      await useRouteStore.getState().fetchMyRoutes({ silent: true });
      if (!active) return;
      const state = useRouteStore.getState();
      if (state.routesOwnerId === driverId && state.allRoutes.some((route) => route.route_id === routeId)) {
        router.push({ pathname: '/(home)/route-detail', params: { routeId: String(routeId) } });
      }
      await Notifications.clearLastNotificationResponseAsync();
    };

    const unsubscribe = useRouteStore.subscribe((state, previous) => {
      if (state.allRoutes !== previous.allRoutes || state.routesOwnerId !== previous.routesOwnerId) reconcile();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        reconcile();
        refresh();
      }
    });
    const responses = Notifications.addNotificationResponseReceivedListener((response) => { void openReminder(response).catch(report); });
    void enableRouteReminders().then(reconcile).catch(report);
    void Notifications.getLastNotificationResponseAsync().then(openReminder).catch(report);
    reconcile();
    refresh();

    return () => { active = false; unsubscribe(); appState.remove(); responses.remove(); };
  }, [activationCode, driverId, isLoading]);
}
