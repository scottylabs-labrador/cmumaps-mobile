import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { env } from "@/env";

/** Matches server `APP_REVIEW_EMAIL` default — listed in App Store review notes. */
export const APP_REVIEW_EMAIL = "review@cmumaps.com";

export const authClient = createAuthClient({
  baseURL: env.serverUrl,
  plugins: [
    expoClient({
      scheme: "cmumaps",
      storagePrefix: "cmumaps",
      storage: SecureStore,
    }),
  ],
});

export const signIn = (returnPath: string) => {
  // Relative path: expoClient uses Linking.createURL (cmumaps:// in builds, exp:// in Expo Go).
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return authClient.signIn.social({
    provider: "keycloak",
    callbackURL: path,
  });
};

export const signInWithPassword = (email: string, password: string) =>
  authClient.signIn.email({ email, password });

export const signOut = () => authClient.signOut();
