import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: [".env.local", ".env"].find((f) => {
    try {
      require("fs").accessSync(f);
      return f;
    } catch {
      return null;
    }
  }) ?? ".env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );

  process.exit(1);
}

export const env = parsed.data;