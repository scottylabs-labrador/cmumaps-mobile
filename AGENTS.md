# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CMU Maps is a Turborepo monorepo with 4 apps and 3 shared packages. See `README.md` and `.github/CONTRIBUTING.md` for general project info.

### Services

| Service | Port | How to start |
| --- | --- | --- |
| PostgreSQL 18 (Homebrew) | 5432 | Database `cmumaps` at `postgresql://postgres:donotuseinprod@localhost:5432/cmumaps`. `compose.dev.yml` remains for other machines. |
| Server (`@cmumaps/server`) | 8080 | `cd apps/server && secretspec run -P local -- bun run --watch src/server.ts` |
| Web app (`@cmumaps/web`) | 5173 | `cd apps/web && bunx vite --port 5173 --host` |

### Key gotchas

- **`DATABASE_URL` in shell env**: The local connection string is the `local` profile default in `apps/server/secretspec.toml`. A stale shell `DATABASE_URL` (for example `postgres:5432` from Docker Compose) can still override it. `unset DATABASE_URL` before starting the server.
- **`SERVER_PORT`**: The local SecretSpec profile sets `SERVER_PORT` to `8080` because this Mac cannot bind port 80 without sudo. The schema coerces that string. `SERVER_URL` is `http://localhost:8080`.
- **Code generation before lint/build**: Before running `bun run check`, `bun run lint`, `bun run tsc`, or `bun run build`, you must first generate the server's build artifacts: `cd apps/server && bun run db-generate && bun run tsoa && bun run openapi` (or use `bun run sync` from the root).
- **Pre-commit hooks** (`.husky/pre-commit`): Runs `editorconfig-checker`, `syncpack lint`, `biome check`, and `uv run lint` for Python. These are automatically run by husky on commit.

### Populating the database

`bun run db:populate` runs `secretspec run -P local -- uv run populate-database` in `apps/dataflow`. The server must already be running. The client requests a Keycloak client-credentials token, and `/populate-table` requires the `cmumaps-admins` group. `AUTH_CLIENT_ID` and `AUTH_CLIENT_SECRET` come from the OpenBao item `cmumaps-mobile/generated/local`. The local issuer is `https://idp.scottylabs.org/realms/labrador`.

When `S3_ENDPOINT` is unset, populate reads `data/floorplans/` and refills Building, Floor, Room, Alias, Node, and Edge. It leaves Poi untouched. When `S3_ENDPOINT` is set, it reads the same objects from S3, including `floorplans/osm-pois.json`. After populating, restart the server to rebuild the in-memory search index and graph cache.

### Testing the mobile app on the iOS simulator

`bun run dev:mobile` starts the server and Expo together. In dev, the app calls port 8080 on the host Metro reports.

#### Setup

1. `xcode-select -p` prints `/Applications/Xcode.app/Contents/Developer`. Switch with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. `xcrun simctl help` exits 0. If CoreDevice fails to load `_XPCTypeBool` from Mercury, install the matching frameworks with `sudo installer -pkg /Applications/Xcode.app/Contents/Resources/Packages/XcodeSystemResources.pkg -target /`. Accepting the Xcode license leaves that stale framework in place.
3. `xcrun simctl runtime list` shows a Ready disk image. Download this Xcode's runtime with `xcodebuild -downloadPlatform iOS`. Boot a device on that runtime (`xcrun simctl list devices available`, then `xcrun simctl boot <udid>` and `open -a Simulator`). Devices whose runtime profile is missing stay unavailable.
4. The database is populated.
5. Expo Go for this app's SDK is installed on the booted simulator. Take `iosClientUrl` from `sdkVersions` in `https://api.expo.dev/v2/versions/latest`. That tarball is the `.app` contents with no wrapping folder: extract it into a directory whose name ends in `.app`, then `xcrun simctl install booted` that directory. Confirm the first open prompt, then dismiss the Expo developer-menu sheet.

#### Running

1. From the repo root, `bun run dev:mobile`. Done when Expo prints a Metro URL on port 8081 and the server is listening on 8080.
2. Open the project with `xcrun simctl openurl booted exp://127.0.0.1:8081`.
3. Done when the CMU Maps search field is on the map. The location card is the app asking for permission.

### Standard commands

- **Lint/check**: `bun run check` (runs turbo check across all packages — combines `tsc -b` + `biome check`)
- **Python lint**: `cd apps/dataflow && uv run lint`
- **Build**: `bun run build`
- **Dev (server + web)**: `bun run dev` sets `VITE_IGNORE_LOGIN=true` and runs `dev:web`. The server still requires login. `bun run dev:web` starts both through Turbo without that flag.
- **Dev (server only)**: `bun run dev:server`
- See `package.json` scripts for the full list.
