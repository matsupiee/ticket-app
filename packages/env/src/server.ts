import { fileURLToPath } from "node:url";

import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { z } from "zod";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url).toString()) });
config({
  path: fileURLToPath(new URL("../../../apps/server/.env", import.meta.url).toString()),
});
config();

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    CORS_ORIGIN: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    PORT: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
