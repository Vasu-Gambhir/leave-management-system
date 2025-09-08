import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_ACCESS_TOKEN: z.string().optional(),

  JWT_SECRET: z.string(),

  EMAIL_SERVICE: z.string().default("gmail"),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),

  // Brevo Configuration (for production)
  BREVO_API_KEY: z.string().optional(),
  BREVO_FROM_EMAIL: z.string().optional(),
  BREVO_FROM_NAME: z.string().optional(),

  MASTER_EMAIL: z.string(),

  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  // Slack (optional)
  // SLACK_BOT_TOKEN: z.string().optional(),
  // SLACK_SIGNING_SECRET: z.string().optional(),
});

const validateConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error("Invalid environment configuration:", error);
    process.exit(1);
  }
};

export const config = validateConfig();

export default config;
