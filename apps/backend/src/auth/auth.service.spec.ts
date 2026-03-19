import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { createHash } from "crypto";
import type { UserEntity, RoleEntity } from "@repo/services";

const bcryptMocks = {
  hash: jest.fn(),
  compare: jest.fn(),
};

await jest.unstable_mockModule("bcrypt", () => ({
  __esModule: true,
  ...bcryptMocks,
}));

const { AuthService } = await import("@repo/services");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRole = (name = "user"): RoleEntity => ({
  id: "role-1",
  name,
  description: null,
});

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: "user-id-1",
  email: "test@example.com",
  username: "testuser",
  passwordHash: "$2b$12$hashedpassword",
  firstName: "Test",
  lastName: "User",
  imageUrl: null,
  isEmailVerified: false,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  refreshToken: null,
  refreshTokenExpires: null,
  roles: [makeRole()],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

const makeUserRepo = () => ({
  findByEmail: jest.fn<() => Promise<UserEntity | null>>().mockResolvedValue(null),
  findByUsername: jest.fn<() => Promise<UserEntity | null>>().mockResolvedValue(null),
  findById: jest.fn<() => Promise<UserEntity | null>>().mockResolvedValue(null),
  findByEmailVerificationToken: jest.fn<() => Promise<UserEntity | null>>().mockResolvedValue(null),
  findByPasswordResetToken: jest.fn<() => Promise<UserEntity | null>>().mockResolvedValue(null),
  create: jest.fn<() => Promise<UserEntity>>().mockResolvedValue(makeUser()),
  update: jest.fn<() => Promise<UserEntity>>().mockResolvedValue(makeUser()),
  getRoleByName: jest.fn<() => Promise<RoleEntity | null>>().mockResolvedValue(makeRole()),
});

const makeJwtService = () => ({
  signAsync: jest.fn<() => Promise<string>>().mockResolvedValue("signed-token"),
  verify: jest.fn().mockReturnValue({ sub: "user-id-1" }),
});

const makeConfigService = () => ({
  get: jest.fn((key: string) => {
    const cfg: Record<string, string> = {
      JWT_ACCESS_EXPIRATION: "15m",
      JWT_REFRESH_EXPIRATION: "7d",
      JWT_REFRESH_SECRET: "test-refresh-secret-must-be-long-enough",
    };
    return cfg[key];
  }),
});

const makeVerificationService = () => ({
  generateCode: jest.fn<() => Promise<{ code: string; expiresAt: Date }>>().mockResolvedValue({
    code: "123456",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  }),
  verifyCode: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

const makeEmailService = () => ({
  sendVerificationCode: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  sendPasswordResetCode: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

function buildService(overrides: {
  userRepo?: ReturnType<typeof makeUserRepo>;
  jwtService?: ReturnType<typeof makeJwtService>;
  configService?: ReturnType<typeof makeConfigService>;
  verificationService?: ReturnType<typeof makeVerificationService> | undefined;
  emailService?: ReturnType<typeof makeEmailService> | undefined;
} = {}) {
  const userRepo = overrides.userRepo ?? makeUserRepo();
  const jwtService = overrides.jwtService ?? makeJwtService();
  const configService = overrides.configService ?? makeConfigService();
  const verificationService = "verificationService" in overrides
    ? overrides.verificationService
    : makeVerificationService();
  const emailService = "emailService" in overrides
    ? overrides.emailService
    : makeEmailService();

  const service = new AuthService(
    userRepo as never,
    jwtService as never,
    configService as never,
    undefined, // analyticsService
    emailService as never,
    verificationService as never
  );

  return { service, userRepo, jwtService, configService, verificationService, emailService };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  beforeEach(() => {
    bcryptMocks.hash.mockResolvedValue("hashed-pw");
    bcryptMocks.compare.mockResolvedValue(true);
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe("register()", () => {
    it("registers a new user successfully", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);
      (userRepo.findByUsername as jest.MockedFunction<typeof userRepo.findByUsername>).mockResolvedValue(null);
      (userRepo.getRoleByName as jest.MockedFunction<typeof userRepo.getRoleByName>).mockResolvedValue(makeRole());
      (userRepo.create as jest.MockedFunction<typeof userRepo.create>).mockResolvedValue(makeUser());
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());

      const result = await service.register({
        username: "testuser",
        email: "test@example.com",
        password: "SecurePass1!",
      });

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("tokens");
      expect(result.user.email).toBe("test@example.com");
    });

    it("throws ConflictException when email already exists", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(makeUser());

      await expect(
        service.register({ username: "newuser", email: "test@example.com", password: "SecurePass1!" })
      ).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException when username already taken", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);
      (userRepo.findByUsername as jest.MockedFunction<typeof userRepo.findByUsername>).mockResolvedValue(makeUser());

      await expect(
        service.register({ username: "testuser", email: "new@example.com", password: "SecurePass1!" })
      ).rejects.toThrow(ConflictException);
    });

    it("throws Error when default user role not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);
      (userRepo.findByUsername as jest.MockedFunction<typeof userRepo.findByUsername>).mockResolvedValue(null);
      (userRepo.getRoleByName as jest.MockedFunction<typeof userRepo.getRoleByName>).mockResolvedValue(null);

      await expect(
        service.register({ username: "testuser", email: "test@example.com", password: "SecurePass1!" })
      ).rejects.toThrow("Default user role not found");
    });

    it("throws ConflictException on unique constraint DB error", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);
      (userRepo.findByUsername as jest.MockedFunction<typeof userRepo.findByUsername>).mockResolvedValue(null);
      (userRepo.getRoleByName as jest.MockedFunction<typeof userRepo.getRoleByName>).mockResolvedValue(makeRole());
      (userRepo.create as jest.MockedFunction<typeof userRepo.create>).mockRejectedValue(
        Object.assign(new Error("Unique violation"), { code: "23505" })
      );

      await expect(
        service.register({ username: "testuser", email: "test@example.com", password: "SecurePass1!" })
      ).rejects.toThrow(ConflictException);
    });

    it("sends verification email after registration", async () => {
      const { service, userRepo, emailService, verificationService } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);
      (userRepo.findByUsername as jest.MockedFunction<typeof userRepo.findByUsername>).mockResolvedValue(null);
      (userRepo.getRoleByName as jest.MockedFunction<typeof userRepo.getRoleByName>).mockResolvedValue(makeRole());
      (userRepo.create as jest.MockedFunction<typeof userRepo.create>).mockResolvedValue(makeUser());
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());

      await service.register({
        username: "testuser",
        email: "test@example.com",
        password: "SecurePass1!",
      });

      expect(verificationService?.generateCode).toHaveBeenCalledWith("user-id-1", "email_verification");
      expect(emailService?.sendVerificationCode).toHaveBeenCalled();
    });

    it("does not fail if email sending throws", async () => {
      const emailSvc = makeEmailService();
      (emailSvc.sendVerificationCode as jest.MockedFunction<typeof emailSvc.sendVerificationCode>)
        .mockRejectedValue(new Error("SMTP error"));

      const { service, userRepo } = buildService({ emailService: emailSvc });
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);
      (userRepo.findByUsername as jest.MockedFunction<typeof userRepo.findByUsername>).mockResolvedValue(null);
      (userRepo.getRoleByName as jest.MockedFunction<typeof userRepo.getRoleByName>).mockResolvedValue(makeRole());
      (userRepo.create as jest.MockedFunction<typeof userRepo.create>).mockResolvedValue(makeUser());
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());

      await expect(
        service.register({ username: "testuser", email: "test@example.com", password: "SecurePass1!" })
      ).resolves.not.toThrow();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("logs in successfully with valid credentials", async () => {
      const { service, userRepo } = buildService();
      const user = makeUser({ isEmailVerified: true });
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(user);
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(user);
      bcryptMocks.compare.mockResolvedValue(true);

      const result = await service.login({ email: "test@example.com", password: "SecurePass1!" });

      expect(result.user.email).toBe("test@example.com");
      expect(result.tokens).toBeDefined();
    });

    it("throws UnauthorizedException when user not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);

      await expect(
        service.login({ email: "nobody@example.com", password: "pass" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password is wrong", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(makeUser());
      bcryptMocks.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: "test@example.com", password: "wrong" })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────────────────

  describe("refreshTokens()", () => {
    it("refreshes tokens with valid refresh token", async () => {
      const { service, userRepo, jwtService } = buildService();
      const hashedToken = createHash("sha256").update("valid-refresh-token").digest("hex");
      const user = makeUser({ refreshToken: hashedToken, refreshTokenExpires: new Date(Date.now() + 60000) });

      (jwtService.verify as jest.MockedFunction<typeof jwtService.verify>).mockReturnValue({ sub: "user-id-1" });
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(user);
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(user);

      const result = await service.refreshTokens("valid-refresh-token");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("throws UnauthorizedException when JWT is invalid", async () => {
      const { service, jwtService } = buildService();
      (jwtService.verify as jest.MockedFunction<typeof jwtService.verify>).mockImplementation(() => {
        throw new Error("invalid token");
      });

      await expect(service.refreshTokens("bad-token")).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user not found", async () => {
      const { service, userRepo, jwtService } = buildService();
      (jwtService.verify as jest.MockedFunction<typeof jwtService.verify>).mockReturnValue({ sub: "user-id-1" });
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(null);

      await expect(service.refreshTokens("some-token")).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when token hash does not match", async () => {
      const { service, userRepo, jwtService } = buildService();
      const user = makeUser({ refreshToken: "different-hash", refreshTokenExpires: new Date(Date.now() + 60000) });
      (jwtService.verify as jest.MockedFunction<typeof jwtService.verify>).mockReturnValue({ sub: "user-id-1" });
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(user);

      await expect(service.refreshTokens("token-that-wont-match")).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when refresh token is expired", async () => {
      const { service, userRepo, jwtService } = buildService();
      const hashedToken = createHash("sha256").update("my-token").digest("hex");
      const user = makeUser({
        refreshToken: hashedToken,
        refreshTokenExpires: new Date(Date.now() - 1000), // expired
      });
      (jwtService.verify as jest.MockedFunction<typeof jwtService.verify>).mockReturnValue({ sub: "user-id-1" });
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(user);

      await expect(service.refreshTokens("my-token")).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe("logout()", () => {
    it("clears refresh token for user", async () => {
      const { service, userRepo } = buildService();
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());

      await service.logout("user-id-1");

      expect(userRepo.update).toHaveBeenCalledWith("user-id-1", {
        refreshToken: null,
        refreshTokenExpires: null,
      });
    });
  });

  // ── getMe ─────────────────────────────────────────────────────────────────

  describe("getMe()", () => {
    it("returns user profile", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(makeUser());

      const result = await service.getMe("user-id-1");

      expect(result.id).toBe("user-id-1");
      expect(result.email).toBe("test@example.com");
      expect(result.roles).toEqual(["user"]);
      expect(result).toHaveProperty("createdAt");
    });

    it("throws NotFoundException when user not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(null);

      await expect(service.getMe("unknown-id")).rejects.toThrow(NotFoundException);
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe("changePassword()", () => {
    it("changes password successfully", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(makeUser());
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());
      bcryptMocks.compare.mockResolvedValue(true);

      await expect(
        service.changePassword("user-id-1", {
          currentPassword: "OldPass1!",
          newPassword: "NewPass1!",
        })
      ).resolves.toBeUndefined();

      expect(userRepo.update).toHaveBeenCalledWith("user-id-1", expect.objectContaining({
        refreshToken: null,
        refreshTokenExpires: null,
      }));
    });

    it("throws NotFoundException when user not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(null);

      await expect(
        service.changePassword("unknown-id", { currentPassword: "old", newPassword: "NewPass1!" })
      ).rejects.toThrow(NotFoundException);
    });

    it("throws UnauthorizedException when current password is wrong", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(makeUser());
      bcryptMocks.compare.mockResolvedValue(false);

      await expect(
        service.changePassword("user-id-1", { currentPassword: "wrong", newPassword: "NewPass1!" })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe("forgotPassword()", () => {
    it("silently returns when email does not exist", async () => {
      const { service, userRepo, emailService } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);

      await expect(service.forgotPassword({ email: "ghost@example.com" })).resolves.toBeUndefined();
      expect(emailService?.sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it("sends reset code when user exists", async () => {
      const { service, userRepo, emailService, verificationService } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(makeUser());

      await service.forgotPassword({ email: "test@example.com" });

      expect(verificationService?.generateCode).toHaveBeenCalledWith("user-id-1", "password_reset");
      expect(emailService?.sendPasswordResetCode).toHaveBeenCalled();
    });

    it("silently swallows email sending errors", async () => {
      const emailSvc = makeEmailService();
      (emailSvc.sendPasswordResetCode as jest.MockedFunction<typeof emailSvc.sendPasswordResetCode>)
        .mockRejectedValue(new Error("Network error"));

      const { service, userRepo } = buildService({ emailService: emailSvc });
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(makeUser());

      await expect(service.forgotPassword({ email: "test@example.com" })).resolves.toBeUndefined();
    });

    it("silently returns when verification service not configured", async () => {
      const { service, userRepo } = buildService({ verificationService: undefined, emailService: undefined });
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(makeUser());

      await expect(service.forgotPassword({ email: "test@example.com" })).resolves.toBeUndefined();
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe("resetPassword()", () => {
    it("resets password successfully", async () => {
      const { service, userRepo, verificationService } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(makeUser());
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());
      (verificationService?.verifyCode as jest.MockedFunction<() => Promise<void>>).mockResolvedValue(undefined);

      await expect(
        service.resetPassword({ email: "test@example.com", code: "123456", newPassword: "NewPass1!" })
      ).resolves.toBeUndefined();
    });

    it("throws BadRequestException when verification service not configured", async () => {
      const { service } = buildService({ verificationService: undefined });

      await expect(
        service.resetPassword({ email: "test@example.com", code: "123456", newPassword: "NewPass1!" })
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when user not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findByEmail as jest.MockedFunction<typeof userRepo.findByEmail>).mockResolvedValue(null);

      await expect(
        service.resetPassword({ email: "ghost@example.com", code: "123456", newPassword: "NewPass1!" })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────────

  describe("verifyEmail()", () => {
    it("verifies email successfully", async () => {
      const { service, userRepo, verificationService } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(
        makeUser({ isEmailVerified: false })
      );
      (userRepo.update as jest.MockedFunction<typeof userRepo.update>).mockResolvedValue(makeUser());
      (verificationService?.verifyCode as jest.MockedFunction<() => Promise<void>>).mockResolvedValue(undefined);

      await expect(service.verifyEmail("user-id-1", { code: "123456" })).resolves.toBeUndefined();

      expect(userRepo.update).toHaveBeenCalledWith("user-id-1", expect.objectContaining({
        isEmailVerified: true,
      }));
    });

    it("throws BadRequestException when verification service not configured", async () => {
      const { service } = buildService({ verificationService: undefined });

      await expect(service.verifyEmail("user-id-1", { code: "123456" })).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when user not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(null);

      await expect(service.verifyEmail("unknown-id", { code: "123456" })).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when email already verified", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(
        makeUser({ isEmailVerified: true })
      );

      await expect(service.verifyEmail("user-id-1", { code: "123456" })).rejects.toThrow(BadRequestException);
    });
  });

  // ── resendVerification ────────────────────────────────────────────────────

  describe("resendVerification()", () => {
    it("resends verification code", async () => {
      const { service, userRepo, emailService, verificationService } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(
        makeUser({ isEmailVerified: false })
      );

      await service.resendVerification("user-id-1");

      expect(verificationService?.generateCode).toHaveBeenCalledWith("user-id-1", "email_verification");
      expect(emailService?.sendVerificationCode).toHaveBeenCalled();
    });

    it("throws BadRequestException when service not configured", async () => {
      const { service } = buildService({ verificationService: undefined, emailService: undefined });

      await expect(service.resendVerification("user-id-1")).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when user not found", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(null);

      await expect(service.resendVerification("unknown-id")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when email already verified", async () => {
      const { service, userRepo } = buildService();
      (userRepo.findById as jest.MockedFunction<typeof userRepo.findById>).mockResolvedValue(
        makeUser({ isEmailVerified: true })
      );

      await expect(service.resendVerification("user-id-1")).rejects.toThrow(BadRequestException);
    });
  });

  // ── validateToken ─────────────────────────────────────────────────────────

  describe("validateToken()", () => {
    it("returns payload for valid token", async () => {
      const { service, jwtService } = buildService();
      const payload = { sub: "user-id-1", email: "test@example.com", username: "testuser", roles: ["user"] };
      jest.spyOn(jwtService, "verify").mockReturnValue(payload as never);

      const result = await service.validateToken("valid-token");
      expect(result).toEqual(payload);
    });

    it("returns null for invalid token", async () => {
      const { service, jwtService } = buildService();
      jest.spyOn(jwtService, "verify").mockImplementation(() => { throw new Error("invalid"); });

      const result = await service.validateToken("bad-token");
      expect(result).toBeNull();
    });
  });
});
