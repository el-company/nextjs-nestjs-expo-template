import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard, RolesGuard } from "@repo/services";
import type { JwtPayload } from "@repo/services";

// ─── JwtAuthGuard ────────────────────────────────────────────────────────────

describe("JwtAuthGuard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeContext = (_isPublic: boolean) => ({
    getHandler: jest.fn(() => ({})),
    getClass: jest.fn(() => ({})),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ headers: {}, cookies: {} })),
      getResponse: jest.fn(() => ({})),
      getNext: jest.fn(),
    })),
    getType: jest.fn(() => "http"),
  });

  it("returns true for @Public endpoints", () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => true),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);
    const ctx = makeContext(true) as never;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("calls super.canActivate for non-public endpoints", () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);
    const ctx = makeContext(false) as never;
    const superProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: unknown) => boolean;
    };
    const superSpy = jest.spyOn(superProto, "canActivate").mockReturnValue(true);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
    expect(superSpy).toHaveBeenCalled();
  });
});

// ─── RolesGuard ──────────────────────────────────────────────────────────────

describe("RolesGuard", () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  const makeContext = (user: Partial<JwtPayload> | null, _requiredRoles?: string[]) => ({
    getHandler: jest.fn(() => ({})),
    getClass: jest.fn(() => ({})),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ user })),
    })),
    // reflector.getAllAndOverride is called with ROLES_KEY + [handler, class]
  });

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("returns true when no roles are required", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined as never);
    const ctx = makeContext({ roles: ["user"] }) as never;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("returns true when required roles is empty array", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([] as never);
    const ctx = makeContext({ roles: ["user"] }) as never;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("returns true when user has the required role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"] as never);
    const ctx = makeContext({ roles: ["admin", "user"] }) as never;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("throws ForbiddenException when user lacks required role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"] as never);
    const ctx = makeContext({ roles: ["user"] }) as never;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user is null", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"] as never);
    const ctx = makeContext(null) as never;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when user has no roles property", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"] as never);
    const ctx = makeContext({} as JwtPayload) as never;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
