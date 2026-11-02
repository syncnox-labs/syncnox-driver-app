/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const NOW = Date.parse('2026-11-03T08:00:00Z');
class Clock extends Date { static now() { return NOW; } }
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Date: Clock, Intl,
    console: { warn() {}, error() {} },
    require: name => name in dependencies ? dependencies[name] : require(name),
  });
  return exports;
}
const utils = load('utils/routeReminder.utils.ts');
const route = (id = 42, time = '2026-11-03T10:00:00Z', status = 'pending') => ({
  route_id: id, name: `Route ${id}`, assignment_status: status,
  stops: [{ id: 1, sequence_order: 0, stop_type: 'depot_start', planned_arrival_time: time }],
});

function scheduler(platform = 'android') {
  const pending = new Map();
  const calls = { scheduled: [], cancelled: [], dismissed: [], requested: 0, channels: [], lastCleared: 0 };
  let permission = { granted: true, canAskAgain: true };
  const native = {
    AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: handler => { calls.handler = handler; },
    setNotificationChannelAsync: async (...args) => { calls.channels.push(args); },
    getPermissionsAsync: async () => permission,
    requestPermissionsAsync: async () => { calls.requested++; return permission; },
    getAllScheduledNotificationsAsync: async () => [...pending.values()],
    cancelScheduledNotificationAsync: async id => { calls.cancelled.push(id); pending.delete(id); },
    scheduleNotificationAsync: async request => { calls.scheduled.push(request); pending.set(request.identifier, request); return request.identifier; },
    getPresentedNotificationsAsync: async () => [],
    dismissNotificationAsync: async id => { calls.dismissed.push(id); },
    getLastNotificationResponseAsync: async () => null,
    clearLastNotificationResponseAsync: async () => { calls.lastCleared++; },
  };
  const service = load('services/routeReminders.ts', {
    'react-native': { Platform: { OS: platform } },
    'expo-notifications': native,
    '@/utils/routeReminder.utils': utils,
  });
  return { ...service, pending, calls, native, setPermission: value => { permission = value; } };
}

test('reminder targets exactly 30 minutes before the first ordered stop', () => {
  const item = route();
  item.stops.unshift({ id: 2, sequence_order: 2, planned_arrival_time: '2026-11-03T11:00:00Z' });
  const reminder = utils.getRouteReminder(item, null, NOW);
  assert.equal(reminder.startAt, Date.parse('2026-11-03T10:00:00Z'));
  assert.equal(reminder.remindAt, Date.parse('2026-11-03T09:30:00Z'));
});

test('tenant-local timestamps are converted independently of the phone timezone', () => {
  assert.equal(utils.routeTimestamp('2026-11-03T10:00:00', 'America/Toronto'), Date.parse('2026-11-03T15:00:00Z'));
  assert.equal(utils.routeTimestamp('2026-11-03T10:00:00.999999', 'America/Toronto'), Date.parse('2026-11-03T15:00:00Z'));
  assert.equal(utils.routeTimestamp('2026-07-03T10:00:00', 'America/Toronto'), Date.parse('2026-07-03T14:00:00Z'));
  assert.equal(utils.routeTimestamp('2026-11-03T10:00:00+05:30', 'America/Toronto'), Date.parse('2026-11-03T04:30:00Z'));
});

test('invalid timestamps and nonexistent daylight-saving times are never guessed', () => {
  for (const value of [undefined, '', '10:00', '2026-11-03', 'invalid']) assert.equal(utils.routeTimestamp(value, 'America/Toronto'), null);
  assert.equal(utils.routeTimestamp('2027-03-14T02:30:00', 'America/Toronto'), null);
  assert.equal(utils.routeTimestamp('2027-03-14T03:30:00', 'America/Toronto'), Date.parse('2027-03-14T07:30:00Z'));
  assert.equal(utils.routeTimestamp('2026-11-03T10:00:00', 'Not/AZone'), null);
});

test('only pending/acknowledged future routes receive reminders; no late 30-minute alerts', () => {
  for (const status of ['in_progress', 'completed', 'cancelled', 'failed']) assert.equal(utils.getRouteReminder(route(42, undefined, status), null, NOW), null);
  for (const time of ['2026-11-03T08:20:00Z', '2026-11-03T08:30:00Z', '2026-11-02T10:00:00Z']) assert.equal(utils.getRouteReminder(route(42, time), null, NOW), null);
  assert.ok(utils.getRouteReminder(route(42, undefined, 'acknowledged'), null, NOW));
});

test('departure time is used when arrival is absent; a date alone is insufficient', () => {
  const item = route();
  item.stops[0].planned_departure_time = item.stops[0].planned_arrival_time;
  delete item.stops[0].planned_arrival_time;
  assert.ok(utils.getRouteReminder(item, null, NOW));
  assert.equal(utils.getRouteReminder({ ...item, scheduled_date: '2026-11-03', stops: [] }, null, NOW), null);
});

test('schedules one native notification per route and does not duplicate after refresh', async () => {
  const s = scheduler();
  await s.syncRouteReminders(7, [route()]);
  await s.syncRouteReminders(7, [route()]);
  assert.equal(s.calls.scheduled.length, 1);
  const request = s.calls.scheduled[0];
  assert.equal(request.trigger.date.getTime(), Date.parse('2026-11-03T09:30:00Z'));
  assert.equal(request.content.body, 'Your route starts in 30 mins.');
  assert.equal(request.content.data.routeId, 42);
  assert.equal(request.content.data.driverId, 7);
});

test('route changes replace the reminder; started, completed, and removed routes cancel it', async () => {
  const s = scheduler();
  await s.syncRouteReminders(7, [route()]);
  const original = [...s.pending.keys()][0];
  await s.syncRouteReminders(7, [route(42, '2026-11-03T12:00:00Z')]);
  assert.ok(s.calls.cancelled.includes(original));
  assert.equal(s.pending.size, 1);
  await s.syncRouteReminders(7, [route(42, undefined, 'in_progress')]);
  assert.equal(s.pending.size, 0);
  await s.syncRouteReminders(7, [route()]);
  await s.syncRouteReminders(7, [route(42, undefined, 'completed')]);
  assert.equal(s.pending.size, 0);
  await s.syncRouteReminders(7, [route()]);
  await s.syncRouteReminders(7, []);
  assert.equal(s.pending.size, 0);
});

test('logout clears only this feature’s notifications, including delivered reminders', async () => {
  const s = scheduler();
  s.pending.set('unrelated', { identifier: 'unrelated', content: { data: {} } });
  await s.syncRouteReminders(7, [route()]);
  const id = [...s.pending.keys()].find(id => id !== 'unrelated');
  s.native.getPresentedNotificationsAsync = async () => [{ request: { identifier: id } }, { request: { identifier: 'other' } }];
  s.native.getLastNotificationResponseAsync = async () => ({ notification: { request: { content: { data: { kind: utils.ROUTE_REMINDER_KIND } } } } });
  await s.syncRouteReminders(null, []);
  assert.deepEqual([...s.pending.keys()], ['unrelated']);
  assert.deepEqual(s.calls.dismissed, [id]);
  assert.equal(s.calls.lastCleared, 1);
});

test('restoration/fetch errors retain the current driver’s existing reminders', async () => {
  const s = scheduler();
  await s.syncRouteReminders(7, [route()]);
  await s.syncRouteReminders(7, undefined);
  assert.equal(s.pending.size, 1);
  await s.syncRouteReminders(8, undefined);
  assert.equal(s.pending.size, 0, 'another driver cannot inherit reminders');
});

test('permission denial prevents scheduling, while provisional iOS permission is respected', async () => {
  const s = scheduler('ios');
  s.setPermission({ granted: false, canAskAgain: false });
  await s.enableRouteReminders();
  await s.syncRouteReminders(7, [route()]);
  assert.equal(s.calls.requested, 0);
  assert.equal(s.pending.size, 0);
  s.setPermission({ granted: false, canAskAgain: true, ios: { status: 3 } });
  await s.enableRouteReminders();
  await s.syncRouteReminders(7, [route()]);
  assert.equal(s.calls.requested, 0);
  assert.equal(s.pending.size, 1);
});

test('permission is requested when permitted and the Android notification channel is configured', async () => {
  const s = scheduler();
  s.setPermission({ granted: false, canAskAgain: true });
  await s.enableRouteReminders();
  assert.equal(s.calls.requested, 1);
  assert.equal(s.calls.channels[0][0], 'route-reminders');
  assert.equal((await s.calls.handler.handleNotification()).shouldShowBanner, true);
});

test('nearest reminders are retained within the native scheduling limit', async () => {
  const s = scheduler();
  const routes = Array.from({ length: 70 }, (_, i) => route(i, new Date(NOW + (i + 1) * 3600000).toISOString())).reverse();
  await s.syncRouteReminders(7, routes);
  assert.equal(s.pending.size, 60);
  assert.equal(s.calls.scheduled[0].content.data.routeId, 0);
  assert.equal(s.calls.scheduled[59].content.data.routeId, 59);
});

test('a queued logout wins over an in-flight schedule', async () => {
  const s = scheduler();
  let release, started;
  const scheduling = new Promise(resolve => { started = resolve; });
  const nativeSchedule = s.native.scheduleNotificationAsync;
  s.native.scheduleNotificationAsync = async request => {
    started();
    await new Promise(resolve => { release = resolve; });
    return nativeSchedule(request);
  };
  const first = s.syncRouteReminders(7, [route()]);
  await scheduling;
  const logout = s.syncRouteReminders(null, []);
  release();
  await Promise.all([first, logout]);
  assert.equal(s.pending.size, 0);
});

test('a native scheduling failure does not poison future syncs', async () => {
  const s = scheduler();
  const schedule = s.native.scheduleNotificationAsync;
  s.native.scheduleNotificationAsync = async () => { throw new Error('Native failure'); };
  await assert.rejects(s.syncRouteReminders(7, [route()]));
  s.native.scheduleNotificationAsync = schedule;
  await s.syncRouteReminders(7, [route()]);
  assert.equal(s.pending.size, 1);
});

test('web does not call native notification APIs', async () => {
  const s = scheduler('web');
  await s.enableRouteReminders();
  await s.syncRouteReminders(7, [route()]);
  assert.equal(s.calls.scheduled.length, 0);
  assert.equal(s.calls.channels.length, 0);
});

function routeStore(get) {
  const auth = { activationCode: 'driver-seven', driverId: 7, setJobTemplate() {} };
  const { useRouteStore } = load('store/route.store.ts', {
    '@/store/auth.store': { useAuthStore: { getState: () => auth } },
    '@/config/apiClient': { apiClient: { get, post: async () => ({ data: {} }) } },
    '@/utils/shuttleRoute.utils': { isStopFinished: () => false },
  });
  return { store: useRouteStore, auth };
}

test('route sync records the driver and tenant timezone; network errors preserve assignments', async () => {
  let offline = false;
  const { store } = routeStore(async () => {
    if (offline) throw new Error('Offline');
    return { data: { routes: [route()], tenant_timezone: 'America/Toronto' } };
  });
  await store.getState().fetchMyRoutes();
  assert.equal(store.getState().routesOwnerId, 7);
  assert.equal(store.getState().tenantTimezone, 'America/Toronto');
  offline = true;
  await store.getState().fetchMyRoutes({ silent: true });
  assert.equal(store.getState().allRoutes.length, 1);
  assert.ok(store.getState().error);
});

test('a response for an old session cannot overwrite the current driver’s routes', async () => {
  let resolve;
  const { store, auth } = routeStore(() => new Promise(done => { resolve = done; }));
  const loading = store.getState().fetchMyRoutes();
  auth.activationCode = 'driver-eight';
  auth.driverId = 8;
  resolve({ data: { routes: [route()] } });
  await loading;
  assert.equal(store.getState().allRoutes.length, 0);
  assert.equal(store.getState().routesOwnerId, null);
});

test('a slower old refresh cannot restore an outdated route schedule', async () => {
  const responses = [];
  const { store } = routeStore(() => new Promise(resolve => responses.push(resolve)));
  const first = store.getState().fetchMyRoutes();
  const second = store.getState().fetchMyRoutes();
  responses[1]({ data: { routes: [route(42, '2026-11-03T12:00:00Z')] } });
  await second;
  responses[0]({ data: { routes: [route()] } });
  await first;
  assert.equal(store.getState().allRoutes[0].stops[0].planned_arrival_time, '2026-11-03T12:00:00Z');
});

test('starting a route updates its status even if the following refresh is offline', async () => {
  const { store } = routeStore(async () => { throw new Error('Offline'); });
  store.setState({ allRoutes: [route()], assignedRoute: route(), routesOwnerId: 7 });
  await store.getState().startRoute(42);
  assert.equal(store.getState().allRoutes[0].assignment_status, 'in_progress');
  assert.equal(store.getState().assignedRoute.assignment_status, 'in_progress');
});

function reminderHook(overrides = {}) {
  const auth = { activationCode: 'driver-seven', driverId: 7, isLoading: false, ...overrides };
  const state = { routesOwnerId: 7, allRoutes: [route()], error: null, tenantTimezone: 'America/Toronto' };
  const calls = { sync: [], refresh: 0, navigations: [], cleared: 0 };
  const events = {};
  let effect;
  state.fetchMyRoutes = async () => { calls.refresh++; };
  const useRouteStore = {
    getState: () => state,
    subscribe: callback => { events.store = callback; return () => { delete events.store; }; },
  };
  const { useRouteReminders: runHook } = load('hooks/useRouteReminders.ts', {
    react: { useEffect: callback => { effect = callback; } },
    'react-native': { Platform: { OS: 'android' }, AppState: {
      addEventListener: (_, callback) => { events.app = callback; return { remove() { delete events.app; } }; },
    } },
    'expo-router': { router: { push: value => calls.navigations.push(value) } },
    'expo-notifications': {
      DEFAULT_ACTION_IDENTIFIER: 'default',
      addNotificationResponseReceivedListener: callback => { events.tap = callback; return { remove() { delete events.tap; } }; },
      getLastNotificationResponseAsync: async () => overrides.lastResponse ?? null,
      clearLastNotificationResponseAsync: async () => { calls.cleared++; },
    },
    '@/store/auth.store': { useAuthStore: selector => selector(auth) },
    '@/store/route.store': { useRouteStore },
    '@/services/routeReminders': {
      enableRouteReminders: async () => {},
      syncRouteReminders: async (...args) => { calls.sync.push(args); },
    },
    '@/utils/routeReminder.utils': utils,
  });
  runHook();
  const cleanup = effect();
  return { calls, state, events, cleanup };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const tap = (owner = 7, id = 42) => ({
  actionIdentifier: 'default', notification: { request: { identifier: `reminder-${owner}-${id}`,
    content: { data: { kind: utils.ROUTE_REMINDER_KIND, routeId: id, driverId: owner } },
  } },
});

test('hydration does not cancel saved reminders; signed-out sessions cancel them', async () => {
  const loading = reminderHook({ isLoading: true });
  await settle();
  assert.equal(loading.calls.sync.length, 0);
  const loggedOut = reminderHook({ activationCode: null, driverId: null });
  await settle();
  assert.equal(loggedOut.calls.sync[0][0], null);
  assert.equal(loggedOut.calls.refresh, 0);
});

test('a cold-start notification tap opens only the matching assigned route once', async () => {
  const hook = reminderHook({ lastResponse: tap() });
  await settle();
  assert.equal(hook.calls.navigations.length, 1);
  assert.equal(hook.calls.navigations[0].pathname, '/(home)/route-detail');
  assert.equal(hook.calls.navigations[0].params.routeId, '42');
  hook.events.tap(tap());
  await settle();
  assert.equal(hook.calls.navigations.length, 1);
  assert.equal(hook.calls.cleared, 1);
  hook.cleanup();
});

test('notification taps for another driver, removed routes, or missing data cannot navigate', async () => {
  const hook = reminderHook();
  await settle();
  hook.events.tap(tap(8));
  hook.events.tap(tap(7, 999));
  hook.events.tap({ actionIdentifier: 'default', notification: { request: { identifier: 'other', content: {} } } });
  await settle();
  assert.equal(hook.calls.navigations.length, 0);
  hook.cleanup();
});

test('foregrounding refreshes routes; unmounting removes all listeners', async () => {
  const hook = reminderHook();
  await settle();
  const before = hook.calls.refresh;
  hook.events.app('active');
  await settle();
  assert.equal(hook.calls.refresh, before + 1);
  hook.cleanup();
  assert.deepEqual(Object.keys(hook.events), []);
});
