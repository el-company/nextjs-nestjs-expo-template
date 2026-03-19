import { describe, it, expect } from "@jest/globals";
import { validationSchema } from "./validation.schema.js";

const baseEnv = {
  DB_HOST: "localhost",
  DB_PORT: 5432,
  DB_USERNAME: "postgres",
  DB_PASSWORD: "postgres",
  DB_DATABASE: "app_db",
  JWT_SECRET: "x".repeat(32),
  JWT_REFRESH_SECRET: "y".repeat(32),
  POSTHOG_API_KEY: "ph-test-key",
};

describe("validationSchema", () => {
  it("accepts a minimal valid configuration", () => {
    const { error, value } = validationSchema.validate(baseEnv);

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: "development",
      PORT: 3001,
      JWT_ACCESS_EXPIRATION: "15m",
      JWT_REFRESH_EXPIRATION: "7d",
      WEB_APP_URL: "http://localhost:3000",
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
      POSTHOG_HOST: "https://app.posthog.com",
      USE_REDIS_CACHING: true,
    });
  });

  it("rejects missing required fields", () => {
    const { error } = validationSchema.validate({}, { abortEarly: false });
    expect(error).toBeTruthy();

    const paths = error?.details.map((detail) => String(detail.path[0]));
    expect(paths).toEqual(
      expect.arrayContaining([
        "DB_HOST",
        "DB_PORT",
        "DB_USERNAME",
        "DB_PASSWORD",
        "DB_DATABASE",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "POSTHOG_API_KEY",
      ])
    );
  });

  it("rejects JWT secrets shorter than 32 characters", () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      JWT_SECRET: "short",
    });

    expect(error).toBeTruthy();
  });

  it("rejects invalid web app URL", () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      WEB_APP_URL: "not-a-url",
    });

    expect(error).toBeTruthy();
  });
});
