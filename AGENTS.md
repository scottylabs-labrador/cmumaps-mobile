# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CMU Maps is a Turborepo monorepo with 3 apps (`apps/mobile`, `apps/server`, `apps/dataflow`) and 2 shared packages (`packages/common`, `packages/db`). See `README.md` for general project info. Domain language lives in `docs/GLOSSARY.md`. ADRs live in `docs/adr/`.

### Services

| Service                        | Port | How to start                                                                                                                                |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (`@cmumaps/db`)     | 5432 | `bun run --filter @cmumaps/db dev` from the repo root. Database `cmumaps` at `postgresql://postgres:donotuseinprod@localhost:5432/cmumaps`. |
| Server (`@cmumaps/server`)     | 8080 | `bun run --filter @cmumaps/server dev` from the repo root                                                                                   |
| Mobile app (`@cmumaps/mobile`) | 8081 | `turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server` from the repo root                                                            |

### Key gotchas

- **`DATABASE_URL` in shell env**: The local connection string is the `local` profile default in both `apps/server/secretspec.toml` and `packages/db/secretspec.toml`. A stale shell `DATABASE_URL` (for example `postgres:5432` from Docker Compose) can still override it. `unset DATABASE_URL` before starting the server or running `bun run --filter @cmumaps/db db:migrate`.
- **`SERVER_PORT`**: The local SecretSpec profile sets `SERVER_PORT` to `8080` because this Mac cannot bind port 80 without sudo. The schema coerces that string. `SERVER_URL` is `http://localhost:8080`.
- **Database**: `@cmumaps/db` owns the Drizzle schema. `bun run --filter @cmumaps/db db:migrate` applies the SQL in `packages/db/drizzle`.
- **Code generation before check/build**: Before running `bun run check` or `bun run build`, generate the server's OpenAPI artifacts: `cd apps/server && bun run tsoa && bun run openapi` (or use `bun run sync` from the root).
- **Pre-commit hooks** (`.vite-hooks/pre-commit`): Runs `editorconfig-checker`, `syncpack lint`, `vp check`, and `uv run lint` for Python when `apps/dataflow` changes. Vite+ installs the hook dispatcher on `prepare`.

### Populating the database

From `apps/dataflow`, `secretspec run -P local -- uv run populate-database` fills the database. The server must already be running. The client requests a Keycloak client-credentials token, and `/populate-table` requires the `cmumaps-admins` group. `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET` come from the OpenBao item `cmumaps-mobile/generated/local`. The local issuer is `https://idp.scottylabs.org/realms/labrador`.

When `S3_ENDPOINT` is unset, populate reads `data/floorplans/` and refills Building, Floor, Room, Alias, Node, and Edge. It leaves Poi untouched. When `S3_ENDPOINT` is set, it reads the same objects from S3, including `floorplans/osm-pois.json`. After populating, restart the server to rebuild the in-memory search index and graph cache.

### Testing the mobile app on the iOS simulator

`turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server` starts the server and Expo together. In dev, the app calls port 8080 on the host Metro reports.

#### Setup

1. `xcode-select -p` prints `/Applications/Xcode.app/Contents/Developer`. Switch with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. `xcrun simctl help` exits 0. If CoreDevice fails to load `_XPCTypeBool` from Mercury, install the matching frameworks with `sudo installer -pkg /Applications/Xcode.app/Contents/Resources/Packages/XcodeSystemResources.pkg -target /`. Accepting the Xcode license leaves that stale framework in place.
3. `xcrun simctl runtime list` shows a Ready disk image. Download this Xcode's runtime with `xcodebuild -downloadPlatform iOS`. Boot a device on that runtime (`xcrun simctl list devices available`, then `xcrun simctl boot <udid>` and `open -a Simulator`). Devices whose runtime profile is missing stay unavailable.
4. The database is populated.
5. Expo Go for this app's SDK is installed on the booted simulator. Take `iosClientUrl` from `sdkVersions` in `https://api.expo.dev/v2/versions/latest`. That tarball is the `.app` contents with no wrapping folder: extract it into a directory whose name ends in `.app`, then `xcrun simctl install booted` that directory. Confirm the first open prompt, then dismiss the Expo developer-menu sheet.

#### Running

1. From the repo root, `turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server`. Done when Expo prints a Metro URL on port 8081 and the server is listening on 8080.
2. Open the project with `xcrun simctl openurl booted exp://127.0.0.1:8081`.
3. Done when the CMU Maps search field is on the map. The location card is the app asking for permission.

### Standard commands

- **Lint/check**: `bun run check` runs `vp check` (Oxfmt, Oxlint, and tsrs typecheck).
- **Python lint**: `cd apps/dataflow && uv run lint`
- **Build**: `bun run build`
- **Dev**: `bun run dev` runs every package `dev` script: Postgres, the server, Expo, web, and the visualizer
- **Dev (server + mobile)**: `turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server`
- **Dev (server only)**: `bun run --filter @cmumaps/server dev`
- See `package.json` scripts for the full list.
