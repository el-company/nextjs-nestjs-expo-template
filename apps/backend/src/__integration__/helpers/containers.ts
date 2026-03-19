import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";

export interface TestContainers {
  pg: StartedPostgreSqlContainer;
  redis: StartedRedisContainer;
}

let containers: TestContainers | null = null;

/**
 * Start PostgreSQL and Redis testcontainers.
 * Containers are shared across all integration tests in a suite.
 */
export async function startContainers(): Promise<TestContainers> {
  if (containers) return containers;

  const [pg, redis] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test_db")
      .withUsername("test_user")
      .withPassword("test_password")
      .start(),

    new RedisContainer("redis:7-alpine").start(),
  ]);

  containers = { pg, redis };
  return containers;
}

/**
 * Stop all running testcontainers.
 * Call this in afterAll() to clean up.
 */
export async function stopContainers(): Promise<void> {
  if (!containers) return;
  await Promise.all([containers.pg.stop(), containers.redis.stop()]);
  containers = null;
}

/**
 * Return env vars for NestJS ConfigService pointing to testcontainers.
 */
export function getContainerEnv(c: TestContainers): Record<string, string | boolean | number> {
  return {
    NODE_ENV: "test",
    PORT: 3099,

    // Database
    DB_HOST: c.pg.getHost(),
    DB_PORT: c.pg.getMappedPort(5432),
    DB_USERNAME: c.pg.getUsername(),
    DB_PASSWORD: c.pg.getPassword(),
    DB_DATABASE: c.pg.getDatabase(),

    // Redis — boolean false so ConfigService.get<boolean>() returns false,
    // preventing TRPCService from creating an ioredis client in tests.
    REDIS_HOST: c.redis.getHost(),
    REDIS_PORT: c.redis.getMappedPort(6379),
    REDIS_PASSWORD: "",
    USE_REDIS_CACHING: false,

    // JWT (test secrets — long enough for Joi min-32)
    JWT_SECRET: "test-jwt-secret-that-is-long-enough-32c",
    JWT_REFRESH_SECRET: "test-refresh-secret-that-is-long-enough-32c",
    JWT_ACCESS_EXPIRATION: "15m",
    JWT_REFRESH_EXPIRATION: "7d",

    // Email — disabled in tests
    EMAIL_PROVIDER: "smtp",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_USER: "test",
    SMTP_PASSWORD: "test",
    SMTP_FROM: "test@example.com",
    SMTP_SECURE: "false",

    // PostHog — disabled in tests
    POSTHOG_API_KEY: "test-posthog-key",
    POSTHOG_HOST: "http://localhost:9999",

    WEB_APP_URL: "http://localhost:3000",
  };
}
