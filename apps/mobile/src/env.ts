const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost";

export const env = {
  serverUrl: serverUrl.replace(/\/$/, ""),
  ignoreLogin: process.env.EXPO_PUBLIC_IGNORE_LOGIN === "true",
  webOrigin: "https://maps.scottylabs.org",
};
