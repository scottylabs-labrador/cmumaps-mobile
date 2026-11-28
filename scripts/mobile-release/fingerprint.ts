import { resolve } from "node:path";
import type { Platform } from "./core";

export const mobileRoot = resolve(import.meta.dir, "../../apps/mobile");

export async function fingerprint(
  platform: Platform,
): Promise<{ fingerprint: string; runtime: string; version: string }> {
  const worker = Bun.spawn(["node", resolve(import.meta.dir, "fingerprint-worker.cjs"), platform], {
    cwd: mobileRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [output, error, exit] = await Promise.all([
    new Response(worker.stdout).text(),
    new Response(worker.stderr).text(),
    worker.exited,
  ]);
  if (exit !== 0) throw new Error(`Expo fingerprint worker failed: ${error.trim()}`);
  const result = output.split(/\r?\n/).find((line) => line.startsWith("MOBILE_RELEASE_RESULT="));
  if (!result) throw new Error("Expo fingerprint worker returned no result");
  return JSON.parse(result.slice("MOBILE_RELEASE_RESULT=".length));
}
