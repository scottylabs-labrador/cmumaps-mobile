import { describe, expect, test } from "vite-plus/test";
import { notifySession, subscribeSession } from "./sessionEvents";
import { sessionScreen, signInReturnPath } from "./sessionPolicy";

describe("session boundary", () => {
  test("waits for restoration before displaying the signed-out screen", () => {
    expect(
      sessionScreen({ hasSession: false, pending: true, failed: false, forcedSignedOut: false }),
    ).toBe("loading");
    expect(
      sessionScreen({ hasSession: false, pending: false, failed: false, forcedSignedOut: false }),
    ).toBe("welcome");
  });
  test("network errors do not discard an existing session", () => {
    expect(
      sessionScreen({ hasSession: true, pending: false, failed: true, forcedSignedOut: false }),
    ).toBe("map");
    expect(
      sessionScreen({ hasSession: false, pending: false, failed: true, forcedSignedOut: false }),
    ).toBe("retry");
  });
  test("confirmed sign-out hides stale session data", () => {
    expect(
      sessionScreen({ hasSession: true, pending: false, failed: false, forcedSignedOut: true }),
    ).toBe("welcome");
  });
  test("retains destination and directions parameters without duplicating catch-all path", () => {
    expect(
      signInReturnPath("/GHC/3", { path: ["GHC", "3"], src: "Your location", dst: "GHC:3000" }),
    ).toBe("/GHC/3?src=Your+location&dst=GHC%3A3000");
  });
  test("session subscriptions can be removed", () => {
    const events: string[] = [];
    const unsubscribe = subscribeSession((event) => events.push(event));
    notifySession("unauthorized");
    unsubscribe();
    notifySession("signed-out");
    expect(events).toEqual(["unauthorized"]);
  });
});
