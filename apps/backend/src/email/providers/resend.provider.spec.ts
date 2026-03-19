import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEmailsSend = jest.fn<
  () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
>().mockResolvedValue({ data: { id: "email-123" }, error: null });

const mockResendInstance = { emails: { send: mockEmailsSend } };
const MockResend = jest.fn(() => mockResendInstance);

await jest.unstable_mockModule("resend", () => ({
  Resend: MockResend,
}));

const { ResendEmailProvider } = await import("./resend.provider.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeConfigService = (overrides: Record<string, string | undefined> = {}) => ({
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

describe("ResendEmailProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmailsSend.mockResolvedValue({ data: { id: "email-123" }, error: null });
  });

  describe("constructor", () => {
    it("does not create Resend client when RESEND_API_KEY is missing", () => {
      new ResendEmailProvider(makeConfigService({ RESEND_FROM: "from@test.com" }) as never);

      expect(MockResend).not.toHaveBeenCalled();
    });

    it("does not create Resend client when RESEND_FROM is missing", () => {
      new ResendEmailProvider(makeConfigService({ RESEND_API_KEY: "key-123" }) as never);

      expect(MockResend).not.toHaveBeenCalled();
    });

    it("creates Resend client when fully configured", () => {
      new ResendEmailProvider(
        makeConfigService({ RESEND_API_KEY: "key-123", RESEND_FROM: "from@test.com" }) as never
      );

      expect(MockResend).toHaveBeenCalledWith("key-123");
    });
  });

  describe("send()", () => {
    it("skips sending (dry run) when not configured", async () => {
      const provider = new ResendEmailProvider(makeConfigService() as never);

      await provider.send(emailParams);

      expect(mockEmailsSend).not.toHaveBeenCalled();
    });

    it("sends email using fromAddress from config (ignores params.from)", async () => {
      const provider = new ResendEmailProvider(
        makeConfigService({ RESEND_API_KEY: "key", RESEND_FROM: "noreply@app.com" }) as never
      );

      await provider.send(emailParams);

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@app.com",
          to: "user@example.com",
          subject: "Test subject",
        })
      );
    });

    it("sends to original recipient when DEV_EMAIL_REDIRECT is not set", async () => {
      const provider = new ResendEmailProvider(
        makeConfigService({ RESEND_API_KEY: "key", RESEND_FROM: "noreply@app.com" }) as never
      );

      await provider.send(emailParams);

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: "user@example.com" })
      );
    });

    it("redirects email to DEV_EMAIL_REDIRECT when set", async () => {
      const provider = new ResendEmailProvider(
        makeConfigService({
          RESEND_API_KEY: "key",
          RESEND_FROM: "noreply@app.com",
          DEV_EMAIL_REDIRECT: "dev@test.com",
        }) as never
      );

      await provider.send(emailParams);

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: "dev@test.com" })
      );
    });

    it("throws when Resend returns an error", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid API key" },
      });

      const provider = new ResendEmailProvider(
        makeConfigService({ RESEND_API_KEY: "key", RESEND_FROM: "noreply@app.com" }) as never
      );

      await expect(provider.send(emailParams)).rejects.toThrow("Resend error: Invalid API key");
    });

    it("passes html and text to the Resend client", async () => {
      const provider = new ResendEmailProvider(
        makeConfigService({ RESEND_API_KEY: "key", RESEND_FROM: "noreply@app.com" }) as never
      );

      await provider.send({ ...emailParams, html: "<b>Hi</b>", text: "Hi" });

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({ html: "<b>Hi</b>", text: "Hi" })
      );
    });
  });
});
