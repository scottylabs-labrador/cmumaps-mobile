import {
  buildNumber,
  commit,
  mode,
  platform,
  record,
  required,
  type Action,
  type Identity,
} from "./core";
import { GitHub } from "./github";

export async function saveState(): Promise<void> {
  const releaseMode = mode(process.env.RELEASE_MODE);
  // Validation is deliberately network-free, even if someone invokes this step.
  if (releaseMode === "validate") {
    console.log("Validation: no release state written");
    return;
  }
  if (process.env.PUBLICATION_SUCCEEDED !== "true") {
    throw new Error("PUBLICATION_SUCCEEDED=true is required after successful upload/update");
  }
  const target = platform(process.env.PLATFORM);
  const sha = commit(process.env.GITHUB_SHA);
  const number = buildNumber(
    process.env.MOBILE_BUILD_NUMBER_BASE,
    process.env.GITHUB_RUN_NUMBER,
    releaseMode,
  )!;
  const action = required(process.env.RELEASE_ACTION, "RELEASE_ACTION") as Action;
  if (action !== "build" && action !== "update")
    throw new Error("RELEASE_ACTION must be build or update");
  const current: Identity = {
    platform: target,
    commit: sha,
    fingerprint: required(process.env.RELEASE_FINGERPRINT, "RELEASE_FINGERPRINT"),
    runtime: required(process.env.RELEASE_RUNTIME, "RELEASE_RUNTIME"),
    version: required(process.env.RELEASE_VERSION, "RELEASE_VERSION"),
  };
  // Do not re-fingerprint after a local prebuild: generated files can differ.
  // The workflow must pass the immutable planning outputs to this command.
  const github = new GitHub();
  const previous = await github.read(target);
  const main = await github.mainSha(); // Immediately before the only write.
  const updated = record(current, previous?.marker ?? null, action, number, main, true);
  await github.write(updated, previous?.id);
  console.log(`Recorded successful ${target} ${action}`);
}

if (import.meta.main) {
  saveState().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Release state recording failed");
    process.exitCode = 1;
  });
}
