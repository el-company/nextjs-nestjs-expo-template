import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "@repo/services";
import type { JwtPayload } from "@repo/services";

describe("JwtStrategy", () => {
  const makeConfigService = (secret: string | undefined) => ({
    get: jest.fn((key: string) => {
      if (key === "JWT_SECRET") return secret;
      return undefined;
    }),
  });

  it("throws if JWT_SECRET is not set", () => {
    expect(() => new JwtStrategy(makeConfigService(undefined) as never)).toThrow(
      "JWT_SECRET environment variable is not set"
    );
  });

  describe("validate()", () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      strategy = new JwtStrategy(makeConfigService("test-secret-32-chars-minimum!!") as never);
    });

    it("returns payload when sub is present", async () => {
      const payload: JwtPayload = {
        sub: "user-id-123",
        email: "test@example.com",
        username: "testuser",
        roles: ["user"],
      };
      const result = await strategy.validate(payload);
      expect(result).toEqual(payload);
    });

    it("throws UnauthorizedException when sub is missing", async () => {
      const payload = { email: "test@example.com" } as JwtPayload;
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
