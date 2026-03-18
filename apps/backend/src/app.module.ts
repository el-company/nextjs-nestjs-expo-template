import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@repo/db";
import { AuthModule, RedisModule } from "@repo/services";
import { AppConfigModule } from "./config/app-config.module.js";
import { UsersModule } from "./users/users.module.js";

import { TRPCModule, TRPCPanelController } from "@repo/trpc";
import { PostHogModule } from "@repo/analytics";
import { WebsocketsModule } from "@repo/websockets/server";
import { HealthModule } from "./health/health.module.js";

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
    AuthModule,
    UsersModule,
    WebsocketsModule,
    HealthModule,
  ],
  controllers: [TRPCPanelController],
  providers: [],
})
export class AppModule {}
