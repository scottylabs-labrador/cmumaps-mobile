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
