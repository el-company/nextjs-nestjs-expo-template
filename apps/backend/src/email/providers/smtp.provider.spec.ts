import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSendMail = jest.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({
  messageId: "msg-123",
});

const mockTransporter = { sendMail: mockSendMail };
const mockCreateTransport = jest.fn(() => mockTransporter);

await jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const { SmtpEmailProvider } = await import("./smtp.provider.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeConfigService = (overrides: Record<string, string | number | boolean | undefined> = {}) => ({
  get: jest.fn((key: string) => overrides[key] ?? undefined),
});

const emailParams = {
  to: "user@example.com",
  from: "ignored@test.com",
  subject: "Test subject",
  html: "<p>Hello</p>",
  text: "Hello",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SmtpEmailProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "msg-123" });
  });

  describe("constructor", () => {
    it("does not create transporter when SMTP_HOST is missing", () => {
      new SmtpEmailProvider(makeConfigService({ SMTP_FROM: "from@test.com" }) as never);

      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("does not create transporter when SMTP_FROM is missing", () => {
      new SmtpEmailProvider(makeConfigService({ SMTP_HOST: "smtp.test.com" }) as never);

      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("creates transporter with host and port when fully configured", () => {
      new SmtpEmailProvider(
        makeConfigService({
          SMTP_HOST: "smtp.test.com",
          SMTP_PORT: 587,
          SMTP_FROM: "from@test.com",
        }) as never
      );

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: "smtp.test.com", port: 587 })
      );
    });

    it("includes auth when SMTP_USER is provided", () => {
      new SmtpEmailProvider(
        makeConfigService({
          SMTP_HOST: "smtp.test.com",
          SMTP_FROM: "from@test.com",
          SMTP_USER: "user@test.com",
          SMTP_PASSWORD: "secret",
        }) as never
      );

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { user: "user@test.com", pass: "secret" },
        })
      );
    });

    it("omits auth when SMTP_USER is not provided", () => {
      new SmtpEmailProvider(
        makeConfigService({
          SMTP_HOST: "smtp.test.com",
          SMTP_FROM: "from@test.com",
        }) as never
      );

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ auth: undefined })
      );
    });

    it("enables TLS when SMTP_SECURE is true", () => {
      new SmtpEmailProvider(
        makeConfigService({
          SMTP_HOST: "smtp.test.com",
          SMTP_FROM: "from@test.com",
          SMTP_SECURE: true,
        }) as never
      );

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true })
      );
    });
  });

  describe("send()", () => {
    it("skips sending (dry run) when not configured", async () => {
      const provider = new SmtpEmailProvider(makeConfigService() as never);

      await provider.send(emailParams);

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("sends email using fromAddress from config (ignores params.from)", async () => {
      const provider = new SmtpEmailProvider(
        makeConfigService({ SMTP_HOST: "smtp.test.com", SMTP_FROM: "noreply@app.com" }) as never
      );

      await provider.send(emailParams);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@app.com",
          to: "user@example.com",
          subject: "Test subject",
        })
      );
    });

    it("passes html and text to sendMail", async () => {
      const provider = new SmtpEmailProvider(
        makeConfigService({ SMTP_HOST: "smtp.test.com", SMTP_FROM: "noreply@app.com" }) as never
      );

      await provider.send({ ...emailParams, html: "<b>Hi</b>", text: "Hi" });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ html: "<b>Hi</b>", text: "Hi" })
      );
    });

    it("re-throws errors from nodemailer", async () => {
      mockSendMail.mockRejectedValue(new Error("SMTP connection refused") as never);

      const provider = new SmtpEmailProvider(
        makeConfigService({ SMTP_HOST: "smtp.test.com", SMTP_FROM: "noreply@app.com" }) as never
      );

      await expect(provider.send(emailParams)).rejects.toThrow("SMTP connection refused");
    });
  });
});
