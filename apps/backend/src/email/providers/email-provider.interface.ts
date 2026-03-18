export interface IEmailProvider {
  send(params: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");
