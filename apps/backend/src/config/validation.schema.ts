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
  JWT_ACCESS_EXPIRATION: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRATION: Joi.string().default("7d"),

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
});
