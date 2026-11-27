import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  social: vi.fn(),
  email: vi.fn(),
  signOut: vi.fn(),
  notifySession: vi.fn(),
}));
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    signIn: { social: mocks.social, email: mocks.email },
    signOut: mocks.signOut,
  }),
}));
vi.mock("@better-auth/expo/client", () => ({ expoClient: () => ({}) }));
vi.mock("expo-secure-store", () => ({}));
vi.mock("@/env", () => ({ env: { serverUrl: "https://example.invalid" } }));
vi.mock("./sessionEvents", () => ({ notifySession: mocks.notifySession }));

import { APP_REVIEW_EMAIL } from "@cmumaps/common";
import { signIn, signInWithPassword, signOut } from "./client";

beforeEach(() => vi.resetAllMocks());

describe("mobile auth client", () => {
  test.each(["/GHC/3?dst=GHC%3A3000", "GHC/3?dst=GHC%3A3000"])(
    "preserves a relative callback for %s",
    async (returnPath) => {
      await signIn(returnPath);
      expect(mocks.social).toHaveBeenCalledWith({
        provider: "keycloak",
        callbackURL: "/GHC/3?dst=GHC%3A3000",
      });
    },
  );

  test("review credentials use only the designated account", async () => {
    await signInWithPassword("review secret");
    expect(mocks.email).toHaveBeenCalledWith({
      email: APP_REVIEW_EMAIL,
      password: "review secret",
    });
  });

  test("confirmed sign-out notifies the session boundary", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mocks.notifySession).toHaveBeenCalledExactlyOnceWith("signed-out");
  });

  test.each(["server", "network"])("failed sign-out preserves private state: %s", async (kind) => {
    if (kind === "server")
      mocks.signOut.mockResolvedValue({ error: { message: "Unable to sign out." } });
    else mocks.signOut.mockRejectedValue(new Error("offline"));
    await expect(signOut()).rejects.toThrow();
    expect(mocks.notifySession).not.toHaveBeenCalled();
  });
});
