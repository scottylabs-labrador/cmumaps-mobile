// Expo's TypeScript app-config loader uses Node-specific CommonJS internals.
// Keep this worker on Node even when the public CLI is launched with Bun.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const mobileRoot = resolve(__dirname, "../../apps/mobile");
const mobileRequire = createRequire(resolve(mobileRoot, "package.json"));

async function main() {
  const platform = process.argv[2];
  if (!["ios", "android"].includes(platform)) throw new Error("Invalid platform");
  const expoRequire = createRequire(mobileRequire.resolve("expo/package.json"));
  if (mobileRequire.resolve("@expo/fingerprint") !== expoRequire.resolve("@expo/fingerprint")) {
    throw new Error("Mobile and Expo resolve different @expo/fingerprint versions");
  }
  const { getConfig } = mobileRequire("expo/config");
  const { exp } = getConfig(mobileRoot, { isPublicConfig: true, skipSDKVersionRequirement: true });
  const policy = exp[platform]?.runtimeVersion ?? exp.runtimeVersion;
  if (!policy || typeof policy !== "object" || policy.policy !== "fingerprint") {
    throw new Error(
      `Set ${platform} runtimeVersion to { policy: "fingerprint" } before release planning`,
    );
  }
  if (typeof exp.version !== "string" || !exp.version || /[\r\n]/.test(exp.version)) {
    throw new Error("Expo config must provide an explicit app version");
  }
  const updatesRoot = resolve(mobileRequire.resolve("expo-updates/package.json"), "..");
  const { resolveRuntimeVersionAsync } = mobileRequire(
    resolve(updatesRoot, "utils/build/resolveRuntimeVersionAsync.js"),
  );
  const result = await resolveRuntimeVersionAsync(mobileRoot, platform, {}, {});
  if (
    typeof result.runtimeVersion !== "string" ||
    !result.runtimeVersion ||
    !Array.isArray(result.fingerprintSources)
  ) {
    throw new Error("Expo did not resolve a fingerprint-policy runtime");
  }
  // Prefix permits Expo informational logs without corrupting the result.
  console.log(
    `MOBILE_RELEASE_RESULT=${JSON.stringify({
      fingerprint: result.runtimeVersion,
      runtime: result.runtimeVersion,
      version: exp.version,
    })}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
