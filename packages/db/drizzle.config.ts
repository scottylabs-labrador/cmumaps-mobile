import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"] ?? "";

// drizzle-kit applies `ssl` only for host credentials. A connection `url` ignores it.
function dbCredentials() {
  let hostname = "";
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    return { url: databaseUrl };
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { url: databaseUrl };
  }

  const parsed = new URL(databaseUrl);
  const port = parsed.port === "" ? undefined : Number(parsed.port);
  const database = decodeURIComponent(parsed.pathname.slice(1));

  return {
    host: parsed.hostname,
    ...(port === undefined ? {} : { port }),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: "require" as const,
  };
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema",
  dialect: "postgresql",
  dbCredentials: dbCredentials(),
});
