import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AppEmailService } from "./email.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildService(fromAddress?: string) {
  const provider = {
    send: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === "RESEND_FROM") return fromAddress ?? "noreply@test.com";
      return undefined;
    }),
  };

  const service = new AppEmailService(provider as never, configService as never);
  return { service, provider, configService };
}

const futureDate = () => new Date(Date.now() + 10 * 60 * 1000);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AppEmailService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── sendVerificationCode ───────────────────────────────────────────────────

  describe("sendVerificationCode()", () => {
    it("sends email with correct subject and to address", async () => {
      const { service, provider } = buildService();

      await service.sendVerificationCode({
        email: "user@example.com",
        code: "123456",
        name: "Alice",
        expiresAt: futureDate(),
      });

      expect(provider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Verify your email address",
          from: "noreply@test.com",
        })
      );
    });

    it("includes html and text in the call", async () => {
      const { service, provider } = buildService();

      await service.sendVerificationCode({
        email: "user@example.com",
        code: "654321",
        name: null,
        expiresAt: futureDate(),
      });

      const call = (provider.send as jest.MockedFunction<typeof provider.send>).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call?.["html"]).toBeTruthy();
      expect(call?.["text"]).toBeTruthy();
    });

    it("re-throws provider errors", async () => {
      const { service, provider } = buildService();
      (provider.send as jest.MockedFunction<typeof provider.send>).mockRejectedValue(
        new Error("Provider down")
      );

      await expect(
        service.sendVerificationCode({
          email: "user@example.com",
          code: "123456",
          name: null,
          expiresAt: futureDate(),
        })
      ).rejects.toThrow("Provider down");
    });

    it("uses SMTP_FROM as fallback when RESEND_FROM not set", async () => {
      const provider = { send: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
      const configService = {
        get: jest.fn((key: string) => {
          if (key === "SMTP_FROM") return "smtp@test.com";
          return undefined;
        }),
      };
      const service = new AppEmailService(provider as never, configService as never);

      await service.sendVerificationCode({
        email: "user@example.com",
        code: "123456",
        name: null,
        expiresAt: futureDate(),
      });

      expect(provider.send).toHaveBeenCalledWith(
        expect.objectContaining({ from: "smtp@test.com" })
      );
    });

    it("uses default from address when no config provided", async () => {
      const provider = { send: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
      const configService = { get: jest.fn(() => undefined) };
      const service = new AppEmailService(provider as never, configService as never);

      await service.sendVerificationCode({
        email: "user@example.com",
        code: "123456",
        name: null,
        expiresAt: futureDate(),
      });

      expect(provider.send).toHaveBeenCalledWith(
        expect.objectContaining({ from: "noreply@yourapp.com" })
      );
    });
  });

  // ── sendPasswordResetCode ──────────────────────────────────────────────────

  describe("sendPasswordResetCode()", () => {
    it("sends email with correct subject and to address", async () => {
      const { service, provider } = buildService();

      await service.sendPasswordResetCode({
        email: "user@example.com",
        code: "654321",
        name: "Bob",
        expiresAt: futureDate(),
      });

      expect(provider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Reset your password",
          from: "noreply@test.com",
        })
      );
    });

    it("includes html and text", async () => {
      const { service, provider } = buildService();

      await service.sendPasswordResetCode({
        email: "user@example.com",
        code: "654321",
        name: null,
        expiresAt: futureDate(),
      });

      const call = (provider.send as jest.MockedFunction<typeof provider.send>).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call?.["html"]).toBeTruthy();
      expect(call?.["text"]).toBeTruthy();
    });

    it("re-throws provider errors", async () => {
      const { service, provider } = buildService();
      (provider.send as jest.MockedFunction<typeof provider.send>).mockRejectedValue(
        new Error("Network timeout")
      );

      await expect(
        service.sendPasswordResetCode({
          email: "user@example.com",
          code: "654321",
          name: null,
          expiresAt: futureDate(),
        })
      ).rejects.toThrow("Network timeout");
    });
  });
});
