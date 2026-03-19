import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EmailService } from "@repo/services";
import {
  renderEmailVerificationTemplate,
  emailVerificationPlainText,
} from "./templates/email-verification.template.js";
import {
  renderPasswordResetTemplate,
  passwordResetPlainText,
} from "./templates/password-reset.template.js";
import { EMAIL_PROVIDER } from "./providers/email-provider.interface.js";
import type { IEmailProvider } from "./providers/email-provider.interface.js";

const CODE_EXPIRY_MINUTES = 10;

@Injectable()
export class AppEmailService implements EmailService {
  private readonly logger = new Logger(AppEmailService.name);
  private readonly fromAddress: string;

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: IEmailProvider,
    private readonly configService: ConfigService
  ) {
    this.fromAddress =
      this.configService.get<string>("RESEND_FROM") ||
      this.configService.get<string>("SMTP_FROM") ||
      "noreply@yourapp.com";
  }

  async sendVerificationCode(input: {
    email: string;
    code: string;
    name?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const expiresInMinutes = Math.round(
      (input.expiresAt.getTime() - Date.now()) / 60_000
    ) || CODE_EXPIRY_MINUTES;

    try {
      await this.provider.send({
        to: input.email,
        from: this.fromAddress,
        subject: "Verify your email address",
        html: renderEmailVerificationTemplate({
          code: input.code,
          name: input.name,
          expiresInMinutes,
        }),
        text: emailVerificationPlainText({
          code: input.code,
          name: input.name,
          expiresInMinutes,
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${input.email}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  async sendPasswordResetCode(input: {
    email: string;
    code: string;
    name?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const expiresInMinutes = Math.round(
      (input.expiresAt.getTime() - Date.now()) / 60_000
    ) || CODE_EXPIRY_MINUTES;

    try {
      await this.provider.send({
        to: input.email,
        from: this.fromAddress,
        subject: "Reset your password",
        html: renderPasswordResetTemplate({
          code: input.code,
          name: input.name,
          expiresInMinutes,
        }),
        text: passwordResetPlainText({
          code: input.code,
          name: input.name,
          expiresInMinutes,
        }),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${input.email}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}
