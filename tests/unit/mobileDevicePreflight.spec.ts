import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const script = path.resolve(process.cwd(), 'scripts/mobile-device-preflight.mjs');
const fixedEnvironment = {
  ...process.env,
  JTYPE_PREFLIGHT_TEST_MODE: '1',
  JTYPE_PREFLIGHT_NOW: '2026-07-19T00:00:00.000Z',
  JTYPE_PREFLIGHT_SIMCTL_JSON: JSON.stringify({
    devices: {
      'iOS-26-5': [{ name: 'iPhone 17 Pro', udid: 'SIMULATOR-UDID', state: 'Booted' }],
    },
  }),
};

function runJson(extraEnvironment: Record<string, string>) {
  return JSON.parse(execFileSync(process.execPath, [script, '--format', 'json', '--allow-blocked'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...fixedEnvironment, ...extraEnvironment },
  }));
}

test('does not count Emulator or Simulator entries as physical devices', () => {
  const report = runJson({
    JTYPE_PREFLIGHT_ADB_OUTPUT: 'List of devices attached\nemulator-5554 device product:sdk_gphone64_arm64\n',
    JTYPE_PREFLIGHT_IOS_DEVICES_JSON: JSON.stringify({ result: { devices: [] } }),
    JTYPE_PREFLIGHT_CODESIGN_OUTPUT: '0 valid identities found',
    JTYPE_PREFLIGHT_XCODE_SETTINGS: 'PRODUCT_BUNDLE_IDENTIFIER = net.jcode.jtype',
  });

  expect(report.overall).toBe('blocked');
  expect(report.android.physicalDeviceCount).toBe(0);
  expect(report.android.ignoredEmulatorCount).toBe(1);
  expect(report.ios.availablePhysicalIphoneCount).toBe(0);
  expect(report.ios.ignoredBootedSimulatorCount).toBe(1);
});

test('returns nonzero by default when a required physical gate is blocked', () => {
  const result = spawnSync(process.execPath, [script, '--format', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...fixedEnvironment,
      JTYPE_PREFLIGHT_ADB_OUTPUT: 'List of devices attached\n',
      JTYPE_PREFLIGHT_IOS_DEVICES_JSON: JSON.stringify({ result: { devices: [] } }),
      JTYPE_PREFLIGHT_CODESIGN_OUTPUT: '0 valid identities found',
      JTYPE_PREFLIGHT_XCODE_SETTINGS: '',
    },
  });

  expect(result.status).toBe(2);
  expect(JSON.parse(result.stdout).overall).toBe('blocked');
});

test('accepts pnpm argument separators and excludes unrequested platforms from the gate', () => {
  const result = spawnSync(process.execPath, [script, '--', '--platform', 'android', '--format', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...fixedEnvironment,
      JTYPE_PREFLIGHT_ADB_OUTPUT: 'List of devices attached\nANDROID-PHYSICAL-1234 device\n',
      JTYPE_PREFLIGHT_ANDROID_DETAILS_JSON: JSON.stringify({ sdk: 36, abis: ['arm64-v8a'] }),
      JTYPE_PREFLIGHT_IOS_DEVICES_JSON: JSON.stringify({ result: { devices: [] } }),
      JTYPE_PREFLIGHT_CODESIGN_OUTPUT: '0 valid identities found',
      JTYPE_PREFLIGHT_XCODE_SETTINGS: '',
    },
  });

  const report = JSON.parse(result.stdout);
  expect(result.status).toBe(0);
  expect(report.overall).toBe('ready');
  expect(report.android.required).toBe(true);
  expect(report.ios.required).toBe(false);
});

test('accepts supported authorized physical devices and redacts their identifiers', () => {
  const report = runJson({
    JTYPE_PREFLIGHT_ADB_OUTPUT: 'List of devices attached\nANDROID-PHYSICAL-1234 device product:pixel\n',
    JTYPE_PREFLIGHT_ANDROID_DETAILS_JSON: JSON.stringify({
      manufacturer: 'Google', model: 'Pixel', sdk: 36,
      abis: ['arm64-v8a', 'armeabi-v7a'], appInstalled: true,
    }),
    JTYPE_PREFLIGHT_IOS_DEVICES_JSON: JSON.stringify({
      result: {
        devices: [{
          identifier: 'COREDEVICE-PHYSICAL-5678',
          deviceProperties: { name: 'Test iPhone' },
          hardwareProperties: { productType: 'iPhone99,1', udid: 'IOS-PHYSICAL-5678' },
        }],
      },
    }),
    JTYPE_PREFLIGHT_IOS_DETAILS_JSON: JSON.stringify({
      result: { deviceProperties: { developerModeStatus: 'enabled', osVersionNumber: '26.5' } },
    }),
    JTYPE_PREFLIGHT_CODESIGN_OUTPUT: '1) ABCDEF "Apple Development: Test User (TEAMID1234)"',
    JTYPE_PREFLIGHT_XCODE_SETTINGS: 'DEVELOPMENT_TEAM = TEAMID1234',
  });

  expect(report.overall).toBe('ready');
  expect(report.android.selected.tauriTarget).toBe('aarch64');
  expect(report.android.selected.identifier).not.toContain('ANDROID-PHYSICAL-1234');
  expect(report.ios.selected.developerMode).toBe('enabled');
  expect(report.ios.selected.identifier).not.toContain('IOS-PHYSICAL-5678');
});

test('keeps iPhone readiness blocked without signing prerequisites', () => {
  const report = runJson({
    JTYPE_PREFLIGHT_ADB_OUTPUT: 'List of devices attached\nANDROID-PHYSICAL-1234 device\n',
    JTYPE_PREFLIGHT_ANDROID_DETAILS_JSON: JSON.stringify({ sdk: 36, abis: ['arm64-v8a'] }),
    JTYPE_PREFLIGHT_IOS_DEVICES_JSON: JSON.stringify({
      result: { devices: [{ identifier: 'CORE-1', deviceProperties: { name: 'iPhone' }, hardwareProperties: { productType: 'iPhone99,1' } }] },
    }),
    JTYPE_PREFLIGHT_IOS_DETAILS_JSON: JSON.stringify({ result: { developerModeStatus: 'enabled' } }),
    JTYPE_PREFLIGHT_CODESIGN_OUTPUT: '0 valid identities found',
    JTYPE_PREFLIGHT_XCODE_SETTINGS: '',
  });

  expect(report.ios.ready).toBe(false);
  expect(report.ios.blockers).toContain('No valid Apple Development code-signing identity is installed.');
  expect(report.ios.blockers.some((blocker: string) => blocker.includes('DEVELOPMENT_TEAM'))).toBe(true);
});
