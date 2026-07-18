#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ID = 'net.jcode.jtype';
const MIN_ANDROID_SDK = 24;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureMode = process.env.JTYPE_PREFLIGHT_TEST_MODE === '1';

function usage() {
  return `Usage: node scripts/mobile-device-preflight.mjs [options]

Options:
  --platform <all|android|ios>  Platforms required for a passing gate (default: all)
  --format <markdown|json>     Output format (default: markdown)
  --output <path>              Also write the rendered report to this file
  --allow-blocked              Return zero after reporting missing prerequisites
  --help                       Show this help

Selection environment:
  JTYPE_ANDROID_SERIAL         Exact physical Android adb serial to use
  JTYPE_IOS_UDID               Exact physical iPhone CoreDevice identifier/UDID to use
  JTYPE_IOS_DEVELOPMENT_TEAM   Apple development team used for physical signing
`;
}

function parseArgs(argv) {
  const options = {
    platform: 'all',
    format: 'markdown',
    output: null,
    allowBlocked: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      continue;
    } else if (argument === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    } else if (argument === '--allow-blocked') {
      options.allowBlocked = true;
    } else if (argument === '--platform' || argument === '--format' || argument === '--output') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === '--platform') options.platform = value;
      if (argument === '--format') options.format = value;
      if (argument === '--output') options.output = resolve(value);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!['all', 'android', 'ios'].includes(options.platform)) {
    throw new Error(`Unsupported platform: ${options.platform}`);
  }
  if (!['markdown', 'json'].includes(options.format)) {
    throw new Error(`Unsupported format: ${options.format}`);
  }
  return options;
}

function run(executable, args, options = {}) {
  return spawnSync(executable, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

function fixture(name) {
  if (!fixtureMode) return null;
  return Object.hasOwn(process.env, name) ? process.env[name] : null;
}

function parseJson(text, fallback = {}) {
  if (!text?.trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function firstNestedValue(value, keys) {
  if (!value || typeof value !== 'object') return null;
  for (const key of keys) {
    if (Object.hasOwn(value, key) && value[key] !== null && value[key] !== '') {
      return value[key];
    }
  }
  for (const child of Object.values(value)) {
    const found = firstNestedValue(child, keys);
    if (found !== null) return found;
  }
  return null;
}

function redactIdentifier(identifier) {
  if (!identifier) return null;
  const value = String(identifier);
  if (value.length <= 8) return 'redacted';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function parseAdbDevices(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('List of devices attached'))
    .map((line) => {
      const [serial, state, ...metadata] = line.split(/\s+/);
      return { serial, state, metadata: metadata.join(' ') };
    });
}

function resolveAdb() {
  if (fixtureMode) return 'fixture-adb';
  const candidates = [];
  if (process.env.JTYPE_ADB_BIN) candidates.push(process.env.JTYPE_ADB_BIN);
  if (process.env.ANDROID_SDK_ROOT) {
    candidates.push(join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb'));
  }
  if (process.env.ANDROID_HOME) {
    candidates.push(join(process.env.ANDROID_HOME, 'platform-tools', 'adb'));
  }

  const propertiesPath = join(repoRoot, 'src-tauri', 'gen', 'android', 'local.properties');
  if (existsSync(propertiesPath)) {
    const match = readFileSync(propertiesPath, 'utf8').match(/^sdk\.dir=(.+)$/m);
    if (match) candidates.push(join(match[1].trim(), 'platform-tools', 'adb'));
  }
  candidates.push('/opt/homebrew/bin/adb', '/usr/local/bin/adb');

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function supportedAndroidTarget(abis) {
  const mappings = [
    ['arm64-v8a', 'aarch64'],
    ['armeabi-v7a', 'armv7'],
    ['x86_64', 'x86_64'],
    ['x86', 'i686'],
  ];
  return mappings.find(([abi]) => abis.includes(abi)) ?? null;
}

function collectAndroid(required) {
  const blockers = [];
  const adb = resolveAdb();
  const injectedOutput = fixture('JTYPE_PREFLIGHT_ADB_OUTPUT');
  let output = injectedOutput ?? '';

  if (!adb) {
    blockers.push('Android platform-tools adb was not found.');
  } else if (injectedOutput === null) {
    const result = run(adb, ['devices', '-l']);
    if (result.status !== 0) {
      blockers.push(`adb devices failed: ${(result.stderr || result.stdout).trim()}`);
    } else {
      output = result.stdout;
    }
  }

  const devices = parseAdbDevices(output);
  const emulators = devices.filter((device) => device.serial.startsWith('emulator-'));
  const physical = devices.filter((device) => !device.serial.startsWith('emulator-'));
  const requestedSerial = process.env.JTYPE_ANDROID_SERIAL;
  const selected = requestedSerial
    ? physical.find((device) => device.serial === requestedSerial)
    : physical.find((device) => device.state === 'device');

  if (requestedSerial && !selected) {
    blockers.push('JTYPE_ANDROID_SERIAL does not match an attached physical Android device.');
  } else if (!selected) {
    const unavailable = physical.filter((device) => device.state !== 'device');
    if (unavailable.length > 0) {
      blockers.push(`Physical Android device is present but not authorized/online (${unavailable.map((device) => device.state).join(', ')}).`);
    } else {
      blockers.push('No physical Android device is attached; Emulator entries do not satisfy this gate.');
    }
  }

  let selectedDetails = null;
  if (selected?.state === 'device') {
    const injectedDetails = fixture('JTYPE_PREFLIGHT_ANDROID_DETAILS_JSON');
    let details;
    if (injectedDetails !== null) {
      details = parseJson(injectedDetails);
    } else {
      const get = (property) => run(adb, ['-s', selected.serial, 'shell', 'getprop', property]).stdout.trim();
      const installed = run(adb, ['-s', selected.serial, 'shell', 'pm', 'path', APP_ID]);
      details = {
        manufacturer: get('ro.product.manufacturer'),
        model: get('ro.product.model'),
        sdk: Number.parseInt(get('ro.build.version.sdk'), 10),
        abis: get('ro.product.cpu.abilist').split(',').filter(Boolean),
        appInstalled: installed.status === 0 && installed.stdout.includes('package:'),
      };
    }

    const sdk = Number(details.sdk);
    const abis = Array.isArray(details.abis) ? details.abis : String(details.abis ?? '').split(',').filter(Boolean);
    const target = supportedAndroidTarget(abis);
    if (!Number.isFinite(sdk) || sdk < MIN_ANDROID_SDK) {
      blockers.push(`Physical Android API ${Number.isFinite(sdk) ? sdk : 'unknown'} is below JType minSdk ${MIN_ANDROID_SDK}.`);
    }
    if (!target) blockers.push(`Physical Android ABI is unsupported (${abis.join(', ') || 'unknown'}).`);
    selectedDetails = {
      identifier: redactIdentifier(selected.serial),
      state: selected.state,
      manufacturer: details.manufacturer || null,
      model: details.model || null,
      sdk: Number.isFinite(sdk) ? sdk : null,
      abis,
      tauriTarget: target?.[1] ?? null,
      appInstalled: Boolean(details.appInstalled),
    };
  }

  return {
    required,
    ready: !required || blockers.length === 0,
    physicalDeviceCount: physical.length,
    ignoredEmulatorCount: emulators.length,
    selected: selectedDetails,
    blockers: required ? blockers : [],
  };
}

function readIosDeviceList() {
  const injected = fixture('JTYPE_PREFLIGHT_IOS_DEVICES_JSON');
  if (injected !== null) return parseJson(injected, { result: { devices: [] } });
  if (process.platform !== 'darwin') return { result: { devices: [] }, error: 'iOS device discovery requires macOS.' };

  const probeDirectory = mkdtempSync(join(tmpdir(), 'jtype-ios-preflight-'));
  const outputPath = join(probeDirectory, 'devices.json');
  try {
    const result = run('xcrun', [
      'devicectl', 'list', 'devices',
      '--filter', "State == 'available'",
      '--quiet',
      '--json-output', outputPath,
    ]);
    if (result.status !== 0 || !existsSync(outputPath)) {
      return { result: { devices: [] }, error: (result.stderr || result.stdout).trim() || 'devicectl failed.' };
    }
    return parseJson(readFileSync(outputPath, 'utf8'), { result: { devices: [] } });
  } finally {
    rmSync(probeDirectory, { recursive: true, force: true });
  }
}

function readIosDetails(identifier) {
  const injected = fixture('JTYPE_PREFLIGHT_IOS_DETAILS_JSON');
  if (injected !== null) return parseJson(injected);
  const probeDirectory = mkdtempSync(join(tmpdir(), 'jtype-ios-details-'));
  const outputPath = join(probeDirectory, 'details.json');
  try {
    const result = run('xcrun', [
      'devicectl', 'device', 'info', 'details',
      '--device', identifier,
      '--quiet',
      '--json-output', outputPath,
    ]);
    if (result.status !== 0 || !existsSync(outputPath)) return {};
    return parseJson(readFileSync(outputPath, 'utf8'));
  } finally {
    rmSync(probeDirectory, { recursive: true, force: true });
  }
}

function readBootedSimulatorCount() {
  const injected = fixture('JTYPE_PREFLIGHT_SIMCTL_JSON');
  let parsed;
  if (injected !== null) {
    parsed = parseJson(injected, { devices: {} });
  } else if (process.platform === 'darwin') {
    const result = run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
    parsed = result.status === 0 ? parseJson(result.stdout, { devices: {} }) : { devices: {} };
  } else {
    parsed = { devices: {} };
  }
  return Object.values(parsed.devices ?? {}).flat().filter((device) => device.state === 'Booted').length;
}

function readSigningState() {
  const injectedIdentities = fixture('JTYPE_PREFLIGHT_CODESIGN_OUTPUT');
  const identityOutput = injectedIdentities !== null
    ? injectedIdentities
    : run('security', ['find-identity', '-v', '-p', 'codesigning']).stdout;
  const identityCount = identityOutput
    .split(/\r?\n/)
    .filter((line) => /"(?:Apple Development|iPhone Developer):?/.test(line)).length;

  const injectedSettings = fixture('JTYPE_PREFLIGHT_XCODE_SETTINGS');
  const settingsOutput = injectedSettings !== null
    ? injectedSettings
    : run('xcodebuild', [
        '-showBuildSettings',
        '-project', join(repoRoot, 'src-tauri', 'gen', 'apple', 'jtype.xcodeproj'),
        '-scheme', 'jtype_iOS',
        '-configuration', 'Debug',
      ]).stdout;
  const settingsTeam = settingsOutput.match(/^\s*DEVELOPMENT_TEAM\s*=\s*(\S+)\s*$/m)?.[1] ?? null;
  const developmentTeam = process.env.JTYPE_IOS_DEVELOPMENT_TEAM || settingsTeam;
  return {
    identityCount,
    developmentTeamConfigured: Boolean(developmentTeam),
    developmentTeam: developmentTeam ? redactIdentifier(developmentTeam) : null,
  };
}

function iosDeviceSummary(device) {
  const identifier = device.identifier
    || firstNestedValue(device, ['udid', 'identifier', 'coreDeviceIdentifier']);
  const name = firstNestedValue(device, ['name']);
  const productType = firstNestedValue(device, ['productType', 'modelCode']);
  return { raw: device, identifier, name, productType };
}

function collectIos(required) {
  const blockers = [];
  const list = readIosDeviceList();
  if (list.error) blockers.push(list.error);
  const available = (list.result?.devices ?? []).map(iosDeviceSummary);
  const iPhones = available.filter((device) =>
    String(device.productType ?? '').startsWith('iPhone') || /iPhone/i.test(String(device.name ?? '')),
  );
  const requestedIdentifier = process.env.JTYPE_IOS_UDID;
  const selected = requestedIdentifier
    ? iPhones.find((device) => device.identifier === requestedIdentifier
      || firstNestedValue(device.raw, ['udid']) === requestedIdentifier)
    : iPhones[0];

  if (requestedIdentifier && !selected) {
    blockers.push('JTYPE_IOS_UDID does not match an available physical iPhone.');
  } else if (!selected) {
    blockers.push('No available paired physical iPhone is attached; Simulator entries do not satisfy this gate.');
  }

  const signing = readSigningState();
  if (signing.identityCount === 0) blockers.push('No valid Apple Development code-signing identity is installed.');
  if (!signing.developmentTeamConfigured) {
    blockers.push('No iOS DEVELOPMENT_TEAM is configured; set JTYPE_IOS_DEVELOPMENT_TEAM for the physical build.');
  }

  let selectedDetails = null;
  if (selected?.identifier) {
    const details = readIosDetails(selected.identifier);
    const developerMode = firstNestedValue(details, ['developerModeStatus']);
    if (String(developerMode).toLowerCase() !== 'enabled') {
      blockers.push(`Physical iPhone Developer Mode is ${developerMode ?? 'unknown'}, expected enabled.`);
    }
    selectedDetails = {
      identifier: redactIdentifier(firstNestedValue(selected.raw, ['udid']) || selected.identifier),
      name: selected.name || firstNestedValue(details, ['name']),
      productType: selected.productType || firstNestedValue(details, ['productType']),
      osVersion: firstNestedValue(details, ['osVersionNumber', 'osVersion']),
      developerMode: developerMode ?? null,
    };
  }

  return {
    required,
    ready: !required || blockers.length === 0,
    availablePhysicalIphoneCount: iPhones.length,
    ignoredBootedSimulatorCount: readBootedSimulatorCount(),
    selected: selectedDetails,
    signing,
    blockers: required ? blockers : [],
  };
}

function nextActions(report) {
  const actions = [];
  for (const blocker of [...report.android.blockers, ...report.ios.blockers]) {
    if (blocker.includes('No physical Android')) actions.push('Connect and unlock an Android device, then enable and authorize USB debugging.');
    else if (blocker.includes('not authorized/online')) actions.push('Accept the Android USB-debugging authorization prompt and wait for adb state `device`.');
    else if (blocker.includes('No available paired physical iPhone')) actions.push('Connect and trust an iPhone, enable Developer Mode, and wait for CoreDevice state `available (paired)`.');
    else if (blocker.includes('code-signing identity')) actions.push('Add the Apple developer account in Xcode Settings > Accounts and create/download an Apple Development certificate.');
    else if (blocker.includes('DEVELOPMENT_TEAM')) actions.push('Export JTYPE_IOS_DEVELOPMENT_TEAM with the Apple team ID used by JType and its Share Extension.');
    else if (blocker.includes('Developer Mode')) actions.push('Enable Developer Mode on the selected iPhone and restart it when iOS requests.');
    else actions.push(blocker);
  }
  return [...new Set(actions)];
}

function renderMarkdown(report) {
  const line = (gate) => gate.required ? (gate.ready ? 'READY' : 'BLOCKED') : 'NOT REQUIRED';
  const output = [
    '# JType physical-device preflight',
    '',
    `Generated: ${report.generatedAt}`,
    `Required platform: ${report.platform}`,
    `Overall: **${report.overall.toUpperCase()}**`,
    '',
    '## Android',
    '',
    `- Gate: **${line(report.android)}**`,
    `- Attached physical devices: ${report.android.physicalDeviceCount}`,
    `- Ignored Emulator devices: ${report.android.ignoredEmulatorCount}`,
  ];
  if (report.android.selected) {
    output.push(
      `- Selected: ${report.android.selected.manufacturer ?? ''} ${report.android.selected.model ?? ''} (${report.android.selected.identifier})`.trim(),
      `- API / ABI / Tauri target: ${report.android.selected.sdk ?? 'unknown'} / ${report.android.selected.abis.join(', ') || 'unknown'} / ${report.android.selected.tauriTarget ?? 'unsupported'}`,
      `- JType currently installed: ${report.android.selected.appInstalled ? 'yes' : 'no'}`,
    );
  }
  for (const blocker of report.android.blockers) output.push(`- Blocker: ${blocker}`);

  output.push(
    '',
    '## iOS',
    '',
    `- Gate: **${line(report.ios)}**`,
    `- Available physical iPhones: ${report.ios.availablePhysicalIphoneCount}`,
    `- Ignored booted Simulators: ${report.ios.ignoredBootedSimulatorCount}`,
    `- Apple Development identities: ${report.ios.signing.identityCount}`,
    `- Development team configured: ${report.ios.signing.developmentTeamConfigured ? `yes (${report.ios.signing.developmentTeam})` : 'no'}`,
  );
  if (report.ios.selected) {
    output.push(
      `- Selected: ${report.ios.selected.name ?? 'iPhone'} / ${report.ios.selected.productType ?? 'unknown'} (${report.ios.selected.identifier})`,
      `- iOS / Developer Mode: ${report.ios.selected.osVersion ?? 'unknown'} / ${report.ios.selected.developerMode ?? 'unknown'}`,
    );
  }
  for (const blocker of report.ios.blockers) output.push(`- Blocker: ${blocker}`);

  output.push('', '## Required next actions', '');
  if (report.nextActions.length === 0) output.push('1. Preflight is ready; run the physical-device build and evidence gates.');
  else report.nextActions.forEach((action, index) => output.push(`${index + 1}. ${action}`));
  output.push('', 'Emulator and Simulator counts are diagnostic only and never satisfy a physical-device gate.', '');
  return output.join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const androidRequired = options.platform === 'all' || options.platform === 'android';
  const iosRequired = options.platform === 'all' || options.platform === 'ios';
  const report = {
    schemaVersion: 1,
    generatedAt: fixture('JTYPE_PREFLIGHT_NOW') || new Date().toISOString(),
    platform: options.platform,
    android: collectAndroid(androidRequired),
    ios: collectIos(iosRequired),
  };
  report.overall = report.android.ready && report.ios.ready ? 'ready' : 'blocked';
  report.nextActions = nextActions(report);

  const rendered = options.format === 'json'
    ? `${JSON.stringify(report, null, 2)}\n`
    : renderMarkdown(report);
  process.stdout.write(rendered);
  if (options.output) {
    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, rendered);
  }
  if (report.overall !== 'ready' && !options.allowBlocked) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
