import { z } from "zod";

const envSchema = z.object({
  S3_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1).default("cmumaps"),
  S3_ENDPOINT: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(): Env {
  return envSchema.parse(process.env);
}
