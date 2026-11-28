import { appendFile } from "node:fs/promises";
import { buildNumber, commit, decide, mode, platform, type Identity } from "./core";
import { fingerprint } from "./fingerprint";
import { GitHub } from "./github";

export async function plan(): Promise<void> {
  const target = platform(process.env.PLATFORM);
  const releaseMode = mode(process.env.RELEASE_MODE);
  const sha = commit(process.env.GITHUB_SHA);
  const number = buildNumber(
    process.env.MOBILE_BUILD_NUMBER_BASE,
    process.env.GITHUB_RUN_NUMBER,
    releaseMode,
  );
  const current: Identity = { platform: target, commit: sha, ...(await fingerprint(target)) };
  let action = decide(current, null, sha, releaseMode);
  if (releaseMode === "auto") {
    const github = new GitHub();
    const previous = await github.read(target);
    const main = await github.mainSha();
    action = decide(current, previous?.marker ?? null, main, releaseMode);
    if (action === "build" && previous && number! <= previous.marker.binary.build_number) {
      throw new Error(
        "Build number must exceed the recorded binary; increase MOBILE_BUILD_NUMBER_BASE",
      );
    }
  }
  const outputs = {
    fingerprint: current.fingerprint,
    runtime: current.runtime,
    version: current.version,
    action,
    build_number: number === null ? "" : String(number),
  };
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(""),
    );
  }
  console.log(JSON.stringify(outputs));
}

if (import.meta.main) {
  plan().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Release planning failed");
    process.exitCode = 1;
  });
}
