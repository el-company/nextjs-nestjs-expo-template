import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { UnauthorizedException } from "@nestjs/common";
import { JwtRefreshStrategy } from "@repo/services";
import type { JwtRefreshPayload } from "@repo/services";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeConfigService = (secret: string | undefined) => ({
  get: jest.fn((key: string) => {
    if (key === "JWT_REFRESH_SECRET") return secret;
    return undefined;
  }),
});

const makeRequest = (overrides: { cookies?: Record<string, string>; body?: Record<string, string> } = {}) => ({
  cookies: overrides.cookies ?? {},
  body: overrides.body ?? {},
});

const basePayload: JwtRefreshPayload = {
  sub: "user-id-123",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("JwtRefreshStrategy", () => {
  it("throws if JWT_REFRESH_SECRET is not set", () => {
    expect(() => new JwtRefreshStrategy(makeConfigService(undefined) as never)).toThrow(
      "JWT_REFRESH_SECRET environment variable is not set"
    );
  });

  describe("validate()", () => {
    let strategy: JwtRefreshStrategy;

    beforeEach(() => {
      strategy = new JwtRefreshStrategy(makeConfigService("test-refresh-secret-32-chars!!") as never);
    });

    it("returns payload with refreshToken from cookie", async () => {
      const req = makeRequest({ cookies: { refresh_token: "cookie-token-xyz" } });

      const result = await strategy.validate(req as never, basePayload);

      expect(result).toEqual({ ...basePayload, refreshToken: "cookie-token-xyz" });
    });

    it("returns payload with refreshToken from body when no cookie", async () => {
      const req = makeRequest({ body: { refreshToken: "body-token-xyz" } });

      const result = await strategy.validate(req as never, basePayload);

      expect(result).toEqual({ ...basePayload, refreshToken: "body-token-xyz" });
    });

    it("prefers cookie token over body token", async () => {
      const req = makeRequest({
        cookies: { refresh_token: "cookie-token" },
        body: { refreshToken: "body-token" },
      });

      const result = await strategy.validate(req as never, basePayload);

      expect(result.refreshToken).toBe("cookie-token");
    });

    it("throws UnauthorizedException when sub is missing", async () => {
      const req = makeRequest({ cookies: { refresh_token: "token" } });
      const badPayload = { ...basePayload, sub: "" } as JwtRefreshPayload;

      await expect(strategy.validate(req as never, badPayload)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when refresh token not found", async () => {
      const req = makeRequest();

      await expect(strategy.validate(req as never, basePayload)).rejects.toThrow(
        "Refresh token not found"
      );
    });
  });
});
