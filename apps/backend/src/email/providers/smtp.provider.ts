import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";
import type { IEmailProvider } from "./email-provider.interface.js";

@Injectable()
export class SmtpEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
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
        "SMTP is not fully configured. Emails will be logged only."
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

  async send(params: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.transporter || !this.fromAddress) {
      this.logger.warn(
        `[DRY RUN] Would send email to ${params.to}: "${params.subject}"`
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  }
}
