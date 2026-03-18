import { Global, Module } from "@nestjs/common";
import { EMAIL_SERVICE } from "@repo/services";
import { SmtpEmailService } from "./email.service.js";

@Global()
@Module({
  providers: [
    SmtpEmailService,
    {
      provide: EMAIL_SERVICE,
      useExisting: SmtpEmailService,
    },
  ],
  exports: [EMAIL_SERVICE, SmtpEmailService],
})
export class EmailModule {}
