/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function resolveConfig(env = {}, config = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'app.config.js'), 'utf8'), {
    module, process: { env },
  });
  return module.exports({ config });
}

test('the tracked static Expo config contains no Google API key', () => {
  const contents = fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8');
  assert.doesNotMatch(contents, /AIza[0-9A-Za-z_-]+/);
  assert.equal(JSON.parse(contents).expo.android.config?.googleMaps?.apiKey, undefined);
});

test('Android Maps gets its build-time key from the environment without changing the input config', () => {
  const config = { android: { package: 'test.driver', config: { googleMaps: { otherSetting: true } } }, extra: { router: {} } };
  const resolved = resolveConfig({ GOOGLE_MAPS_ANDROID_API_KEY: ' test-android-maps-key ' }, config);
  assert.equal(resolved.android.config.googleMaps.apiKey, 'test-android-maps-key');
  assert.equal(resolved.android.package, 'test.driver');
  assert.equal(resolved.android.config.googleMaps.otherSetting, true);
  assert.equal(config.android.config.googleMaps.apiKey, undefined);
  assert.equal(JSON.stringify(resolved.extra).includes('test-android-maps-key'), false);
});

test('web and iOS configuration works without an Android Maps key', () => {
  for (const env of [{}, { EAS_BUILD_PLATFORM: 'ios' }]) {
    const config = { android: { package: 'test.driver' }, web: { output: 'static' } };
    const resolved = resolveConfig(env, config);
    assert.equal(resolved.android.config, undefined);
    assert.equal(resolved.web.output, 'static');
  }
});

test('Android cloud builds require a nonempty key instead of shipping broken maps', () => {
  assert.throws(() => resolveConfig({ EAS_BUILD_PLATFORM: 'android' }), /Set GOOGLE_MAPS_ANDROID_API_KEY/);
  assert.throws(() => resolveConfig({ EAS_BUILD_PLATFORM: 'android', GOOGLE_MAPS_ANDROID_API_KEY: ' ' }), /Set GOOGLE_MAPS_ANDROID_API_KEY/);
  const config = resolveConfig({ EAS_BUILD_PLATFORM: 'android', GOOGLE_MAPS_ANDROID_API_KEY: 'test-android-maps-key' });
  assert.equal(config.android.config.googleMaps.apiKey, 'test-android-maps-key');
});
