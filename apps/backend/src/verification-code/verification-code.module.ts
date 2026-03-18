import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VerificationCode } from "@repo/db";
import { VERIFICATION_CODE_SERVICE } from "@repo/services";
import { VerificationCodeService } from "./verification-code.service.js";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([VerificationCode])],
  providers: [
    VerificationCodeService,
    {
      provide: VERIFICATION_CODE_SERVICE,
      useExisting: VerificationCodeService,
    },
  ],
  exports: [VerificationCodeService, VERIFICATION_CODE_SERVICE],
})
export class VerificationCodeModule {}
