export const associatedDomains = ["applinks:cmumaps.com"];

const LOCAL_SERVER_PORT = "8080";
const PROD_DOMAIN = "cmumaps.com";
const PROD_WEB_ORIGIN = `https://${PROD_DOMAIN}`;
// Cloudflare free tier doesn't support multiple level subdomains,
// so we didn't use api.mobile.cmumaps.com.
const PROD_SERVER_URL = `https://mobile.${PROD_DOMAIN}`;

// Expo's dev host is the Mac running Metro. On a phone, localhost is the phone.
const devServerUrl = (): string => {
  // Loaded on use so app.config can import the domains without starting React Native.
  const constants = (require("expo-constants") as typeof import("expo-constants")).default;
  const host = constants.expoConfig?.hostUri?.split(":")[0];
  if (!host) {
    return `http://localhost:${LOCAL_SERVER_PORT}`;
  }
  return `http://${host}:${LOCAL_SERVER_PORT}`;
};

const serverUrl = (): string => (__DEV__ ? devServerUrl() : PROD_SERVER_URL);

export const env = {
  get serverUrl() {
    return serverUrl().replace(/\/$/, "");
  },
  webOrigin: PROD_WEB_ORIGIN,
};
