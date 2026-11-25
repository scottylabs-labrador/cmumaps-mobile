import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const repo = github("scottylabs-labrador/cmumaps-mobile", {
    branch: "main",
    checkSuites: false,
  });

  const Postgres = postgres("Postgres");
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("volume");

  const server = service("@cmumaps/server", {
    source: repo,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/apps/server/Dockerfile",
      watchPatterns: ["/apps/server/**", "/packages/common/**", "/packages/db/**"],
    },
    deploy: {
      preDeployCommand: ["bunx drizzle-kit migrate --config=/app/apps/server/drizzle.config.ts"],
      sleepApplication: true,
    },
    networking: { privateNetworkEndpoint: "cmumaps" },
    env: {
      ALLOWED_ORIGINS_REGEX: preserve(),
      AUTH_CLIENT_ID: preserve(),
      AUTH_CLIENT_SECRET: preserve(),
      AUTH_ISSUER: preserve(),
      AUTH_JWKS_URI: preserve(),
      BETTER_AUTH_URL: preserve(),
      DATABASE_URL: "${{Postgres.DATABASE_URL}}",
      SERVER_URL: preserve(),
    },
  });

  // 08:00 UTC is 03:00 or 04:00 in Pittsburgh, before the tables are truncated and refilled.
  const dataflow = service("@cmumaps/dataflow", {
    source: repo,
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "/apps/dataflow/Dockerfile",
    },
    deploy: {
      cronSchedule: "0 8 * * *",
      preDeployCommand: ["bun apps/dataflow/src/populate.ts"],
      restartPolicyType: "NEVER",
      startCommand: "bun apps/dataflow/src/populate.ts",
    },
    env: {
      DATABASE_URL: "${{Postgres.DATABASE_URL}}",
      S3_ACCESS_KEY: preserve(),
      S3_BUCKET: preserve(),
      S3_ENDPOINT: preserve(),
      S3_SECRET_KEY: preserve(),
    },
  });

  return project("CMU Maps", {
    resources: [Postgres, server, dataflow, postgresVolume],
  });
});
