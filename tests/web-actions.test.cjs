/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in dependencies ? dependencies[name] : require(name) });
  return exports;
}

function browserAlerts() {
  return load('utils/alert.web.ts', {});
}

test('web dialogs support multiple choices and run only the selected callback once', () => {
  const { Alert, useAlertStore, finishAlert } = browserAlerts();
  const selected = [];
  Alert.alert('Distance Unit', 'Choose a unit', [
    { text: 'Miles', onPress: () => selected.push('miles') },
    { text: 'Kilometers', onPress: () => selected.push('km') },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const alert = useAlertStore.getState().alerts[0];
  assert.equal(alert.buttons.length, 3);
  assert.equal(selected.length, 0);
  finishAlert(alert.id, 1);
  finishAlert(alert.id, 1);
  assert.deepEqual(selected, ['km']);
  assert.equal(useAlertStore.getState().alerts.length, 0);
});

test('dismissal honors cancelable and allows another confirmation to open', () => {
  const { Alert, useAlertStore, finishAlert } = browserAlerts();
  let dismissed = 0;
  Alert.alert('Start route?', '', [{ text: 'Confirm' }], { cancelable: true, onDismiss: () => dismissed++ });
  finishAlert(useAlertStore.getState().alerts[0].id);
  assert.equal(dismissed, 1);
  Alert.alert('Required notice');
  const notice = useAlertStore.getState().alerts[0];
  finishAlert(notice.id);
  assert.equal(useAlertStore.getState().alerts.length, 1);
  finishAlert(notice.id, 0);
  assert.equal(useAlertStore.getState().alerts.length, 0);
});

test('alerts opened by callbacks remain queued and actionable', () => {
  const { Alert, useAlertStore, finishAlert } = browserAlerts();
  Alert.alert('Confirm', '', [{ text: 'Continue', onPress: () => Alert.alert('Error', 'Try again') }]);
  finishAlert(useAlertStore.getState().alerts[0].id, 0);
  assert.equal(useAlertStore.getState().alerts[0].title, 'Error');
  Alert.alert('Next notice');
  finishAlert(useAlertStore.getState().alerts[0].id, 0);
  assert.equal(useAlertStore.getState().alerts[0].title, 'Next notice');
});

test('native alerts delegate to the original React Native implementation', () => {
  const native = { alert() {} };
  assert.equal(load('utils/alert.ts', { 'react-native': { Alert: native } }).Alert, native);
});

test('starting a route supports cancel, escape, failed-request retry, and duplicate-tap protection', async () => {
  const alerts = browserAlerts();
  let requests = 0;
  let fail = true;
  let resolve;
  const { useStartRoute } = load('hooks/useStartRoute.ts', {
    react: { useRef: value => ({ current: value }), useState: value => [value, () => {}] },
    '@/utils/alert': alerts,
    '@/store/route.store': { useRouteStore: selector => selector({ startRoute: async () => {
      requests++;
      if (fail) throw new Error('offline');
      await new Promise(done => { resolve = done; });
    } }) },
  });
  const { requestStart } = useStartRoute();
  const route = { route_id: 42, assignment_status: 'pending', name: 'Test route' };
  const current = () => alerts.useAlertStore.getState().alerts[0];
  requestStart(route);
  requestStart(route);
  assert.equal(alerts.useAlertStore.getState().alerts.length, 1);
  assert.equal(requests, 0);
  alerts.finishAlert(current().id, 0);
  requestStart(route);
  alerts.finishAlert(current().id);
  requestStart(route);
  alerts.finishAlert(current().id, 1);
  await new Promise(done => setImmediate(done));
  assert.equal(requests, 1);
  assert.equal(current().title, 'Error');
  alerts.finishAlert(current().id, 0);
  fail = false;
  requestStart(route);
  alerts.finishAlert(current().id, 1);
  requestStart(route);
  assert.equal(requests, 2);
  assert.equal(current(), undefined);
  resolve();
  await new Promise(done => setImmediate(done));
});

test('navigation uses browser links for every provider and accepts zero coordinates and addresses', async () => {
  const urls = [];
  let app = 'google';
  const { getNavigationUrl, openNavigation } = load('utils/navigation.ts', {
    'react-native': { Platform: { OS: 'web' }, Linking: { openURL: async url => urls.push(url) } },
    '@/store/preferences.store': { usePreferencesStore: { getState: () => ({ navigationApp: app }) } },
    '@/utils/alert': browserAlerts(),
  });
  for (app of ['google', 'waze', 'apple']) {
    await openNavigation({ lat: 0, lng: 0 });
    const url = new URL(urls.at(-1));
    assert.equal(url.protocol, 'https:');
    assert.ok([...url.searchParams.values()].includes('0,0'));
  }
  const addressUrl = new URL(getNavigationUrl({ address: '12 Main St & 2nd' }, 'google', 'web'));
  assert.equal(addressUrl.searchParams.get('destination'), '12 Main St & 2nd');
  assert.equal(getNavigationUrl({}, 'google', 'web'), null);
  assert.match(getNavigationUrl({ lat: 1, lng: 2 }, 'google', 'android'), /^google.navigation:/);
});

test('navigation preferences survive reload and remain usable when storage is blocked', async () => {
  const saved = new Map();
  const storage = {
    getItemAsync: async key => saved.get(key) ?? null,
    setItemAsync: async (key, value) => { saved.set(key, value); },
    deleteItemAsync: async key => { saved.delete(key); },
  };
  const preferences = () => load('store/preferences.store.ts', { '@/utils/sessionStorage': storage }).usePreferencesStore;
  const first = preferences();
  await first.persist.rehydrate();
  first.getState().setNavigationApp('waze');
  const reloaded = preferences();
  await reloaded.persist.rehydrate();
  assert.equal(reloaded.getState().navigationApp, 'waze');
  storage.setItemAsync = async () => { throw new Error('Storage blocked'); };
  reloaded.getState().setNavigationApp('apple');
  await new Promise(done => setImmediate(done));
  assert.equal(reloaded.getState().navigationApp, 'apple');
});
