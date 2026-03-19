import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AuthModule, JwtAuthGuard, EMAIL_SERVICE } from "@repo/services";
import { PostHogService } from "@repo/analytics";
import {
  User,
  Role,
  Item,
  ItemDetail,
  UserItem,
  VerificationCode,
} from "@repo/db";
import { TRPCService, AppRouterClass, BasicRouter, AuthRouter, ChatRoomRouter } from "@repo/trpc";
import type { TestContainers } from "./containers.js";
import { getContainerEnv } from "./containers.js";
import { UsersModule } from "../../users/users.module.js";
import { VerificationCodeModule } from "../../verification-code/verification-code.module.js";
import { EmailModule } from "../../email/email.module.js";
import { HealthModule } from "../../health/health.module.js";
export interface TestApp {
  app: INestApplication;
  module: TestingModule;
  trpcService: TRPCService;
}

/**
 * Build a NestJS integration-test application wired to testcontainer databases.
 *
 * Key design decisions:
 * - `TypeOrmModule.forRoot()` uses testcontainer credentials directly (bypasses
 *   the static `dataSourceOptions` from @repo/db that reads env vars at import time).
 * - All three `@Global()` modules (UsersModule, EmailModule, VerificationCodeModule)
 *   are imported so their token providers (USER_REPOSITORY, EMAIL_SERVICE,
 *   VERIFICATION_CODE_SERVICE) are available globally when AuthService is initialised.
 * - `AuthModule` is imported for its auth services (JwtAuthGuard, AuthService, etc.).
 * - tRPC providers are added manually without importing TRPCModule (which would
 *   re-import AuthModule causing a duplicate).
 */
export async function createTestApp(containers: TestContainers): Promise<TestApp> {
  const env = getContainerEnv(containers);

  // Set process.env so ConfigService works correctly
  Object.assign(process.env, env);

  const entities = [User, Role, Item, ItemDetail, UserItem, VerificationCode];

  // No-op stubs — prevent network calls to SMTP and PostHog during tests
  const noopEmailService = {
    sendVerificationCode: async () => undefined,
    sendPasswordResetCode: async () => undefined,
  };

  const noopPostHogService = {
    onModuleInit: () => undefined,
    capture: async () => false,
    captureNonBlocking: () => undefined,
    identify: async () => false,
    identifyNonBlocking: () => undefined,
    groupIdentify: async () => false,
    groupIdentifyNonBlocking: () => undefined,
    flush: async () => false,
    shutdown: async () => undefined,
    isInitialized: () => false,
    getInitError: () => null,
  };

  const module = await Test.createTestingModule({
    imports: [
      // Global config backed by testcontainer env
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => env],
      }),

      // Real PostgreSQL via testcontainer — bypasses static dataSourceOptions
      TypeOrmModule.forRoot({
        type: "postgres",
        host: containers.pg.getHost(),
        port: containers.pg.getMappedPort(5432),
        username: containers.pg.getUsername(),
        password: containers.pg.getPassword(),
        database: containers.pg.getDatabase(),
        entities,
        synchronize: true, // auto-create schema — fine for ephemeral test DB
        logging: false,
      }),

      // @Global() modules — their exports are injected into AuthService
      EmailModule,
      VerificationCodeModule,
      UsersModule,

      // Auth module (provides AuthService, JwtAuthGuard, JWT strategies, etc.)
      AuthModule,

      // Health check endpoint
      HealthModule,
    ],

    providers: [
      // tRPC services — added directly to avoid double-importing AuthModule
      TRPCService,
      AppRouterClass,
      BasicRouter,
      AuthRouter,
      ChatRoomRouter,

      // Apply the JWT guard globally (mirrors production app.module.ts)
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
  })
    .overrideProvider(EMAIL_SERVICE).useValue(noopEmailService)
    .overrideProvider(PostHogService).useValue(noopPostHogService)
    .compile();

  const app = module.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })
  );
  app.enableCors({ origin: "*", credentials: true });

  // Mount tRPC middleware at /trpc
  const trpcService = module.get(TRPCService);
  trpcService.applyMiddleware(app as never);

  await app.init();

  return { app, module, trpcService };
}

/**
 * Tear down the test application and close the DB pool.
 */
export async function destroyTestApp(testApp: TestApp): Promise<void> {
  await testApp.app.close();
}
