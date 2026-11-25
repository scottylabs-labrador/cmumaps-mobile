import Constants from "expo-constants";

const LOCAL_SERVER_PORT = "8080";
const PROD_DOMAIN = "cmumaps.com";
const PROD_WEB_ORIGIN = `https://${PROD_DOMAIN}`;
const PROD_SERVER_URL = `https://api.${PROD_DOMAIN}`;

// Expo's dev host is the Mac running Metro. On a phone, localhost is the phone.
const devServerUrl = (): string => {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (!host) {
    return `http://localhost:${LOCAL_SERVER_PORT}`;
  }
  return `http://${host}:${LOCAL_SERVER_PORT}`;
};

const serverUrl = __DEV__ ? devServerUrl() : PROD_SERVER_URL;

export const env = {
  serverUrl: serverUrl.replace(/\/$/, ""),
  webOrigin: PROD_WEB_ORIGIN,
};
