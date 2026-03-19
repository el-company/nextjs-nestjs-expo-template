import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { TRPCError } from "@trpc/server";
import { startContainers, stopContainers } from "./helpers/containers.js";
import { createTestApp, destroyTestApp, type TestApp } from "./helpers/test-app.js";
import { createTestCaller } from "./helpers/trpc-caller.js";

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

// ─── chatroom (in-memory — no DB needed) ──────────────────────────────────────

describe("tRPC chatroom (integration)", () => {
  it("getRooms returns default rooms on startup", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const rooms = await caller.chatroom.getRooms();
    // ChatRoomRouter constructor creates 2 default rooms
    expect(rooms.length).toBeGreaterThanOrEqual(2);
    expect(rooms[0]).toHaveProperty("id");
    expect(rooms[0]).toHaveProperty("name");
    expect(rooms[0]).toHaveProperty("userCount");
  });

  it("createRoom adds a room and getRoom returns it", async () => {
    const caller = createTestCaller(testApp.trpcService);

    const created = await caller.chatroom.createRoom({ name: "Integration Room" });
    expect(created.name).toBe("Integration Room");
    expect(created.userCount).toBe(0);

    const fetched = await caller.chatroom.getRoom({ id: created.id });
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe("Integration Room");
  });

  it("getRoom throws NOT_FOUND for unknown id", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.chatroom.getRoom({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updateRoomCount changes userCount", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const room = await caller.chatroom.createRoom({ name: "Update Test" });

    const updated = await caller.chatroom.updateRoomCount({ id: room.id, userCount: 5 });
    expect(updated.userCount).toBe(5);
  });

  it("deleteRoom removes the room", async () => {
    const caller = createTestCaller(testApp.trpcService);
    const room = await caller.chatroom.createRoom({ name: "To Delete" });

    const result = await caller.chatroom.deleteRoom({ id: room.id });
    expect(result.success).toBe(true);

    await expect(
      caller.chatroom.getRoom({ id: room.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deleteRoom throws NOT_FOUND for unknown id", async () => {
    const caller = createTestCaller(testApp.trpcService);
    await expect(
      caller.chatroom.deleteRoom({ id: "00000000-0000-0000-0000-000000000000" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
