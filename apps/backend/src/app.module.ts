import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@repo/db";
import { AuthModule, JwtAuthGuard, RedisModule } from "@repo/services";
import { AppConfigModule } from "./config/app-config.module.js";
import { UsersModule } from "./users/users.module.js";

import { TRPCModule, TRPCPanelController } from "@repo/trpc";
import { PostHogModule } from "@repo/analytics";
import { WebsocketsModule } from "@repo/websockets/server";
import { HealthModule } from "./health/health.module.js";
import { EmailModule } from "./email/email.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TRPCModule,
    DatabaseModule.forRoot(),
    RedisModule,
    PostHogModule,
    AppConfigModule,
    EmailModule,
    AuthModule,
    UsersModule,
    WebsocketsModule,
    HealthModule,
  ],
  controllers: [TRPCPanelController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
