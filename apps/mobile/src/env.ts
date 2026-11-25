import Constants from "expo-constants";

const LOCAL_SERVER_PORT = "8080";

// Expo's dev host is the Mac running Metro. On a phone, localhost is the phone.
const devServerUrl = (): string | undefined => {
  if (!__DEV__) {
    return undefined;
  }
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (!host) {
    return undefined;
  }
  return `http://${host}:${LOCAL_SERVER_PORT}`;
};

const serverUrl =
  process.env.EXPO_PUBLIC_SERVER_URL ?? devServerUrl() ?? `http://localhost:${LOCAL_SERVER_PORT}`;

export const env = {
  serverUrl: serverUrl.replace(/\/$/, ""),
  webOrigin: "https://maps.scottylabs.org",
};
