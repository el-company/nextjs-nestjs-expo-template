import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";
import type { EmailService } from "@repo/services";

@Injectable()
export class SmtpEmailService implements EmailService {
  private readonly logger = new Logger(SmtpEmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = this.configService.get<number>("SMTP_PORT", 587);
    const user = this.configService.get<string>("SMTP_USER");
    const password = this.configService.get<string>("SMTP_PASSWORD");
    const secure = this.configService.get<boolean>("SMTP_SECURE", false);
    const from = this.configService.get<string>("SMTP_FROM");

    this.fromAddress = from || null;

    if (!host || !from) {
      this.logger.warn(
        "SMTP is not fully configured. Password reset emails will be logged instead of sent."
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password || "" } : undefined,
    });
  }

  async sendPasswordResetEmail(input: {
    email: string;
    resetToken: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    if (!this.transporter || !this.fromAddress) {
      this.logger.warn(
        `Password reset email for ${input.email} not sent. Reset URL: ${input.resetUrl}`
      );
      return;
    }

    await this.transporter.sendMail({
      to: input.email,
      from: this.fromAddress,
      subject: "Reset your password",
      text: `You requested a password reset. Use the link below to set a new password. This link expires at ${input.expiresAt.toISOString()}.\n\n${input.resetUrl}`,
      html: `
        <p>You requested a password reset.</p>
        <p>This link expires at ${input.expiresAt.toISOString()}.</p>
        <p><a href="${input.resetUrl}">Reset your password</a></p>
      `,
    });
  }
}
