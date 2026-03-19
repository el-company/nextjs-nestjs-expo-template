import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type { IEmailProvider } from "./email-provider.interface.js";

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly client: Resend | null;
  private readonly fromAddress: string | null;

  private readonly devRedirect: string | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    const from = this.configService.get<string>("RESEND_FROM");

    this.fromAddress = from || null;
    this.devRedirect =
      this.configService.get<string>("DEV_EMAIL_REDIRECT") || null;

    if (!apiKey || !from) {
      this.logger.warn(
        "Resend is not fully configured (RESEND_API_KEY, RESEND_FROM). Emails will be logged only."
      );
      this.client = null;
      return;
    }

    this.client = new Resend(apiKey);
  }

  async send(params: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.client || !this.fromAddress) {
      this.logger.warn(
        `[DRY RUN] Would send email to ${params.to}: "${params.subject}"`
      );
      return;
    }

    const recipient = this.devRedirect ?? params.to;
    if (this.devRedirect) {
      this.logger.warn(
        `[DEV] Redirecting email from ${params.to} to ${this.devRedirect}`
      );
    }

    const { error } = await this.client.emails.send({
      from: this.fromAddress,
      to: recipient,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
