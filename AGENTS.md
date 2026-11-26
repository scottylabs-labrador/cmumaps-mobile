# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CMU Maps is a Turborepo monorepo with 3 apps (`apps/mobile`, `apps/server`, `apps/dataflow`) and 2 shared packages (`packages/common`, `packages/db`). See `README.md` for general project info. Domain language lives in `docs/GLOSSARY.md`. ADRs live in `docs/adr/`.

### Services

| Service                        | Port | How to start                                                                                                                                |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (`@cmumaps/db`)     | 5432 | `bun run --filter @cmumaps/db dev` from the repo root. Database `cmumaps` at `postgresql://postgres:donotuseinprod@localhost:5432/cmumaps`. |
| Server (`@cmumaps/server`)     | 8080 | `bun run --filter @cmumaps/server dev` from the repo root (also starts Cloudflare Tunnel → `https://local.cmumaps.com`)                     |
| Mobile app (`@cmumaps/mobile`) | 8081 | `turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server` from the repo root                                                            |

### Key gotchas

- **`DATABASE_URL` in shell env**: The local connection string is the `local` profile default in `packages/db/secretspec.toml`. The server and dataflow import the Drizzle client from `@cmumaps/db/client`, which reads that variable. A stale shell `DATABASE_URL` (for example `postgres:5432` from Docker Compose) can still override it. `unset DATABASE_URL` before starting the server or running `bun run --filter @cmumaps/db db:migrate`.
- **`SERVER_PORT` / `SERVER_URL`**: Local listen port is `8080`. Public URL is `https://local.cmumaps.com` via Cloudflare Tunnel (`cloudflared` sidecar in the server `dev` script). Put the tunnel token in Bao as `cmumaps-mobile/local/server` → `TUNNEL_TOKEN` (`brew install cloudflared` once). Keycloak redirect: `https://local.cmumaps.com/api/auth/callback/keycloak`.
- **Database**: `@cmumaps/db` owns the Drizzle schema. `bun run --filter @cmumaps/db db:migrate` applies the SQL in `packages/db/drizzle`.
- **Code generation before check/build**: Before running `bun run check` or building the server, generate the OpenAPI artifacts: `cd apps/server && bun run tsoa && bun run openapi` (or use `bun run sync` from the root).
- **Pre-commit hooks** (`.vite-hooks/pre-commit`): Runs `editorconfig-checker`, `syncpack lint`, and `vp check`. Vite+ installs the hook dispatcher on `prepare`.

### Populating the database

`bun run --filter @cmumaps/dataflow populate` reads `floorplans/buildings.json`, `placements.json`, `floorplans.json`, `all-graph.json`, and `osm-pois.json` from the `cmumaps` S3 bucket and refills Building, Floor, Room, Alias, Node, Edge, and Poi. The server does not need to be running. `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are required. Populate writes through the Drizzle client in `@cmumaps/db`, which reads `DATABASE_URL`. Restart the server afterward so the in-memory search index and graph cache rebuild.

### Testing the mobile app on the iOS simulator

`turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server` starts the server (plus tunnel) and Expo together. In dev, the app calls `https://local.cmumaps.com`.

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

#### Location (Directions from “Your location”)

1. Accept the in-app location prompt (“Enable location”) so Expo Go gets When In Use permission.
2. Set a campus coordinate on the simulator: `xcrun simctl location booted set 40.4433,-79.9436` (or Simulator → Features → Location → Custom Location near campus).
3. After grant, `userPosition` should fill and Directions from “Your location” should return a real route (not 0 ft). Do not rely on an in-app fake GPS for local testing.

#### App Review sign-in (non-Keycloak)

Apple reviewers cannot use CMU Keycloak. Long-press the dial **Sign in** control, enter the review password, and Better Auth signs in with the demo email/password account (`review@cmumaps.com`, enabled and seeded on server boot only when `PASSWORD_SIGN_IN` is set). Local default: `CMUMaps-AppReview-2026`. Set `PASSWORD_SIGN_IN` on Railway for production during review (and put the same value in App Store Connect review notes); unset or empty it to disable password sign-in. A normal tap still opens Keycloak. Zooming into a non-public floor starts Keycloak sign-in immediately (no intermediate prompt).

### Standard commands

- **Lint/check**: `bun run check` runs `vp check` (Oxfmt, Oxlint, and tsrs typecheck).
- **Build (server)**: `cd apps/server && bun run build`
- **Dev**: `bun run dev` runs every package `dev` script: Postgres, the server, and Expo
- **Dev (server + mobile)**: `turbo dev --filter=@cmumaps/mobile --filter=@cmumaps/server`
- **Dev (server only)**: `bun run --filter @cmumaps/server dev`
- See `package.json` scripts for the full list.
