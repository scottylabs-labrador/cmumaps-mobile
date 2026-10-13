# Local populate uses a Keycloak client

Local campus data is loaded by the dataflow client with a Keycloak client-credentials token. The token audience is the server client id. That token belongs to the client's service account and does not include the `cmumaps-admins` group, so the service account for the configured client is accepted as admin. `IGNORE_LOGIN` is removed. A same-machine exception for the populate routes was rejected.
