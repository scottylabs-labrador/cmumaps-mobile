import process from "node:process";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { genericOAuth, keycloak } from "better-auth/plugins";
import { env } from "../env.ts";

const isProd = process.env.NODE_ENV === "production";
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
  // App Store review path — seeded on boot; public email signup stays closed.
  emailAndPassword: {
    enabled: true,
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
  const email = env.APP_REVIEW_EMAIL;
  const password = env.APP_REVIEW_PASSWORD;
  if (!email || !password) {
    return;
  }
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    return;
  }
  const user = await ctx.internalAdapter.createUser(
    {
      email,
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
  console.log(`App Review user ready (${email})`);
};
