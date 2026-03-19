import Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3001),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // JWT Authentication
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRATION: Joi.string().default("7d"),

  // Web app URL (for email links)
  WEB_APP_URL: Joi.string().uri().default("http://localhost:3000"),

  // SMTP configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),
  SMTP_SECURE: Joi.boolean().default(false),

  // Redis configuration
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").optional(),

  // PostHog configuration
  POSTHOG_API_KEY: Joi.string().required(),
  POSTHOG_HOST: Joi.string().uri().default("https://app.posthog.com"),

  // Feature flags
  USE_REDIS_CACHING: Joi.boolean().default(true),

  // Superadmin
  SUPERADMIN_EMAILS: Joi.string().optional(),

  // Email provider
  EMAIL_PROVIDER: Joi.string().valid("resend", "smtp").default("resend"),

  // Resend provider
  RESEND_API_KEY: Joi.string().optional(),
  RESEND_FROM: Joi.string().email().optional(),
  DEV_EMAIL_REDIRECT: Joi.string().email().allow("").optional(),
});
