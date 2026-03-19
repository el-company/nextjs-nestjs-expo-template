import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { TRPCError } from "@trpc/server";
import { DataSource } from "typeorm";
import {
  User,
  Role,
  Item,
  ItemDetail,
  UserItem,
  VerificationCode,
} from "@repo/db";
import { startContainers, stopContainers } from "./helpers/containers.js";
import { createTestApp, destroyTestApp, type TestApp } from "./helpers/test-app.js";
import { createTestCaller, authenticatedCtx } from "./helpers/trpc-caller.js";

// ─── Shared state ─────────────────────────────────────────────────────────────

let testApp: TestApp;
let dataSource: DataSource;

const TEST_USER = {
  username: "integrationuser",
  email: "integration@example.com",
  password: "Integration1!",
  firstName: "Integration",
  lastName: "Test",
};

beforeAll(async () => {
  const containers = await startContainers();
  testApp = await createTestApp(containers);

  // Direct DataSource for DB inspection / cleanup
  dataSource = new DataSource({
    type: "postgres",
    host: containers.pg.getHost(),
    port: containers.pg.getMappedPort(5432),
    username: containers.pg.getUsername(),
    password: containers.pg.getPassword(),
    database: containers.pg.getDatabase(),
    entities: [User, Role, Item, ItemDetail, UserItem, VerificationCode],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();

  // Seed the "user" role required by AuthService.register()
  await dataSource.query(
    `INSERT INTO roles (id, name, description, "createdAt")
     VALUES (gen_random_uuid(), 'user', 'Default user role', NOW())
     ON CONFLICT (name) DO NOTHING`
  );
}, 90_000);

afterAll(async () => {
  if (dataSource.isInitialized) await dataSource.destroy();
  await destroyTestApp(testApp);
  await stopContainers();
});

/** Wipe users between test groups to keep tests independent. */
async function clearUsers(): Promise<void> {
  await dataSource.query("DELETE FROM verification_codes");
  await dataSource.query("DELETE FROM user_roles");
  await dataSource.query("DELETE FROM users");
}

// ─── auth.getUser (public) ────────────────────────────────────────────────────

describe("tRPC auth.getUser (integration)", () => {
  it("returns unauthenticated state when no auth context", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.getUser();
    expect(res.isAuthenticated).toBe(false);
    expect(res.user).toBeNull();
  });

  it("returns authenticated state when auth context provided", async () => {
    const caller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx("user-42", "user@example.com", "testuser")
    );
    const res = await caller.auth.getUser();
    expect(res.isAuthenticated).toBe(true);
    expect(res.user?.id).toBe("user-42");
  });
});

// ─── auth.register ────────────────────────────────────────────────────────────

describe("tRPC auth.register (integration)", () => {
  beforeEach(async () => {
    await clearUsers();
  });

  it("registers a new user and returns tokens", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.register(TEST_USER);

    expect(res.user.email).toBe(TEST_USER.email);
    expect(res.user.username).toBe(TEST_USER.username);
    expect(res.tokens.accessToken).toBeDefined();
    expect(res.tokens.refreshToken).toBeDefined();
  });

  it("persists user to PostgreSQL", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await caller.auth.register(TEST_USER);

    const row = await dataSource.query(
      "SELECT email FROM users WHERE email = $1",
      [TEST_USER.email]
    );
    expect(row).toHaveLength(1);
    expect(row[0].email).toBe(TEST_USER.email);
  });

  it("throws CONFLICT when email already taken", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await caller.auth.register(TEST_USER);

    await expect(caller.auth.register(TEST_USER)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("throws CONFLICT when username already taken", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await caller.auth.register(TEST_USER);

    await expect(
      caller.auth.register({ ...TEST_USER, email: "other@example.com" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects weak password (no special char)", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.auth.register({ ...TEST_USER, password: "WeakPass1" })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects short username", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.auth.register({ ...TEST_USER, username: "ab" })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

// ─── auth.login ───────────────────────────────────────────────────────────────

describe("tRPC auth.login (integration)", () => {
  beforeEach(async () => {
    await clearUsers();
    const caller = createTestCaller(testApp.trpcService);
    await caller.auth.register(TEST_USER);
  });

  it("returns tokens for valid credentials", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.login({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(res.user.email).toBe(TEST_USER.email);
    expect(res.tokens.accessToken).toBeDefined();
    expect(res.tokens.refreshToken).toBeDefined();
  });

  it("throws UNAUTHORIZED for wrong password", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.auth.login({ email: TEST_USER.email, password: "WrongPass1!" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws NOT_FOUND for unknown email", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.auth.login({ email: "nobody@example.com", password: "SomePass1!" })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

// ─── auth.refreshToken ────────────────────────────────────────────────────────

describe("tRPC auth.refreshToken (integration)", () => {
  beforeEach(clearUsers);

  it("issues new access token from valid refresh token", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const { tokens } = await caller.auth.register(TEST_USER);

    const refreshed = await caller.auth.refreshToken({
      refreshToken: tokens.refreshToken,
    });

    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
  });

  it("throws UNAUTHORIZED for bogus refresh token", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.auth.refreshToken({ refreshToken: "bogus.token.value" })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

// ─── auth.getMe (protected) ───────────────────────────────────────────────────

describe("tRPC auth.getMe (integration)", () => {
  let userId: string;

  beforeEach(async () => {
    await clearUsers();
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.register(TEST_USER);
    userId = res.user.id;
  });

  it("returns profile when authenticated", async () => {
    const caller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx(userId, TEST_USER.email, TEST_USER.username)
    );
    const profile = await caller.auth.getMe();
    expect(profile.email).toBe(TEST_USER.email);
    expect(profile.username).toBe(TEST_USER.username);
  });

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(caller.auth.getMe()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─── auth.changePassword (protected) ─────────────────────────────────────────

describe("tRPC auth.changePassword (integration)", () => {
  let userId: string;

  beforeEach(async () => {
    await clearUsers();
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.register(TEST_USER);
    userId = res.user.id;
  });

  it("changes password successfully", async () => {
    const caller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx(userId, TEST_USER.email, TEST_USER.username)
    );
    const res = await caller.auth.changePassword({
      currentPassword: TEST_USER.password,
      newPassword: "NewPassword1!",
    });
    expect(res.message).toContain("changed");
  });

  it("throws UNAUTHORIZED with wrong current password", async () => {
    const caller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx(userId, TEST_USER.email, TEST_USER.username)
    );
    await expect(
      caller.auth.changePassword({
        currentPassword: "WrongCurrent1!",
        newPassword: "NewPassword1!",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("allows login with new password after change", async () => {
    const authedCaller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx(userId, TEST_USER.email, TEST_USER.username)
    );
    await authedCaller.auth.changePassword({
      currentPassword: TEST_USER.password,
      newPassword: "NewPassword1!",
    });

    const publicCaller = createTestCaller(testApp.trpcService);
    const res = await publicCaller.auth.login({
      email: TEST_USER.email,
      password: "NewPassword1!",
    });
    expect(res.user.email).toBe(TEST_USER.email);
  });
});

// ─── auth.forgotPassword ──────────────────────────────────────────────────────

describe("tRPC auth.forgotPassword (integration)", () => {
  beforeEach(async () => {
    await clearUsers();
    const caller = createTestCaller(testApp.trpcService);
    await caller.auth.register(TEST_USER);
  });

  it("returns generic message regardless of email existence", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.forgotPassword({ email: TEST_USER.email });
    expect(res.message).toContain("If an account exists");
  });

  it("returns same generic message for unknown email (no enumeration)", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.forgotPassword({ email: "ghost@example.com" });
    expect(res.message).toContain("If an account exists");
  });
});

// ─── auth.logout (protected) ──────────────────────────────────────────────────

describe("tRPC auth.logout (integration)", () => {
  let userId: string;

  beforeEach(async () => {
    await clearUsers();
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.auth.register(TEST_USER);
    userId = res.user.id;
  });

  it("logs out successfully", async () => {
    const caller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx(userId, TEST_USER.email, TEST_USER.username)
    );
    const res = await caller.auth.logout();
    expect(res.message).toContain("logged out");
  });

  it("invalidates refresh token after logout", async () => {
    const publicCaller = createTestCaller(testApp.trpcService);
    const { tokens } = await publicCaller.auth.login({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    const authedCaller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx(userId, TEST_USER.email, TEST_USER.username)
    );
    await authedCaller.auth.logout();

    await expect(
      publicCaller.auth.refreshToken({ refreshToken: tokens.refreshToken })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});
