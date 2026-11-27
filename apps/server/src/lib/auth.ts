import process from "node:process";
import { expo } from "@better-auth/expo";
import { APP_REVIEW_EMAIL } from "@cmumaps/common";
import { betterAuth } from "better-auth";
import { genericOAuth, keycloak } from "better-auth/plugins";
import { env } from "../env.ts";

const isProd = process.env.NODE_ENV === "production";
export const passwordSignInEnabled = Boolean(env.PASSWORD_SIGN_IN);
console.log(`NODE_ENV=${process.env.NODE_ENV ?? "<unset>"} isProd=${isProd}`);

// https://www.better-auth.com/docs/installation#create-a-better-auth-instance
// https://www.better-auth.com/docs/plugins/generic-oauth#pre-configured-provider-helpers
export const auth = betterAuth({
  baseURL: env.SERVER_URL,
  trustedOrigins: [
    env.SERVER_URL,
    "cmumaps://",
    "cmumaps://*",
    // Expo Go: "exp://" matches any host/port (simulator, LAN, Metro tunnel).
    ...(isProd ? [] : ["exp://"]),
  ],
  advanced: {
    // Cloudflare Tunnel sets X-Forwarded-Proto / Host.
    trustedProxyHeaders: !isProd,
  },
  // App Store review path — enabled only when PASSWORD_SIGN_IN is set; public signup stays closed.
  emailAndPassword: {
    enabled: passwordSignInEnabled,
    disableSignUp: true,
  },
  plugins: [
    expo(),
    genericOAuth({
      config: [
        keycloak({
          clientId: env.AUTH_CLIENT_ID,
          clientSecret: env.AUTH_CLIENT_SECRET,
          issuer: env.AUTH_ISSUER,
          redirectURI: `${env.SERVER_URL}/api/auth/callback/keycloak`,
          scopes: ["openid", "email", "profile", "offline_access"],
        }),
      ],
    }),
  ],
});

/** Ensure the App Store demo account exists (memory adapter resets on restart). */
export const ensureAppReviewUser = async () => {
  const password = env.PASSWORD_SIGN_IN;
  if (!password) {
    return;
  }
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(APP_REVIEW_EMAIL);
  if (existing) {
    return;
  }
  const user = await ctx.internalAdapter.createUser(
    {
      email: APP_REVIEW_EMAIL,
      name: "App Review",
      emailVerified: true,
    },
    { method: "email-password" },
  );
  if (!user) {
    throw new Error("Failed to create App Review user");
  }
  const hash = await ctx.password.hash(password);
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hash,
  });
  console.log(`App Review user ready (${APP_REVIEW_EMAIL})`);
};
