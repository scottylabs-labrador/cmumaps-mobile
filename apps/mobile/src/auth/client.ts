import { APP_REVIEW_EMAIL } from "@cmumaps/common";
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { env } from "@/env";
import { notifySession } from "./sessionEvents";

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

export const signInWithPassword = (password: string) =>
  authClient.signIn.email({ email: APP_REVIEW_EMAIL, password });

export const signOut = async () => {
  const result = await authClient.signOut();
  if (result.error) throw new Error(result.error.message ?? "Unable to sign out.");
  notifySession("signed-out");
  return result;
};
