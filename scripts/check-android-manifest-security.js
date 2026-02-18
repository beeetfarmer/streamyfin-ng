#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const defaultCandidates = [
  "android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml",
  "android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml",
];

const cliManifestPath = process.argv[2];

function resolveManifestPath() {
  if (cliManifestPath) {
    const full = path.resolve(process.cwd(), cliManifestPath);
    if (fs.existsSync(full)) return full;
    return null;
  }

  for (const candidate of defaultCandidates) {
    const full = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

const fullPath = resolveManifestPath();
if (!fullPath) {
  console.error(
    `❌ Merged manifest not found. Checked: ${
      cliManifestPath ? cliManifestPath : defaultCandidates.join(", ")
    }`,
  );
  process.exit(1);
}

const xml = fs.readFileSync(fullPath, "utf8");
let hasError = false;

function fail(message) {
  hasError = true;
  console.error(`❌ ${message}`);
}

function pass(message) {
  console.log(`✅ ${message}`);
}

const forbiddenPermissions = [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WRITE_SETTINGS",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.ACCESS_COARSE_LOCATION",
];

for (const permission of forbiddenPermissions) {
  if (xml.includes(permission)) {
    fail(`Forbidden permission present in merged manifest: ${permission}`);
  }
}

const exportedComponentRegex =
  /<(activity|service|receiver|provider)\s+[^>]*android:name="([^"]+)"[^>]*android:exported="true"/g;
const exportedComponents = [];
for (const match of xml.matchAll(exportedComponentRegex)) {
  exportedComponents.push({ type: match[1], name: match[2] });
}

const allowedExportedComponents = new Set([
  "com.fredrikburmester.streamyfin.MainActivity",
  "com.doublesymmetry.trackplayer.service.MusicService",
  "com.google.firebase.iid.FirebaseInstanceIdReceiver",
  "androidx.work.impl.background.systemjob.SystemJobService",
  "androidx.work.impl.diagnostics.DiagnosticsReceiver",
  "androidx.profileinstaller.ProfileInstallReceiver",
]);

for (const component of exportedComponents) {
  if (!allowedExportedComponents.has(component.name)) {
    fail(`Unexpected exported ${component.type}: ${component.name}`);
  }
}

if (xml.includes('android:scheme="exp+streamyfin"')) {
  fail("Unexpected exp+streamyfin deep-link scheme in merged manifest");
}

const forbiddenRuntimeSdkMarkers = [
  "com.google.firebase.analytics",
  "com.google.firebase.crashlytics",
  "com.google.android.gms.ads",
];
for (const marker of forbiddenRuntimeSdkMarkers) {
  if (xml.includes(marker)) {
    fail(`Forbidden runtime SDK marker present in merged manifest: ${marker}`);
  }
}

if (hasError) {
  process.exit(1);
}

pass("Merged Android manifest security checks passed");
