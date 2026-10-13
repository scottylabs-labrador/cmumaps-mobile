import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { env } from "@/env";

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
  const path = returnPath.startsWith("/") ? returnPath.slice(1) : returnPath;
  return authClient.signIn.social({
    provider: "keycloak",
    callbackURL: `cmumaps://${path}`,
  });
};

export const signOut = () => authClient.signOut();
