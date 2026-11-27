# AGENTS.md

## Cursor Cloud specific instructions

### Overview

CMU Maps is a Turborepo monorepo with apps under `apps/` (`mobile`, `server`, `dataflow`) and packages under `packages/` (`common`, `db`, `openapi-codegen`). See `README.md` for general project info. Domain language lives in `docs/GLOSSARY.md`. ADRs live in `docs/adr/`.

### Design reference

For mobile UI changes, inspect the relevant frames in [CMU Maps Figma — Mobile Interface](https://www.figma.com/design/4hihRwPsE7JDWI21q72B03/CMU-Maps?node-id=5185-25326) before adjusting layout or alignment. Use the specific screen's geometry as the reference; the map frame `4898:27303` places the 48-point plus button 32 points from the left edge with its icon centered.

### Services

| Service                        | Port | How to start                                                                                                                                |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (`@cmumaps/db`)     | 5432 | `bun run --filter @cmumaps/db dev` from the repo root. Database `cmumaps` at `postgresql://postgres:donotuseinprod@localhost:5432/cmumaps`. |
| Server (`@cmumaps/server`)     | 8080 | `bun run --filter @cmumaps/server dev` from the repo root (also starts Cloudflare Tunnel → `https://local.cmumaps.com`)                     |
| Mobile app (`@cmumaps/mobile`) | 8081 | `turbo dev` from the repo root (starts the full project)                                                                                    |

**Default startup:** Run `unset DATABASE_URL && turbo dev` from the repo root to start the full project (Postgres compose, server+tunnel, Expo). `bun run dev` is equivalent. Use filtered or service-only commands only when explicitly requested or when restarting a failed service while the rest of the stack is already running.

### Key gotchas

- **`DATABASE_URL` in shell env**: The local connection string is the `local` profile default in `packages/db/secretspec.toml`. The server and dataflow import the Drizzle client from `@cmumaps/db/client`, which reads that variable. A stale shell `DATABASE_URL` (for example `postgres:5432` from Docker Compose) can still override it. `unset DATABASE_URL` before starting the server or running `bun run --filter @cmumaps/db db:migrate`.
- **`SERVER_PORT` / `SERVER_URL`**: Local listen port is `8080`. Public URL is `https://local.cmumaps.com` via Cloudflare Tunnel (`cloudflared` sidecar in the server `dev` script). Put the tunnel token in Bao as `cmumaps-mobile/local/server` → `TUNNEL_TOKEN` (`brew install cloudflared` once). Keycloak redirect: `https://local.cmumaps.com/api/auth/callback/keycloak`. Smoke-test with `curl -sS https://local.cmumaps.com/` → `{"status":"ok"}` (HTTP 530 means the tunnel process is down).
- **Database**: `@cmumaps/db` owns the Drizzle schema. `bun run --filter @cmumaps/db db:migrate` applies the SQL in `packages/db/drizzle`.
- **Code generation before check/build**: Before running `bun run check` or building the server, generate the OpenAPI artifacts: `cd apps/server && bun run tsoa && bun run openapi` (or use `bun run sync` from the root).
- **Pre-commit hooks** (`.vite-hooks/pre-commit`): Runs `editorconfig-checker`, `bun run syncpack` (`syncpack lint`), and `vp check`. Vite+ installs the hook dispatcher on `prepare`.

### Populating the database

`bun run --filter @cmumaps/dataflow populate` reads `floorplans/buildings.json`, `placements.json`, `floorplans.json`, `all-graph.json`, and `osm-pois.json` from the `cmumaps` S3 bucket and refills Building, Floor, Room, Alias, Node, Edge, and Poi. The server does not need to be running. `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are required. Populate writes through the Drizzle client in `@cmumaps/db`, which reads `DATABASE_URL`. Restart the server afterward so the in-memory search index and graph cache rebuild.

### Testing the mobile app on the iOS simulator (Device Hub)

In `__DEV__`, the app calls `https://local.cmumaps.com` (see `apps/mobile/src/env.ts`). Keep server+tunnel up while testing auth or API-backed UI.

Xcode 27 ships **Device Hub** instead of Simulator.app (`open -a Simulator` fails on this toolchain). Path: `$(xcode-select -p)/../Applications/DeviceHub.app`. Process name: `DeviceHub`. It is the live window for viewing and tapping the booted simulator.

#### Setup

1. `xcode-select -p` prints `/Applications/Xcode.app/Contents/Developer`. Switch with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. `xcrun simctl help` exits 0. If CoreDevice fails to load `_XPCTypeBool` from Mercury, install the matching frameworks with `sudo installer -pkg /Applications/Xcode.app/Contents/Resources/Packages/XcodeSystemResources.pkg -target /`. Accepting the Xcode license leaves that stale framework in place.
3. `xcrun simctl runtime list` shows a Ready disk image. Download this Xcode's runtime with `xcodebuild -downloadPlatform iOS`. Boot a device on that runtime (`xcrun simctl list devices available`, then `xcrun simctl boot <udid>`). Devices whose runtime profile is missing stay unavailable.
4. Open Device Hub: `open "$(xcode-select -p)/../Applications/DeviceHub.app"`. Select the booted simulator in the sidebar (filter: Simulators). If it is stopped, Start it. Expand the compact window when you need the sidebar or inspector.
5. The database is populated.
6. Expo Go for **SDK 58** (matches `apps/mobile` `expo`) is installed on the booted simulator. Take `sdkVersions["58.0.0"].iosClientUrl` from `https://api.expo.dev/v2/versions/latest` (do not grab a newer SDK’s client). That tarball is the `.app` contents with no wrapping folder: extract it into a directory whose name ends in `.app`, then `xcrun simctl install booted` that directory. Confirm the first open prompt in Device Hub, then dismiss the Expo developer-menu sheet.

#### Running

1. Start the full project using the default startup command above. Done when Expo prints a Metro URL on port 8081, the server listens on 8080, and `curl -sS https://local.cmumaps.com/` returns ok. Do not wrap mobile in `secretspec run` — that package has no SecretSpec secrets.
2. Open the project with `xcrun simctl openurl booted exp://127.0.0.1:8081`.
3. In Device Hub, accept Expo Go’s **Open?** dialog if it appears, then the location permission card (**Allow While Using App** or **Not Now**).
4. Done when the CMU Maps search field is on the map.

#### Screenshots and taps

- **Framebuffer (source of truth for app pixels):** `xcrun simctl io booted screenshot /tmp/cmumaps-sim.png`, then `Read` that PNG. Prefer this over Mac `screencapture` of the Device Hub window — Cursor often covers Device Hub, so a window grab shows the IDE instead of the phone.
- **Bring Device Hub above Cursor before clicking:** `osascript -e 'tell application "DeviceHub" to activate'` (or JXA `Application("System Events").processes.byName("DeviceHub").frontmost = true`).
- **AX tree has no phone UI.** Device Hub exposes toolbar/sidebar chrome only; Expo/React Native controls are not accessibility targets. Tap via synthetic mouse events (`CGEvent` in JXA) into the device pane.
- **Device pane is not window-centered when the sidebar is open.** With the left “Available” sidebar visible, the phone framebuffer sits in the **right** half of the Device Hub window (measure once from a Device Hub screenshot taken while it is frontmost). Map iPhone logical points (~402×874 on iPhone 17 Pro) into that rect, then `CGEventPost` left-click. Re-measure after resizing Device Hub.
- **Two gears:** the blue top-right control is Expo Go’s developer menu; the white bottom-left ⚙ is the app account menu (sign in / sign out).

#### Location (Directions from “Your location”)

1. Accept the in-app location prompt (“Enable location”) so Expo Go gets When In Use permission.
2. Set a campus coordinate on the simulator: `xcrun simctl location booted set 40.4433,-79.9436` (or Simulator → Features → Location → Custom Location near campus).
3. After grant, `userPosition` should fill and Directions from “Your location” should return a real route (not 0 ft). Do not rely on an in-app fake GPS for local testing.

#### App Review sign-in (non-Keycloak)

Apple reviewers cannot use CMU Keycloak. Long-press the dial **Sign in** control, enter the review password, and Better Auth signs in with the demo email/password account (`review@cmumaps.com`, enabled and seeded on server boot only when `PASSWORD_SIGN_IN` is set). Local default: `CMUMaps-AppReview-2026`. Set `PASSWORD_SIGN_IN` on Railway for production during review (and put the same value in App Store Connect review notes); unset or empty it to disable password sign-in. A normal tap still opens Keycloak. Tapping search while signed out, or zooming into a non-public floor, shows a login modal (Sign in / Close); Close lets search continue for the session and skips re-prompting that building until you leave it.

### Standard commands

- **Lint/check**: `bun run check` runs `vp check` (Oxfmt, Oxlint, and tsrs typecheck).
- **Build (server)**: `cd apps/server && bun run build`
- **Dev**: Follow **Default startup** under Services.
- See `package.json` scripts for the full list.
