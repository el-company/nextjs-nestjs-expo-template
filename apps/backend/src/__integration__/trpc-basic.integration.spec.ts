import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { TRPCError } from "@trpc/server";
import { startContainers, stopContainers } from "./helpers/containers.js";
import { createTestApp, destroyTestApp, type TestApp } from "./helpers/test-app.js";
import {
  createTestCaller,
  authenticatedCtx,
} from "./helpers/trpc-caller.js";

// ─── Shared state ─────────────────────────────────────────────────────────────

let testApp: TestApp;

beforeAll(async () => {
  const containers = await startContainers();
  testApp = await createTestApp(containers);
}, 90_000);

afterAll(async () => {
  await destroyTestApp(testApp);
  await stopContainers();
});

// ─── basic.hello ──────────────────────────────────────────────────────────────

describe("tRPC basic.hello (integration)", () => {
  it("returns default greeting when no name supplied", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.hello();
    expect(res.greeting).toBe("Hello World");
  });

  it("returns personalised greeting with name", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const res = await caller.hello({ name: "Testcontainers" });
    expect(res.greeting).toBe("Hello Testcontainers");
  });
});

// ─── basic.increment (protected) ──────────────────────────────────────────────

describe("tRPC basic.increment (integration)", () => {
  it("increments number when authenticated", async () => {
    const caller = createTestCaller(
      testApp.trpcService,
      authenticatedCtx("user-1", "test@example.com", "testuser")
    );
    const result = await caller.increment({ value: 41 });
    expect(result).toBe(42);
  });

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(caller.increment({ value: 1 })).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.increment({ value: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─── basic.me (protected) ─────────────────────────────────────────────────────

describe("tRPC basic.me (integration)", () => {
  it("returns user from context when authenticated", async () => {
    const ctx = authenticatedCtx("abc-123", "me@example.com", "me_user");
    const caller = createTestCaller(testApp.trpcService, ctx);
    const res = await caller.me();
    expect(res.user?.id).toBe("abc-123");
    expect(res.user?.email).toBe("me@example.com");
  });

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(caller.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
