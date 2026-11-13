/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real store and route declarations without requiring a native device.
function loadTypeScript(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: name => name in dependencies ? dependencies[name] : require(name),
    console: { error() {}, warn() {} },
    ...globals,
  });
  return exports;
}

const keys = {
  code: 'syncnox_activation_code', name: 'syncnox_driver_name',
  id: 'syncnox_driver_id', template: 'syncnox_job_template',
};

function createSession(storage = new Map(), unreadable = new Set(), verify, sessionStorage) {
  const secureStore = {
    getItemAsync: async key => {
      if (unreadable.has(key)) throw new Error('Storage unavailable');
      return storage.get(key) ?? null;
    },
    setItemAsync: async (key, value) => { storage.set(key, value); },
    deleteItemAsync: async key => { storage.delete(key); },
  };
  const { useAuthStore } = loadTypeScript('store/auth.store.ts', {
    '@/utils/sessionStorage': sessionStorage ?? secureStore,
    '@/config/apiClient': { apiClient: { post: verify ?? (async () => {
      throw new Error('Session restoration must not require the network');
    }) } },
  });
  return useAuthStore;
}

function browserAdapter(storage = new Map()) {
  return loadTypeScript('utils/sessionStorage.web.ts', {}, {
    window: { localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    } },
  });
}

test('browser login, API headers, reload, and logout use the same persistent storage', async () => {
  const storage = new Map();
  const adapter = browserAdapter(storage);
  let intercept;
  let requests = 0;
  const client = {
    interceptors: { request: { use: handler => { intercept = handler; } } },
    post: async () => {
      const config = await intercept({ headers: {} });
      assert.equal(config.headers['activation-code'], '123456789012');
      requests++;
      return { data: { name: 'Web Driver', id: 42, active_job_template: 'worker_shuttle' } };
    },
  };
  loadTypeScript('config/apiClient.ts', {
    axios: { __esModule: true, default: { create: () => client } },
    '@/utils/sessionStorage': adapter,
  }, { process: { env: {} } });
  const auth = createSession(storage, new Set(), client.post, adapter);
  await auth.getState().checkStoredCode();
  auth.getState().setCode('123456789012');
  assert.equal((await auth.getState().login()).success, true);
  assert.equal(requests, 1);
  assert.deepEqual(availableScreens(auth), ['index', '(home)']);

  const reloaded = createSession(storage, new Set(), undefined, browserAdapter(storage));
  await reloaded.getState().checkStoredCode();
  assert.equal(reloaded.getState().driverName, 'Web Driver');
  assert.equal(reloaded.getState().driverId, 42);
  assert.equal(reloaded.getState().jobTemplate, 'worker_shuttle');
  assert.equal(entryDestination(reloaded), '/(home)/(tabs)/home');
  assert.equal((await intercept({ headers: {} })).headers['activation-code'], '123456789012');
  await reloaded.getState().logout();
  assert.equal(storage.size, 0);
  assert.equal((await intercept({ headers: {} })).headers['activation-code'], undefined);
  const restarted = createSession(storage, new Set(), undefined, browserAdapter(storage));
  await restarted.getState().checkStoredCode();
  assert.equal(restarted.getState().activationCode, null);
});

test('invalid browser activation does not leave a saved login', async () => {
  const storage = new Map();
  const auth = createSession(storage, new Set(), async () => { throw new Error('Invalid key'); }, browserAdapter(storage));
  await auth.getState().checkStoredCode();
  auth.getState().setCode('123456789012');
  assert.equal((await auth.getState().login()).success, false);
  assert.equal(storage.has(keys.code), false);
  assert.equal(auth.getState().activationCode, null);
});

test('blocked browser storage finishes hydration and returns an actionable login error', async () => {
  const adapter = loadTypeScript('utils/sessionStorage.web.ts', {}, {
    window: { get localStorage() { throw new Error('Storage blocked'); } },
  });
  let requests = 0;
  const auth = createSession(new Map(), new Set(), async () => { requests++; }, adapter);
  await auth.getState().checkStoredCode();
  assert.equal(auth.getState().isLoading, false);
  auth.getState().setCode('123456789012');
  const result = await auth.getState().login();
  assert.equal(result.success, false);
  assert.match(result.error, /Allow site data/);
  assert.equal(requests, 0);
  assert.equal(auth.getState().activationCode, null);
});

test('full browser storage rejects saving instead of silently losing the session', async () => {
  const adapter = loadTypeScript('utils/sessionStorage.web.ts', {}, {
    window: { localStorage: { setItem() { throw new Error('Quota exceeded'); } } },
  });
  await assert.rejects(adapter.setItemAsync(keys.code, '123456789012'), /Unable to save your login/);
});

test('browser storage can be imported and read during static rendering without a window', async () => {
  const adapter = loadTypeScript('utils/sessionStorage.web.ts', {});
  assert.equal(await adapter.getItemAsync(keys.code), null);
  await adapter.deleteItemAsync(keys.code);
  await assert.rejects(adapter.setItemAsync(keys.code, '123456789012'), /Unable to save your login/);
});

test('native session storage still delegates to SecureStore with the existing keys', async () => {
  const storage = new Map();
  const adapter = loadTypeScript('utils/sessionStorage.ts', {
    'expo-secure-store': {
      getItemAsync: async key => storage.get(key) ?? null,
      setItemAsync: async (key, value) => { storage.set(key, value); },
      deleteItemAsync: async key => { storage.delete(key); },
    },
  });
  await adapter.setItemAsync(keys.code, '123456789012');
  assert.equal(await adapter.getItemAsync(keys.code), '123456789012');
  await adapter.deleteItemAsync(keys.code);
  assert.equal(await adapter.getItemAsync(keys.code), null);
});

function availableScreens(auth) {
  const Component = () => null;
  const Stack = Object.assign(() => null, { Protected: () => null, Screen: () => null });
  const { default: RootLayout } = loadTypeScript('app/_layout.tsx', {
    '../global.css': {},
    'expo-router': { Stack },
    react: { useEffect() {} },
    '@/store/auth.store': { useAuthStore: () => auth.getState() },
    '@/hooks/useRouteReminders': { useRouteReminders() {} },
    '@/components/ui/AlertHost': { __esModule: true, default: Component },
    'react-native': { View: Component, StatusBar: Component, LogBox: { ignoreAllLogs() {} } },
    'react-native-paper': { ActivityIndicator: Component, PaperProvider: Component, MD3DarkTheme: { colors: {} } },
  });
  const names = [];
  function visit(element) {
    if (!element) return;
    if (Array.isArray(element)) return element.forEach(visit);
    if (element.type === Stack.Protected && !element.props.guard) return;
    if (element.type === Stack.Screen) names.push(element.props.name);
    visit(element.props?.children);
  }
  visit(RootLayout());
  return names;
}

test('startup waits for secure storage before exposing either navigation stack', async () => {
  const auth = createSession();
  assert.deepEqual(availableScreens(auth), []);
  await auth.getState().checkStoredCode();
  assert.deepEqual(availableScreens(auth), ['index', 'welcome', 'login']);
});

test('successful login persists the session and makes guest screens unavailable to Back navigation', async () => {
  const storage = new Map();
  const auth = createSession(storage, new Set(), async () => ({ data: {
    name: 'Test Driver', id: 42, active_job_template: 'worker_shuttle',
  } }));
  await auth.getState().checkStoredCode();
  auth.getState().setCode('123456789012');
  assert.equal((await auth.getState().login()).success, true);
  assert.equal(storage.get(keys.code), '123456789012');
  assert.equal(storage.get(keys.id), '42');
  assert.deepEqual(availableScreens(auth), ['index', '(home)']);
});

test('a fresh app instance restores the saved session without a network request', async () => {
  const storage = new Map([
    [keys.code, '123456789012'], [keys.name, 'Test Driver'],
    [keys.id, '42'], [keys.template, 'worker_shuttle'],
  ]);
  const auth = createSession(storage);
  await auth.getState().checkStoredCode();
  assert.equal(auth.getState().activationCode, storage.get(keys.code));
  assert.equal(auth.getState().driverId, 42);
  assert.equal(auth.getState().driverName, 'Test Driver');
  assert.equal(auth.getState().jobTemplate, 'worker_shuttle');
  assert.deepEqual(availableScreens(auth), ['index', '(home)']);
});

test('optional profile read failures do not discard the saved login', async () => {
  const auth = createSession(new Map([[keys.code, '123456789012']]), new Set([keys.name, keys.id, keys.template]));
  await auth.getState().checkStoredCode();
  assert.equal(auth.getState().activationCode, '123456789012');
  assert.equal(auth.getState().driverId, null);
  assert.deepEqual(availableScreens(auth), ['index', '(home)']);
});

test('logout clears the saved session, typed key, and access to signed-in screens across restarts', async () => {
  const storage = new Map(Object.values(keys).map(key => [key, '42']));
  const auth = createSession(storage);
  await auth.getState().checkStoredCode();
  auth.getState().setCode('123456789012');
  await auth.getState().logout();
  assert.equal(storage.size, 0);
  assert.equal(auth.getState().code, '');
  assert.equal(auth.getState().activationCode, null);
  assert.deepEqual(availableScreens(auth), ['index', 'welcome', 'login']);
  const restarted = createSession(storage);
  await restarted.getState().checkStoredCode();
  assert.deepEqual(availableScreens(restarted), ['index', 'welcome', 'login']);
});

test('unreadable credentials finish loading without exposing signed-in screens', async () => {
  const auth = createSession(new Map(), new Set([keys.code]));
  await auth.getState().checkStoredCode();
  assert.equal(auth.getState().isLoading, false);
  assert.deepEqual(availableScreens(auth), ['index', 'welcome', 'login']);
});

test('an invalid activation key does not leave a saved session', async () => {
  const storage = new Map();
  const auth = createSession(storage, new Set(), async () => { throw new Error('Invalid key'); });
  await auth.getState().checkStoredCode();
  auth.getState().setCode('123456789012');
  assert.equal((await auth.getState().login()).success, false);
  assert.equal(storage.has(keys.code), false);
  assert.deepEqual(availableScreens(auth), ['index', 'welcome', 'login']);
});

test('an invalid saved driver ID cannot become a malformed identity', async () => {
  const auth = createSession(new Map([[keys.code, '123456789012'], [keys.id, '42-invalid']]));
  await auth.getState().checkStoredCode();
  assert.equal(auth.getState().driverId, null);
  assert.deepEqual(availableScreens(auth), ['index', '(home)']);
});

function entryDestination(auth) {
  const Redirect = () => null;
  const { default: AppEntry } = loadTypeScript('app/index.tsx', {
    'expo-router': { Redirect },
    '@/store/auth.store': { useAuthStore: () => auth.getState() },
  });
  return AppEntry()?.props.href ?? null;
}

test('the root URL remains registered and redirects saved sessions to the Routes tab', async () => {
  const auth = createSession(new Map([[keys.code, '123456789012']]));
  assert.equal(entryDestination(auth), null, 'wait for hydration before redirecting');
  await auth.getState().checkStoredCode();
  assert.ok(availableScreens(auth).includes('index'));
  assert.equal(entryDestination(auth), '/(home)/(tabs)/home');
  assert.ok(!availableScreens(auth).includes('welcome'));
  assert.ok(!availableScreens(auth).includes('login'));
});

test('the root URL sends signed-out sessions to Welcome and remains valid after logout', async () => {
  const auth = createSession(new Map([[keys.code, '123456789012']]));
  await auth.getState().checkStoredCode();
  await auth.getState().logout();
  assert.ok(availableScreens(auth).includes('index'));
  assert.equal(entryDestination(auth), '/welcome');
  assert.ok(!availableScreens(auth).includes('(home)'));
});

test('Expo resolves syncnoxdriverapp:/// and its destination for signed-in and signed-out sessions', async () => {
  const { getRoutes } = require('expo-router/build/getRoutes');
  const { getReactNavigationConfig } = require('expo-router/build/getReactNavigationConfig');
  const { getStateFromPath } = require('expo-router/build/fork/getStateFromPath');
  const appDirectory = path.join(__dirname, '..', 'app');
  const files = fs.readdirSync(appDirectory, { recursive: true }).filter(file => /\.[jt]sx?$/.test(file));
  const context = () => ({ default: () => null });
  context.keys = () => files.map(file => `./${file}`);

  function focusedName(state) {
    if (!state) return null;
    const route = state.routes[state.index ?? state.routes.length - 1];
    return route.state ? focusedName(route.state) : route.name;
  }

  for (const code of [null, '123456789012']) {
    const auth = createSession(new Map(code ? [[keys.code, code]] : []));
    await auth.getState().checkStoredCode();
    const tree = getRoutes(context, { platform: 'android', importMode: 'sync' });
    const available = availableScreens(auth);
    tree.children = tree.children.filter(route => route.generated || available.includes(route.route));
    const config = getReactNavigationConfig(tree, true);
    const rootPath = new URL('syncnoxdriverapp:///').pathname;
    assert.equal(focusedName(getStateFromPath(rootPath, config)), 'index');
    assert.equal(focusedName(getStateFromPath(entryDestination(auth), config)), code ? 'home' : 'welcome');
  }
});
