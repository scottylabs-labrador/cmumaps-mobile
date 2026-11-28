import { describe, expect, test } from "bun:test";
import { buildNumber, decide, markerTag, parseMarker, record, type Identity } from "./core";

const original: Identity = {
  platform: "ios",
  fingerprint: "native-one",
  runtime: "native-one",
  version: "1.0.0",
  commit: "a".repeat(40),
};
const next = { ...original, commit: "b".repeat(40) };
const binary = record(original, null, "build", 101, original.commit, true);

describe("release decisions", () => {
  test("first run builds", () =>
    expect(decide(original, null, original.commit, "auto")).toBe("build"));
  test("successful rerun is a no-op", () =>
    expect(decide(original, binary, original.commit, "auto")).toBe("none"));
  test("JS-only change updates matching binary", () =>
    expect(decide(next, binary, next.commit, "auto")).toBe("update"));
  test("native change builds", () => {
    const native = { ...next, fingerprint: "native-two", runtime: "native-two" };
    expect(decide(native, binary, native.commit, "auto")).toBe("build");
  });
  test("version change builds even with an unchanged fingerprint", () =>
    expect(decide({ ...next, version: "2.0.0" }, binary, next.commit, "auto")).toBe("build"));
  test("runtime change builds", () =>
    expect(decide({ ...next, runtime: "other" }, binary, next.commit, "auto")).toBe("build"));
  test("stale run does nothing", () =>
    expect(decide(original, binary, next.commit, "auto")).toBe("none"));
  test("validation always builds without requiring main", () =>
    expect(decide(original, null, next.commit, "validate")).toBe("build"));
  test("failed upload cannot produce a marker", () =>
    expect(() => record(original, null, "build", 101, original.commit, false)).toThrow(
      "PUBLICATION_SUCCEEDED",
    ));
  test("stale writer cannot produce a marker", () =>
    expect(() => record(original, null, "build", 101, next.commit, true)).toThrow("Stale"));
  test("OTA preserves binary provenance and prevents repeat publication", () => {
    const updated = record(next, binary, "update", 102, next.commit, true);
    expect(updated.binary).toEqual(binary.binary);
    expect(updated.publication.commit).toBe(next.commit);
    expect(decide(next, updated, next.commit, "auto")).toBe("none");
  });
  test("racing state changes fail closed", () =>
    expect(() => record(next, binary, "build", 102, next.commit, true)).toThrow("state changed"));
  test("build numbers must advance past successful binaries", () =>
    expect(() =>
      record({ ...next, version: "2" }, binary, "build", 101, next.commit, true),
    ).toThrow("increase"));
});

describe("contracts", () => {
  test("platform state tags are distinct and stable", () => {
    expect(markerTag("ios")).toBe("mobile-release-state-ios");
    expect(markerTag("android")).toBe("mobile-release-state-android");
  });
  test("marker roundtrip and platform isolation", () => {
    expect(parseMarker(JSON.stringify(binary), "ios")).toEqual(binary);
    expect(() => parseMarker(JSON.stringify(binary), "android")).toThrow("Invalid");
    expect(() => parseMarker("{}", "ios")).toThrow("Invalid");
    expect(() => parseMarker("not-json", "ios")).toThrow();
  });
  test("run number is stable across attempts, increasing across runs", () => {
    expect(buildNumber("1000", "21", "auto")).toBe(1021);
    expect(buildNumber("1000", "21", "auto")).toBe(1021);
    expect(buildNumber("1000", "22", "auto")).toBe(1022);
  });
  test("production requires seed; validate does not", () => {
    expect(() => buildNumber(undefined, "1", "auto")).toThrow();
    expect(buildNumber(undefined, undefined, "validate")).toBeNull();
  });
  test("Android ceiling and invalid numbers fail", () => {
    expect(buildNumber("2099999999", "1", "auto")).toBe(2100000000);
    for (const base of ["2100000000", "-1", "1.2", "0", "999999999999999999999"]) {
      expect(() => buildNumber(base, "1", "auto")).toThrow();
    }
  });
});
