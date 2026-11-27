/// <reference types="bun" />
import { createRequire } from "node:module";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import type { ReactNode } from "react";

const require = createRequire(import.meta.url);
const originalPngLoader = require.extensions[".png"];
beforeAll(() => {
  require.extensions[".png"] = (module) => {
    module.exports = "test-icon";
  };
});
afterAll(() => {
  if (originalPngLoader) require.extensions[".png"] = originalPngLoader;
  else delete require.extensions[".png"];
});

// Exercise component handlers without loading native modules or adding a renderer.
// State is retained across explicit renders; effects run only when requested.
const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
  query: {
    data: undefined as { passwordSignInEnabled: boolean } | undefined,
    isError: false,
    refetch: vi.fn(),
  },
  queryOptions: undefined as { queryFn: () => Promise<unknown> } | undefined,
  signIn: vi.fn(),
  signInWithPassword: vi.fn(),
  onAuthenticated: vi.fn(),
  getSession: vi.fn(),
  session: { data: null as object | null, isPending: false, error: null, refetch: vi.fn() },
  cancelQueries: vi.fn(),
  clear: vi.fn(),
  resetSession: vi.fn(),
  replace: vi.fn(),
  subscriber: undefined as ((event: "signed-out" | "unauthorized") => void) | undefined,
}));

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [harness.states[index], (value: unknown) => (harness.states[index] = value)];
  },
  useRef: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.states)) harness.states[index] = { current: initial };
    return harness.states[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => harness.effects.push(effect),
}));
vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Image: "Image",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { OS: "ios" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("expo-web-browser", () => ({ openBrowserAsync: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryFn: () => Promise<unknown> }) => {
    harness.queryOptions = options;
    return harness.query;
  },
  useQueryClient: () => ({
    cancelQueries: harness.cancelQueries,
    clear: harness.clear,
  }),
}));
vi.mock("expo-router", () => ({
  router: { replace: harness.replace },
  usePathname: () => "/GHC/3",
  useGlobalSearchParams: () => ({ path: ["GHC", "3"], dst: "GHC:3000" }),
}));
vi.mock("@/auth/client", () => ({
  signIn: harness.signIn,
  signInWithPassword: harness.signInWithPassword,
  authClient: { useSession: () => harness.session, getSession: harness.getSession },
}));
vi.mock("@/auth/sessionEvents", () => ({
  subscribeSession: (listener: typeof harness.subscriber) => {
    harness.subscriber = listener;
    return () => (harness.subscriber = undefined);
  },
}));
vi.mock("@/auth/sessionPolicy", async () => import("../auth/sessionPolicy"));
vi.mock("@/components/MapScreen", () => ({ MapScreen: () => null }));
vi.mock("@/components/WelcomeScreen", async () => import("./WelcomeScreen"));
vi.mock("@/store", () => ({
  useMapStore: { getState: () => ({ resetSession: harness.resetSession }) },
}));
vi.mock("@/theme", () => ({ theme: {} }));
vi.mock("@/env", () => ({ env: { serverUrl: "https://example.invalid" } }));

import { SessionGate } from "./SessionGate";
import { WelcomeScreen } from "./WelcomeScreen";

type Element = {
  type: unknown;
  props: {
    children?: ReactNode;
    disabled?: boolean;
    value?: string;
    accessibilityLabel?: string;
    onPress?: () => void;
    onChangeText?: (value: string) => void;
    onAuthenticated?: () => Promise<void>;
  };
};

const elements = (node: unknown): Element[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
};
const text = (node: unknown): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object" && "props" in node)
    return text((node as Element).props.children);
  return "";
};
const button = (tree: unknown, label: string) => {
  const result = elements(tree).find(
    (element) => element.type === "Pressable" && text(element.props.children) === label,
  );
  if (!result) throw new Error(`Missing button: ${label}`);
  return result;
};
const renderWelcome = () => {
  harness.cursor = 0;
  return WelcomeScreen({
    returnPath: "/GHC/3?dst=GHC%3A3000",
    onAuthenticated: harness.onAuthenticated,
  });
};
const renderGate = () => {
  harness.cursor = 0;
  harness.effects = [];
  const tree = SessionGate();
  return { tree, effects: [...harness.effects] };
};
const settle = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve();
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  harness.states = [];
  harness.cursor = 0;
  harness.effects = [];
  harness.subscriber = undefined;
  harness.query.data = undefined;
  harness.query.isError = false;
  harness.session.data = null;
  harness.session.isPending = false;
  harness.session.error = null;
  harness.signIn.mockResolvedValue({ error: null });
  harness.signInWithPassword.mockResolvedValue({ error: null });
  harness.getSession.mockResolvedValue({ data: { user: {} }, error: null });
});

describe("WelcomeScreen capability and review form", () => {
  test.each([false, true])("shows review form only when capability is %s", (enabled) => {
    harness.query.data = { passwordSignInEnabled: enabled };
    const tree = renderWelcome();
    expect(text(tree).includes("App Review Sign-In")).toBe(enabled);
    expect(text(tree)).toContain("Sign in with CMU");
    expect(text(tree)).not.toContain("Review password");
  });

  test("capability fetch uses server response and rejects HTTP failures", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ passwordSignInEnabled: true })));
    vi.stubGlobal("fetch", fetch);
    renderWelcome();
    await expect(harness.queryOptions!.queryFn()).resolves.toEqual({
      passwordSignInEnabled: true,
    });
    expect(fetch).toHaveBeenCalledWith("https://example.invalid/auth-capabilities");
    fetch.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(harness.queryOptions!.queryFn()).rejects.toThrow(
      "Unable to load sign-in options.",
    );
  });

  test("capability error keeps CMU sign-in usable and offers retry", () => {
    harness.query.isError = true;
    const tree = renderWelcome();
    expect(text(tree)).not.toContain("App Review Sign-In");
    expect(button(tree, "Sign in with CMU").props.disabled).toBe(false);
    button(tree, "Unable to load review sign-in. Tap to retry.").props.onPress!();
    expect(harness.query.refetch).toHaveBeenCalledOnce();
  });

  const enterPassword = (password: string) => {
    harness.query.data = { passwordSignInEnabled: true };
    button(renderWelcome(), "App Review Sign-In").props.onPress!();
    const input = elements(renderWelcome()).find(
      (element) => element.props.accessibilityLabel === "App Review password",
    )!;
    input.props.onChangeText!(password);
    return renderWelcome();
  };

  test("empty password cannot submit, and rejected password stays available for correction", async () => {
    expect(button(enterPassword(""), "Sign in").props.disabled).toBe(true);
    const input = elements(renderWelcome()).find(
      (element) => element.props.accessibilityLabel === "App Review password",
    )!;
    input.props.onChangeText!("incorrect");
    harness.signInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    button(renderWelcome(), "Sign in").props.onPress!();
    expect(button(renderWelcome(), "Sign in").props.disabled).toBe(true);
    await settle();
    const tree = renderWelcome();
    expect(text(tree)).toContain("Sign-in failed. Check the review password.");
    expect(harness.onAuthenticated).not.toHaveBeenCalled();
    expect(harness.signInWithPassword).toHaveBeenCalledWith("incorrect");
    expect(button(tree, "Sign in").props.disabled).toBe(false);
    expect(elements(tree).find((element) => element.type === "TextInput")!.props.value).toBe(
      "incorrect",
    );
  });

  test("network failure releases busy state without reporting authentication success", async () => {
    harness.signInWithPassword.mockRejectedValue(new Error("offline"));
    button(enterPassword("secret"), "Sign in").props.onPress!();
    await settle();
    const tree = renderWelcome();
    expect(text(tree)).toContain("Unable to connect. Check your connection and try again.");
    expect(button(tree, "Sign in").props.disabled).toBe(false);
    expect(harness.onAuthenticated).not.toHaveBeenCalled();
  });

  test("successful review authentication erases password and confirms the session", async () => {
    button(enterPassword("secret"), "Sign in").props.onPress!();
    await settle();
    expect(harness.onAuthenticated).toHaveBeenCalledOnce();
    expect(
      elements(renderWelcome()).find((element) => element.type === "TextInput")!.props.value,
    ).toBe("");
  });

  test("CMU sign-in preserves the intended destination", async () => {
    button(renderWelcome(), "Sign in with CMU").props.onPress!();
    await settle();
    expect(harness.signIn).toHaveBeenCalledWith("/GHC/3?dst=GHC%3A3000");
    expect(harness.onAuthenticated).toHaveBeenCalledOnce();
  });
});

describe("SessionGate private state cleanup", () => {
  const subscribe = () => {
    renderGate().effects[0]!();
  };

  test("sign-out cancels requests before clearing cache, store, and destination", async () => {
    let finishCancellation!: () => void;
    harness.cancelQueries.mockReturnValue(
      new Promise<void>((resolve) => (finishCancellation = resolve)),
    );
    harness.session.data = { user: {} };
    subscribe();
    harness.subscriber!("signed-out");
    expect(harness.cancelQueries).toHaveBeenCalledOnce();
    expect(harness.clear).not.toHaveBeenCalled();
    expect(
      elements(renderGate().tree).some(
        (element) => element.props.accessibilityLabel === "Restoring session",
      ),
    ).toBe(true);
    finishCancellation();
    await settle();
    expect(harness.clear).toHaveBeenCalledOnce();
    expect(harness.resetSession).toHaveBeenCalledOnce();
    expect(harness.replace).toHaveBeenCalledWith("/");
    // Even if Better Auth still exposes its old session, the map stays hidden.
    expect(renderGate().tree.type).toBe(WelcomeScreen);
  });

  test.each(["present", "error", "network", "expired"])(
    "a map 401 checks the session before cleanup: %s",
    async (outcome) => {
      subscribe();
      if (outcome === "network") harness.getSession.mockRejectedValue(new Error("offline"));
      else
        harness.getSession.mockResolvedValue({
          data: outcome === "present" ? { user: {} } : null,
          error: outcome === "error" ? { message: "offline" } : null,
        });
      harness.subscriber!("unauthorized");
      await settle();
      expect(harness.getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
      expect(harness.resetSession).toHaveBeenCalledTimes(outcome === "expired" ? 1 : 0);
    },
  );

  test("successful restoration after sign-out releases the forced signed-out gate", async () => {
    subscribe();
    harness.subscriber!("signed-out");
    await settle();
    const welcome = renderGate().tree;
    expect(welcome.type).toBe(WelcomeScreen);
    await welcome.props.onAuthenticated!();
    harness.session.data = { user: {} };
    expect(renderGate().tree.type).not.toBe(WelcomeScreen);
  });

  test("authentication confirmation rejects a successful response with no session", async () => {
    harness.getSession.mockResolvedValue({ data: null, error: null });
    const welcome = renderGate().tree;
    await expect(welcome.props.onAuthenticated!()).rejects.toThrow();
  });

  test("a stale 401 confirmation must not clear a newer authenticated session", async () => {
    let finishExpiredCheck!: (value: { data: null; error: null }) => void;
    harness.getSession.mockReturnValueOnce(
      new Promise((resolve) => (finishExpiredCheck = resolve)),
    );
    subscribe();
    harness.subscriber!("unauthorized");
    await renderGate().tree.props.onAuthenticated!();
    harness.session.data = { user: { id: "new-session" } };
    finishExpiredCheck({ data: null, error: null });
    await settle();
    expect(harness.resetSession).not.toHaveBeenCalled();
    expect(harness.replace).not.toHaveBeenCalled();
    expect(renderGate().tree.type).not.toBe(WelcomeScreen);
  });
});
