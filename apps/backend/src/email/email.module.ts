import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EMAIL_SERVICE } from "@repo/services";
import { AppEmailService } from "./email.service.js";
import {
  EMAIL_PROVIDER,
} from "./providers/email-provider.interface.js";
import { ResendEmailProvider } from "./providers/resend.provider.js";
import { SmtpEmailProvider } from "./providers/smtp.provider.js";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>("EMAIL_PROVIDER", "resend");
        if (provider === "smtp") {
          return new SmtpEmailProvider(configService);
        }
        return new ResendEmailProvider(configService);
      },
      inject: [ConfigService],
    },
    AppEmailService,
    {
      provide: EMAIL_SERVICE,
      useExisting: AppEmailService,
    },
  ],
  exports: [EMAIL_SERVICE, AppEmailService],
})
export class EmailModule {}
