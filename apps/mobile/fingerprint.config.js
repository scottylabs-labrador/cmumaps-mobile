/** @type {import("@expo/fingerprint").Config} */
const config = {
  // version, ios.buildNumber, and android.versionCode stay out of the hash.
  // runtimeVersion policy "appVersion" limits an update to binaries of that version.
  sourceSkips: ["ExpoConfigVersions"],
};

module.exports = config;
