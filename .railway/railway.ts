import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const repo = github("scottylabs-labrador/cmumaps-mobile", {
    branch: "main",
    checkSuites: false,
  });

  const Postgres = postgres("Postgres");
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume");

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

  return project("CMU Maps", {
    resources: [Postgres, server, postgresVolume],
  });
});
