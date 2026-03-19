import { describe, it, expect, jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { AuthController } from "@repo/services";
import type { AuthResponse, TokenPair, UserProfile } from "@repo/services";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTokenPair = (): TokenPair => ({
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresIn: 900_000,
  expiresAt: Date.now() + 900_000,
});

const makeAuthResponse = (): AuthResponse => ({
  user: {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    imageUrl: null,
    isEmailVerified: false,
    roles: ["user"],
  },
  tokens: makeTokenPair(),
});

const makeProfile = (): UserProfile => ({
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  firstName: "Test",
  lastName: "User",
  imageUrl: null,
  isEmailVerified: true,
  roles: ["user"],
  createdAt: new Date("2024-01-01"),
});

const makeRes = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

const makeReq = (cookie?: string) => ({
  cookies: cookie ? { refresh_token: cookie } : {},
});

function buildController() {
  const authService = {
    register: jest.fn<() => Promise<AuthResponse>>().mockResolvedValue(makeAuthResponse()),
    login: jest.fn<() => Promise<AuthResponse>>().mockResolvedValue(makeAuthResponse()),
    refreshTokens: jest.fn<() => Promise<TokenPair>>().mockResolvedValue(makeTokenPair()),
    verifyEmail: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    resendVerification: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    forgotPassword: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    resetPassword: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    changePassword: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getMe: jest.fn<() => Promise<UserProfile>>().mockResolvedValue(makeProfile()),
    logout: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === "JWT_REFRESH_EXPIRATION") return "7d";
      return undefined;
    }),
  } as unknown as ConfigService;

  const controller = new AuthController(authService as never, configService);
  return { controller, authService, configService };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AuthController", () => {
  describe("register()", () => {
    it("calls service and sets refresh cookie", async () => {
      const { controller, authService } = buildController();
      const res = makeRes();

      const result = await controller.register(
        { username: "user", email: "test@example.com", password: "Pass1!" },
        res as never
      );

      expect(authService.register).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith("refresh_token", expect.any(String), expect.any(Object));
      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("tokens");
    });
  });

  describe("login()", () => {
    it("calls service and sets refresh cookie", async () => {
      const { controller, authService } = buildController();
      const res = makeRes();

      const result = await controller.login(
        { email: "test@example.com", password: "Pass1!" },
        res as never
      );

      expect(authService.login).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith("refresh_token", expect.any(String), expect.any(Object));
      expect(result.user.email).toBe("test@example.com");
    });
  });

  describe("refresh()", () => {
    it("uses body token when provided", async () => {
      const { controller, authService } = buildController();
      const res = makeRes();
      const req = makeReq();

      await controller.refresh({ refreshToken: "body-token" }, req as never, res as never);

      expect(authService.refreshTokens).toHaveBeenCalledWith("body-token");
      expect(res.cookie).toHaveBeenCalled();
    });

    it("falls back to cookie token when body token absent", async () => {
      const { controller, authService } = buildController();
      const res = makeRes();
      const req = makeReq("cookie-token");

      await controller.refresh({}, req as never, res as never);

      expect(authService.refreshTokens).toHaveBeenCalledWith("cookie-token");
    });

    it("uses empty string when neither body nor cookie", async () => {
      const { controller, authService } = buildController();
      const res = makeRes();
      const req = makeReq();

      await controller.refresh({}, req as never, res as never);

      expect(authService.refreshTokens).toHaveBeenCalledWith("");
    });
  });

  describe("verifyEmail()", () => {
    it("returns success message", async () => {
      const { controller, authService } = buildController();
      const user = { sub: "user-1", email: "test@example.com", username: "testuser", roles: ["user"] };

      const result = await controller.verifyEmail(user as never, { code: "123456" });

      expect(authService.verifyEmail).toHaveBeenCalledWith("user-1", { code: "123456" });
      expect(result).toEqual({ message: "Email verified successfully" });
    });
  });

  describe("resendVerification()", () => {
    it("returns success message", async () => {
      const { controller, authService } = buildController();
      const user = { sub: "user-1", email: "test@example.com", username: "testuser", roles: ["user"] };

      const result = await controller.resendVerification(user as never);

      expect(authService.resendVerification).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({ message: "Verification code sent" });
    });
  });

  describe("forgotPassword()", () => {
    it("always returns generic message", async () => {
      const { controller } = buildController();

      const result = await controller.forgotPassword({ email: "any@example.com" });

      expect(result.message).toContain("If an account exists");
    });
  });

  describe("resetPassword()", () => {
    it("returns success message", async () => {
      const { controller, authService } = buildController();

      const result = await controller.resetPassword({
        email: "test@example.com",
        code: "123456",
        newPassword: "NewPass1!",
      });

      expect(authService.resetPassword).toHaveBeenCalled();
      expect(result).toEqual({ message: "Password reset successfully" });
    });
  });

  describe("changePassword()", () => {
    it("returns success message", async () => {
      const { controller, authService } = buildController();
      const user = { sub: "user-1", email: "test@example.com", username: "testuser", roles: ["user"] };

      const result = await controller.changePassword(user as never, {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
      });

      expect(authService.changePassword).toHaveBeenCalledWith("user-1", expect.any(Object));
      expect(result).toEqual({ message: "Password changed successfully" });
    });
  });

  describe("getMe()", () => {
    it("returns user profile", async () => {
      const { controller, authService } = buildController();
      const user = { sub: "user-1", email: "test@example.com", username: "testuser", roles: ["user"] };

      const result = await controller.getMe(user as never);

      expect(authService.getMe).toHaveBeenCalledWith("user-1");
      expect(result.email).toBe("test@example.com");
    });
  });

  describe("logout()", () => {
    it("calls service and clears cookie", async () => {
      const { controller, authService } = buildController();
      const user = { sub: "user-1", email: "test@example.com", username: "testuser", roles: ["user"] };
      const res = makeRes();

      const result = await controller.logout(user as never, res as never);

      expect(authService.logout).toHaveBeenCalledWith("user-1");
      expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));
      expect(result).toEqual({ message: "Successfully logged out" });
    });
  });
});
