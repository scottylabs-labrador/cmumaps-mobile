/** biome-ignore-all lint/style/useNamingConvention: environment variables are in all caps */
import process from "node:process";
import { z } from "zod";

// Define the schema as an object with all of the env
// variables and their types
const envSchema = z.object({
  ALLOWED_ORIGINS_REGEX: z.string(),
  APP_REVIEW_EMAIL: z.email().optional(),
  APP_REVIEW_PASSWORD: z.string().min(8).optional(),
  AUTH_CLIENT_ID: z.string(),
  AUTH_CLIENT_SECRET: z.string(),
  AUTH_ISSUER: z.string(),
  AUTH_JWKS_URI: z.string(),
  SERVER_PORT: z.coerce.number().default(80),
  SERVER_URL: z.url(),
});

// Validate `process.env` against our schema and return the result
const env = envSchema.parse(process.env);

// Export the result so we can use it in the project
export { env };
