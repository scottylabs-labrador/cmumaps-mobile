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

### Standard commands

- **Lint/check**: `bun run check` (runs turbo check across all packages — combines `tsc -b` + `biome check`)
- **Python lint**: `cd apps/dataflow && uv run lint`
- **Build**: `bun run build`
- **Dev (server + web)**: `bun run dev` sets `VITE_IGNORE_LOGIN=true` and runs `dev:web`. The server still requires login. `bun run dev:web` starts both through Turbo without that flag.
- **Dev (server only)**: `bun run dev:server`
- See `package.json` scripts for the full list.
