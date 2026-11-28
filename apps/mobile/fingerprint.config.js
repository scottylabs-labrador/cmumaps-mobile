/** @type {import("@expo/fingerprint").Config} */
const config = {
  // version, ios.buildNumber, and android.versionCode stay out of the hash.
  // The fingerprint runtime policy isolates updates from incompatible binaries.
  sourceSkips: ["ExpoConfigVersions"],
};

module.exports = config;
