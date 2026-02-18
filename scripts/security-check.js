#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();

function readText(relPath) {
  const fullPath = path.join(repoRoot, relPath);
  return fs.readFileSync(fullPath, "utf8");
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function manifestDeclaresPermission(manifest, permission) {
  const permissionRegex = new RegExp(
    `<uses-permission[^>]*android:name=["']${permission}["'][^>]*>`,
    "gi",
  );
  const matches = manifest.match(permissionRegex);
  if (!matches) return false;
  return matches.some((entry) => !/tools:node=["']remove["']/i.test(entry));
}

function checkForbiddenJsDependencies() {
  const packageJson = JSON.parse(readText("package.json"));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.resolutions,
  };

  const forbiddenPackages = [
    "@react-native-firebase/analytics",
    "@react-native-firebase/crashlytics",
    "@sentry/react-native",
    "react-native-google-mobile-ads",
    "react-native-fbads",
    "appsflyer-react-native-plugin",
    "mixpanel-react-native",
    "@amplitude/analytics-react-native",
  ];

  const found = forbiddenPackages.filter((pkg) => Object.hasOwn(allDeps, pkg));
  if (found.length > 0) {
    fail(`Forbidden JS dependencies detected: ${found.join(", ")}`);
  } else {
    pass("No forbidden JS dependency SDKs detected");
  }
}

function checkGradleForbiddenArtifacts() {
  const buildGradle = readText("android/app/build.gradle");
  const forbiddenGradleArtifacts = [
    "firebase-analytics",
    "firebase-crashlytics",
    "play-services-ads",
  ];

  const found = forbiddenGradleArtifacts.filter((artifact) => {
    const matcher = new RegExp(
      `\\b(implementation|api|compileOnly|runtimeOnly)\\s+["'][^"']*${artifact}[^"']*["']`,
      "i",
    );
    return matcher.test(buildGradle);
  });

  if (found.length > 0) {
    fail(
      `Forbidden Android artifacts detected in Gradle deps: ${found.join(", ")}`,
    );
  } else {
    pass("No forbidden Android analytics/ads artifacts declared");
  }
}

function checkManifestAndAppConfig() {
  const manifest = readText("android/app/src/main/AndroidManifest.xml");
  const appJson = JSON.parse(readText("app.json"));
  const androidConfig = appJson?.expo?.android || {};
  const blockedPermissions = new Set(androidConfig.blockedPermissions || []);

  const forbiddenManifestPermissions = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.WRITE_SETTINGS",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.ACCESS_COARSE_LOCATION",
  ];

  for (const permission of forbiddenManifestPermissions) {
    if (manifestDeclaresPermission(manifest, permission)) {
      fail(
        `Forbidden permission still present in main manifest: ${permission}`,
      );
    }
  }

  const requiredBlocks = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.WRITE_SETTINGS",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.ACCESS_COARSE_LOCATION",
  ];
  for (const permission of requiredBlocks) {
    if (!blockedPermissions.has(permission)) {
      fail(`Missing blocked permission in app.json: ${permission}`);
    }
  }

  if (manifest.includes('android:scheme="exp+streamyfin"')) {
    fail(
      "Legacy exp+streamyfin deep-link scheme should not be in release manifest",
    );
  }

  if (process.exitCode !== 1) {
    pass("Manifest and app config permission/deeplink checks passed");
  }
}

function checkDeepLinkCredentialHandling() {
  const loginTsx = readText("app/login.tsx");

  if (/login\(_username,\s*_password\)/.test(loginTsx)) {
    fail(
      "Deep-link credential auto-login code path still present in login.tsx",
    );
    return;
  }

  if (/setCredentials\(\{\s*username:\s*_username/.test(loginTsx)) {
    fail("Deep-link credentials should not prefill login credentials");
    return;
  }

  pass("Deep-link credential auto-login is disabled");
}

function main() {
  console.log("Running security static checks...");
  checkForbiddenJsDependencies();
  checkGradleForbiddenArtifacts();
  checkManifestAndAppConfig();
  checkDeepLinkCredentialHandling();

  if (process.exitCode === 1) {
    process.exit(1);
  }
  console.log("All security static checks passed.");
}

main();
