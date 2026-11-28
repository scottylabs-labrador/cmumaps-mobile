export type Platform = "ios" | "android";
export type Mode = "auto" | "validate";
export type Action = "build" | "update" | "none";

export interface Identity {
  platform: Platform;
  fingerprint: string;
  runtime: string;
  version: string;
  commit: string;
}

export interface Marker {
  schema: 1;
  platform: Platform;
  binary: Identity & { build_number: number };
  publication: Identity & { action: "build" | "update" };
}

export function platform(value: string | undefined): Platform {
  if (value !== "ios" && value !== "android") throw new Error("PLATFORM must be ios or android");
  return value;
}

export function mode(value: string | undefined): Mode {
  if (value !== "auto" && value !== "validate")
    throw new Error("RELEASE_MODE must be auto or validate");
  return value;
}

export function required(value: string | undefined, name: string): string {
  if (!value || /[\r\n]/.test(value))
    throw new Error(`${name} is required and must be single-line`);
  return value;
}

export function commit(value: string | undefined): string {
  const sha = required(value, "GITHUB_SHA");
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("GITHUB_SHA must be a full commit SHA");
  return sha;
}

export function buildNumber(
  base: string | undefined,
  run: string | undefined,
  releaseMode: Mode,
): number | null {
  if (!base && releaseMode === "validate") return null;
  if (!base || !/^[1-9]\d*$/.test(base) || !run || !/^[1-9]\d*$/.test(run)) {
    throw new Error("Positive MOBILE_BUILD_NUMBER_BASE and GITHUB_RUN_NUMBER are required");
  }
  const result = Number(base) + Number(run);
  // Google Play's versionCode ceiling; use the same safe integer for both platforms.
  if (!Number.isSafeInteger(result) || result > 2_100_000_000) {
    throw new Error("Build number must not exceed Android's 2100000000 limit");
  }
  return result;
}

export function markerTag(value: Platform): string {
  return `mobile-release-state-${value}`;
}

export function sameRuntime(a: Identity, b: Identity): boolean {
  return (
    a.platform === b.platform &&
    a.fingerprint === b.fingerprint &&
    a.runtime === b.runtime &&
    a.version === b.version
  );
}

export function decide(
  current: Identity,
  previous: Marker | null,
  remoteMain: string,
  releaseMode: Mode,
): Action {
  if (releaseMode === "validate") return "build";
  if (current.commit !== remoteMain) return "none";
  if (!previous || !sameRuntime(current, previous.binary)) return "build";
  return sameRuntime(current, previous.publication) &&
    previous.publication.commit === current.commit
    ? "none"
    : "update";
}

function isIdentity(value: unknown, expectedPlatform: Platform): value is Identity {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    item.platform === expectedPlatform &&
    ["fingerprint", "runtime", "version"].every(
      (key) =>
        typeof item[key] === "string" && Boolean(item[key]) && !/[\r\n]/.test(item[key] as string),
    ) &&
    typeof item.commit === "string" &&
    /^[a-f0-9]{40}$/.test(item.commit)
  );
}

export function parseMarker(body: string, expectedPlatform: Platform): Marker {
  const item = JSON.parse(body) as Marker;
  if (
    !item ||
    item.schema !== 1 ||
    item.platform !== expectedPlatform ||
    !isIdentity(item.binary, expectedPlatform) ||
    !isIdentity(item.publication, expectedPlatform) ||
    !Number.isSafeInteger(item.binary.build_number) ||
    item.binary.build_number < 1 ||
    item.binary.build_number > 2_100_000_000 ||
    !["build", "update"].includes(item.publication.action) ||
    !sameRuntime(item.binary, item.publication)
  ) {
    throw new Error("Invalid release state; refusing to treat corrupt state as a first release");
  }
  return item;
}

export function record(
  current: Identity,
  previous: Marker | null,
  action: Action,
  number: number,
  remoteMain: string,
  succeeded: boolean,
): Marker {
  if (!succeeded)
    throw new Error("PUBLICATION_SUCCEEDED=true is required after successful upload/update");
  if (current.commit !== remoteMain) throw new Error("Stale commit: remote main has advanced");
  if (action === "none") throw new Error("Cannot record a no-op");
  if (action !== decide(current, previous, remoteMain, "auto")) {
    throw new Error("Release state changed since planning; refusing to record");
  }
  if (action === "build" && previous && number <= previous.binary.build_number) {
    throw new Error("Binary build number must increase; check MOBILE_BUILD_NUMBER_BASE");
  }
  return {
    schema: 1,
    platform: current.platform,
    binary: action === "build" ? { ...current, build_number: number } : previous!.binary,
    publication: { ...current, action },
  };
}
