import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { VerificationCodeService } from "./verification-code.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeCodeRecord = (overrides = {}) => ({
  id: "code-id-1",
  userId: "user-id-1",
  purpose: "email_verification",
  code: "123456",
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  isUsed: false,
  attempts: 0,
  createdAt: new Date(),
  ...overrides,
});

function buildService(recentCount = 0) {
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn<() => Promise<number>>().mockResolvedValue(recentCount),
    }),
    update: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as never),
    save: jest.fn<() => Promise<typeof makeCodeRecord>>().mockResolvedValue(makeCodeRecord() as never),
    findOne: jest.fn<() => Promise<ReturnType<typeof makeCodeRecord> | null>>().mockResolvedValue(makeCodeRecord()),
    increment: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as never),
  };

  const service = new VerificationCodeService(repo as never);
  return { service, repo };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("VerificationCodeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── generateCode ───────────────────────────────────────────────────────────

  describe("generateCode()", () => {
    it("generates a 6-digit code and saves it", async () => {
      const { service, repo } = buildService(0);

      const result = await service.generateCode("user-1", "email_verification");

      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(repo.save).toHaveBeenCalled();
    });

    it("invalidates previous unused codes before generating", async () => {
      const { service, repo } = buildService(0);

      await service.generateCode("user-1", "email_verification");

      expect(repo.update).toHaveBeenCalledWith(
        { userId: "user-1", purpose: "email_verification", isUsed: false },
        { isUsed: true }
      );
    });

    it("throws BadRequestException when rate limit exceeded (3 per hour)", async () => {
      const { service } = buildService(3);

      await expect(
        service.generateCode("user-1", "email_verification")
      ).rejects.toThrow(BadRequestException);
    });

    it("does not throw when count is exactly 2 (below limit)", async () => {
      const { service } = buildService(2);

      await expect(
        service.generateCode("user-1", "email_verification")
      ).resolves.toBeDefined();
    });

    it("generates code for password_reset purpose", async () => {
      const { service, repo } = buildService(0);

      const result = await service.generateCode("user-1", "password_reset");

      expect(result.code).toMatch(/^\d{6}$/);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: "password_reset" })
      );
    });

    it("expiry is approximately 10 minutes in the future", async () => {
      const { service } = buildService(0);
      const before = Date.now();

      const result = await service.generateCode("user-1", "email_verification");

      const tenMinutesMs = 10 * 60 * 1000;
      const expiresIn = result.expiresAt.getTime() - before;
      expect(expiresIn).toBeGreaterThanOrEqual(tenMinutesMs - 100);
      expect(expiresIn).toBeLessThanOrEqual(tenMinutesMs + 100);
    });
  });

  // ── verifyCode ─────────────────────────────────────────────────────────────

  describe("verifyCode()", () => {
    it("verifies a valid code successfully", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(makeCodeRecord({ code: "999999" }) as never);

      await expect(
        service.verifyCode("user-1", "email_verification", "999999")
      ).resolves.toBeUndefined();

      expect(repo.update).toHaveBeenCalledWith("code-id-1", { isUsed: true });
    });

    it("throws BadRequestException when no active code exists", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(null as never);

      await expect(
        service.verifyCode("user-1", "email_verification", "123456")
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when code is expired", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(
        makeCodeRecord({ expiresAt: new Date(Date.now() - 1000) }) as never
      );

      await expect(
        service.verifyCode("user-1", "email_verification", "123456")
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when max attempts (3) exceeded", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(
        makeCodeRecord({ attempts: 3 }) as never
      );

      await expect(
        service.verifyCode("user-1", "email_verification", "123456")
      ).rejects.toThrow(BadRequestException);
    });

    it("increments attempts on wrong code and throws with remaining count", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(
        makeCodeRecord({ code: "999999", attempts: 0 }) as never
      );

      await expect(
        service.verifyCode("user-1", "email_verification", "111111")
      ).rejects.toThrow(BadRequestException);

      expect(repo.increment).toHaveBeenCalledWith({ id: "code-id-1" }, "attempts", 1);
    });

    it("shows 1 attempt remaining message when 2 already used", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(
        makeCodeRecord({ code: "999999", attempts: 1 }) as never
      );

      await expect(
        service.verifyCode("user-1", "email_verification", "111111")
      ).rejects.toThrow(/1 attempt remaining/);
    });

    it("shows plural 'attempts' when multiple remaining", async () => {
      const { service, repo } = buildService();
      (repo.findOne as jest.MockedFunction<typeof repo.findOne>).mockResolvedValue(
        makeCodeRecord({ code: "999999", attempts: 0 }) as never
      );

      await expect(
        service.verifyCode("user-1", "email_verification", "111111")
      ).rejects.toThrow(/2 attempts remaining/);
    });
  });
});
