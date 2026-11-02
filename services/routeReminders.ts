import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import type { AssignedRoute } from '@/types/route.types';
import { getRouteReminder, ROUTE_REMINDER_KIND } from '@/utils/routeReminder.utils';

const CHANNEL = 'route-reminders';
const PREFIX = 'syncnox-route-start:';
let queue: Promise<void> = Promise.resolve();
let latestRevision = 0;

export async function enableRouteReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Route start reminders', importance: AndroidImportance.DEFAULT,
      sound: 'default', vibrationPattern: [0, 250, 250, 250],
    });
  }
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && permission.ios?.status !== IosAuthorizationStatus.PROVISIONAL) {
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  }
}

/** Undefined routes means hydration/fetch is pending: retain this driver's existing reminders. */
export function syncRouteReminders(driverId: number | null, routes?: AssignedRoute[], timeZone: string | null = null): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  const revision = ++latestRevision;
  queue = queue.catch(() => {}).then(async () => {
    if (revision !== latestRevision) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const managed = scheduled.filter((item) => item.identifier.startsWith(PREFIX));
    if (revision !== latestRevision) return;

    const permission = driverId === null ? null : await Notifications.getPermissionsAsync();
    const allowed = permission?.granted || permission?.ios?.status === IosAuthorizationStatus.PROVISIONAL;
    // iOS limits pending local notifications; retain the nearest 60 across all routes.
    const reminders = driverId !== null && allowed && routes
      ? routes.map((route) => getRouteReminder(route, timeZone, Date.now()))
        .filter((item) => item !== null).sort((a, b) => a.remindAt - b.remindAt).slice(0, 60)
      : [];
    const desired = new Map(reminders.map((item) => [`${PREFIX}${driverId}:${item.routeId}:${item.startAt}`, item]));

    for (const item of managed) {
      if (revision !== latestRevision) return;
      const retainWhileLoading = driverId !== null && routes === undefined && item.content.data?.driverId === driverId;
      if (!retainWhileLoading && !desired.has(item.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
    if (driverId === null) {
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const notification of presented) {
        if (notification.request.identifier.startsWith(PREFIX)) {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response?.notification.request.content.data?.kind === ROUTE_REMINDER_KIND) {
        await Notifications.clearLastNotificationResponseAsync();
      }
    }
    for (const [identifier, reminder] of desired) {
      if (revision !== latestRevision) return;
      const existing = managed.find((item) => item.identifier === identifier);
      if (existing?.content.title === reminder.name && existing.content.body === 'Your route starts in 30 mins.') continue;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: reminder.name, body: 'Your route starts in 30 mins.', sound: 'default',
          data: { kind: ROUTE_REMINDER_KIND, routeId: reminder.routeId, driverId, startAt: reminder.startAt },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.remindAt), channelId: CHANNEL },
      });
    }
  });
  return queue;
}
