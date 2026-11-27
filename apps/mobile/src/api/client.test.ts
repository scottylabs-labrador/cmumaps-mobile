import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  getCookie: vi.fn(),
  notifySession: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/auth/client", () => ({ authClient: { getCookie: mocks.getCookie } }));
vi.mock("@/auth/sessionEvents", () => ({ notifySession: mocks.notifySession }));
vi.mock("@/env", () => ({ env: { serverUrl: "https://example.invalid" } }));
vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn(), useQueries: vi.fn() }));

import { httpCampusDataAdapter } from "./client";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getCookie.mockResolvedValue("session=private-cookie");
});
afterEach(() => vi.unstubAllGlobals());

describe("authenticated campus API adapter", () => {
  test("loads the current cookie for every request instead of retaining a prior user's cookie", async () => {
    mocks.fetch.mockImplementation(() => Promise.resolve(new Response("{}")));
    await httpCampusDataAdapter.getBuildings();
    mocks.getCookie.mockResolvedValue("session=next-user");
    await httpCampusDataAdapter.getBuildings();
    expect(mocks.fetch.mock.calls[0]![1].headers.cookie).toBe("session=private-cookie");
    expect(mocks.fetch.mock.calls[1]![1].headers.cookie).toBe("session=next-user");
  });

  test("omits a missing cookie instead of sending an empty credential", async () => {
    mocks.getCookie.mockResolvedValue("");
    mocks.fetch.mockResolvedValue(new Response("{}"));
    await httpCampusDataAdapter.getBuildings();
    expect(mocks.fetch).toHaveBeenCalledWith("https://example.invalid/buildings", {
      headers: { accept: "application/json" },
      signal: undefined,
    });
  });

  test.each([401, 403, 500])("HTTP %s emits an expiry hint only for 401", async (status) => {
    mocks.fetch.mockResolvedValue(new Response(null, { status }));
    await expect(httpCampusDataAdapter.getBuildings()).rejects.toThrow(`${status} /buildings`);
    expect(mocks.notifySession).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    if (status === 401) expect(mocks.notifySession).toHaveBeenCalledWith("unauthorized");
  });

  test("a network failure does not announce an expired session", async () => {
    mocks.fetch.mockRejectedValue(new Error("offline"));
    await expect(httpCampusDataAdapter.getBuildings()).rejects.toThrow("offline");
    expect(mocks.notifySession).not.toHaveBeenCalled();
  });
});
