import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_ACCESS_TOKEN: z.string().optional(),

  // JWT
  JWT_SECRET: z.string(),

  // Email
  EMAIL_SERVICE: z.string().default("gmail"),
  EMAIL_USER: z.string(),
  EMAIL_PASS: z.string(),

  // Master User
  MASTER_EMAIL: z.string(),

  // Slack (optional)
  // SLACK_BOT_TOKEN: z.string().optional(),
  // SLACK_SIGNING_SECRET: z.string().optional(),
});

const validateConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error("L Invalid environment configuration:", error);
    process.exit(1);
  }
};

export const config = validateConfig();

export default config;
