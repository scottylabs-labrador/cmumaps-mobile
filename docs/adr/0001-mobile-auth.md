# Mobile sign-in uses the existing Keycloak client

The phone signs in through better-auth on the API, using the same confidential Keycloak client as the website. The app scheme is a better-auth trusted origin. Keycloak `web_origins` stays empty, because the phone never calls Keycloak from a browser. A separate public client with a device PKCE flow was the alternative, and it would have split the session from the website.
