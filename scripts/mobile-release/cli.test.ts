import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("validate state CLI never invokes GitHub or requires production credentials", async () => {
  const child = Bun.spawn([process.execPath, resolve(import.meta.dir, "state.ts")], {
    env: { RELEASE_MODE: "validate", PATH: "" },
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await child.exited).toBe(0);
  expect(await new Response(child.stdout).text()).toContain("no release state written");
});

test("failed publication CLI exits before accessing GitHub", async () => {
  const child = Bun.spawn([process.execPath, resolve(import.meta.dir, "state.ts")], {
    env: { RELEASE_MODE: "auto", PUBLICATION_SUCCEEDED: "false", PATH: "" },
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await child.exited).toBe(1);
  expect(await new Response(child.stderr).text()).toContain("PUBLICATION_SUCCEEDED=true");
});

test("planner rejects missing production seed before loading Expo or accessing GitHub", async () => {
  const child = Bun.spawn([process.execPath, resolve(import.meta.dir, "plan.ts")], {
    env: { RELEASE_MODE: "auto", PLATFORM: "android", GITHUB_SHA: "a".repeat(40), PATH: "" },
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await child.exited).toBe(1);
  expect(await new Response(child.stderr).text()).toContain("MOBILE_BUILD_NUMBER_BASE");
});
