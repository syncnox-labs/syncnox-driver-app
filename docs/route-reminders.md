# Route start reminders

The mobile app schedules a device notification with the route name and the message
“Your route starts in 30 mins.” thirty minutes before its first scheduled stop.
Routes must have synced to the device before the reminder time. This is local
scheduling, so a downloaded reminder can appear with the app closed and without
a network connection. It is not a server push service: routes assigned, removed,
or changed while the app is closed are reconciled on the next successful sync.

## Behaviour

- Pending and acknowledged routes qualify. Started, completed, and unassigned
  routes have their pending reminders removed. Logout clears this feature's
  pending and delivered notifications.
- Route refreshes and WebSocket updates reconcile reminders without duplicates.
  Returning to the foreground refreshes the route list and notification permissions.
- The first stop in sequence determines the start time. Its planned arrival is
  preferred, with planned departure as a fallback. A service date alone is not
  enough to infer a start time.
- Offset-aware timestamps retain their absolute time. Naive timestamps use the
  API's `tenant_timezone`; device-local time is a fallback when the server does
  not supply one. Nonexistent daylight-saving times are skipped.
- Reminders whose 30-minute notification time has already passed are not sent
  late with an inaccurate “30 mins” message. The nearest 60 future reminders are
  retained to stay below iOS's pending-notification limit.
- Tapping a reminder refreshes assignments and opens the matching route only if
  it still belongs to the signed-in driver.
- Permission is requested after login. Drivers can manage it through
  **Settings → Route reminders**. Denied permissions, silent modes, and Android
  battery/Doze restrictions can suppress or delay delivery. Android currently uses
  best-effort scheduling; no exact-alarm access is requested.

## Native build and verification

`expo-notifications` adds native code and a config plugin. Create a new native
build before testing this feature; a JavaScript reload of an older installed
binary is insufficient. EAS preview/production builds include the plugin. For
an existing local native project, run the normal Expo prebuild step before
rebuilding. Remote push notifications are disabled in the plugin because this
feature does not use FCM/APNs or require an APNs signing entitlement.

Automated checks:

```sh
node tests/route-reminders.test.cjs
node tests/auth-session.test.cjs
```

On physical Android and iOS devices, allow notifications, sync a route starting
31 minutes from now, then background/close the app. Verify the notification after
one minute and tap it to open the route. Also check denial/re-enabling permissions,
rescheduling, starting a route early, unassignment, logout, and reopening offline.
These device checks have not been run in the container.

API reference: https://docs.expo.dev/versions/latest/sdk/notifications/
