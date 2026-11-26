export const associatedDomains = ["applinks:cmumaps.com"];

const PROD_DOMAIN = "cmumaps.com";
const PROD_WEB_ORIGIN = `https://${PROD_DOMAIN}`;
// Cloudflare free tier doesn't support multiple level subdomains,
// so we didn't use api.mobile.cmumaps.com.
const PROD_SERVER_URL = `https://mobile.${PROD_DOMAIN}`;
// Cloudflare Tunnel -> local :8080
const LOCAL_SERVER_URL = `https://local.${PROD_DOMAIN}`;

const serverUrl = (): string => (__DEV__ ? LOCAL_SERVER_URL : PROD_SERVER_URL);

export const env = {
  get serverUrl() {
    return serverUrl().replace(/\/$/, "");
  },
  webOrigin: PROD_WEB_ORIGIN,
};
