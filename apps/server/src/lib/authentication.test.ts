import { APP_REVIEW_EMAIL } from "@cmumaps/common";
import type { Request } from "express";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccessToken: vi.fn(),
  findAccounts: vi.fn(),
  verify: vi.fn(),
  passwordSignInEnabled: true,
}));

vi.mock("./auth.ts", () => ({
  get passwordSignInEnabled() {
    return mocks.passwordSignInEnabled;
  },
  auth: {
    api: { getSession: mocks.getSession, getAccessToken: mocks.getAccessToken },
    $context: Promise.resolve({ internalAdapter: { findAccounts: mocks.findAccounts } }),
  },
}));
vi.mock("../env.ts", () => ({
  env: {
    AUTH_CLIENT_ID: "cmumaps",
    AUTH_ISSUER: "https://issuer.example",
    AUTH_JWKS_URI: "https://issuer.example/jwks",
  },
}));
vi.mock("jsonwebtoken", async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof import("jsonwebtoken") }>();
  return { default: { ...actual.default, verify: mocks.verify } };
});

import jwt from "jsonwebtoken";
import { AuthCapabilitiesController } from "../controllers/authCapabilitiesController.ts";
import { BEARER_AUTH, MEMBER_SCOPE, OIDC_AUTH, expressAuthentication } from "./authentication.ts";

function request(method = "GET", path = "/buildings"): Request {
  return { method, path, headers: {}, params: { floorCode: "CUC1" } } as unknown as Request;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.passwordSignInEnabled = true;
  mocks.getSession.mockResolvedValue({
    user: { id: "review-id", email: APP_REVIEW_EMAIL },
  });
  mocks.findAccounts.mockResolvedValue([{ providerId: "credential" }]);
});

describe("review credential sessions", () => {
  test("read unscoped resources without requesting a Keycloak token", async () => {
    await expect(expressAuthentication(request(), OIDC_AUTH, [])).resolves.toEqual({
      sub: "review-id",
      email: APP_REVIEW_EMAIL,
      groups: [],
    });
    expect(mocks.getAccessToken).not.toHaveBeenCalled();
  });

  test("cannot access member-scoped writes", async () => {
    await expect(
      expressAuthentication(request("PUT"), OIDC_AUTH, [MEMBER_SCOPE]),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.getAccessToken).not.toHaveBeenCalled();
  });

  test("cannot access unscoped writes or scoped reads", async () => {
    await expect(expressAuthentication(request("POST"), OIDC_AUTH, [])).rejects.toMatchObject({
      status: 403,
    });
    await expect(expressAuthentication(request(), OIDC_AUTH, [MEMBER_SCOPE])).rejects.toMatchObject(
      { status: 403 },
    );
  });

  test("cannot retain access after password sign-in is disabled", async () => {
    mocks.passwordSignInEnabled = false;
    await expect(expressAuthentication(request(), OIDC_AUTH, [])).rejects.toMatchObject({
      status: 401,
    });
  });

  test("email alone is insufficient without a credential account", async () => {
    mocks.findAccounts.mockResolvedValue([{ providerId: "keycloak" }]);
    await expect(expressAuthentication(request(), OIDC_AUTH, [])).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("existing authentication policies", () => {
  test("anonymous CUC floorplan requests no longer bypass authentication", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(
      expressAuthentication(request("GET", "/floors/CUC1/floorplan"), OIDC_AUTH, []),
    ).rejects.toMatchObject({ status: 401 });
  });

  test("CMU sessions retain their token group requirements", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "cmu-id", email: "user@andrew.cmu.edu" } });
    mocks.getAccessToken.mockResolvedValue({
      accessToken: jwt.sign({ sub: "cmu-id", groups: [MEMBER_SCOPE] }, "test-secret"),
    });
    await expect(
      expressAuthentication(request("PUT"), OIDC_AUTH, [MEMBER_SCOPE]),
    ).resolves.toMatchObject({ sub: "cmu-id", groups: [MEMBER_SCOPE] });
    await expect(
      expressAuthentication(request("PUT"), OIDC_AUTH, ["cmumaps-admins"]),
    ).rejects.toMatchObject({ status: 403 });
  });

  test("non-review users still need a valid Keycloak access token", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "other-id", email: "other@example.com" } });
    mocks.getAccessToken.mockResolvedValue({ accessToken: "invalid" });
    await expect(expressAuthentication(request(), OIDC_AUTH, [])).rejects.toMatchObject({
      status: 401,
    });
  });

  test("bearer tokens still require groups unless they identify this service account", async () => {
    const req = request("PUT");
    req.headers.authorization = "Bearer test-token";
    mocks.verify.mockImplementation((_token, _key, _options, callback) => {
      callback(null, { sub: "external", groups: [] });
    });
    await expect(expressAuthentication(req, BEARER_AUTH, [MEMBER_SCOPE])).rejects.toMatchObject({
      status: 403,
    });
    mocks.verify.mockImplementation((_token, _key, _options, callback) => {
      callback(null, {
        client_id: "cmumaps",
        preferred_username: "service-account-cmumaps",
      });
    });
    await expect(
      expressAuthentication(requestWithBearer(), BEARER_AUTH, [MEMBER_SCOPE]),
    ).resolves.toMatchObject({ client_id: "cmumaps" });
  });
});

function requestWithBearer(): Request {
  const req = request("PUT");
  req.headers.authorization = "Bearer test-token";
  return req;
}

test("public auth capabilities reflect the same switch used by auth", () => {
  const controller = new AuthCapabilitiesController();
  expect(controller.getAuthCapabilities()).toEqual({ passwordSignInEnabled: true });
  mocks.passwordSignInEnabled = false;
  expect(controller.getAuthCapabilities()).toEqual({ passwordSignInEnabled: false });
});
