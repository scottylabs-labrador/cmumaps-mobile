const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost";

export const env = {
  serverUrl: serverUrl.replace(/\/$/, ""),
  webOrigin: "https://maps.scottylabs.org",
};
