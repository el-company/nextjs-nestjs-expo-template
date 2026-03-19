import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPing = jest.fn<() => Promise<string>>().mockResolvedValue("PONG");
const mockOn = jest.fn();
const mockSet = jest.fn<() => Promise<"OK">>().mockResolvedValue("OK");
const mockGet = jest.fn<() => Promise<string | null>>().mockResolvedValue(null);
const mockDel = jest.fn<() => Promise<number>>().mockResolvedValue(1);
const mockExists = jest.fn<() => Promise<number>>().mockResolvedValue(0);
const mockTtl = jest.fn<() => Promise<number>>().mockResolvedValue(100);
const mockExpire = jest.fn<() => Promise<number>>().mockResolvedValue(1);
const mockQuit = jest.fn<() => Promise<"OK">>().mockResolvedValue("OK");

const mockRedisInstance = {
  ping: mockPing,
  on: mockOn,
  set: mockSet,
  get: mockGet,
  del: mockDel,
  exists: mockExists,
  ttl: mockTtl,
  expire: mockExpire,
  quit: mockQuit,
};

const MockRedis = jest.fn(() => mockRedisInstance);

await jest.unstable_mockModule("ioredis", () => ({
  Redis: MockRedis,
}));

const { RedisService } = await import("@repo/services");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeConfigService = (overrides: Record<string, string | number | boolean | undefined> = {}) => ({
  get: jest.fn(<T>(key: string, defaultValue?: T): T | undefined => {
    if (key in overrides) return overrides[key] as T;
    return defaultValue;
  }),
});

function buildService(configOverrides: Record<string, string | number | boolean | undefined> = {}) {
  const configService = makeConfigService(configOverrides);
  const service = new RedisService(configService as never);
  return { service, configService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RedisService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPing.mockResolvedValue("PONG");
    mockGet.mockResolvedValue(null);
    MockRedis.mockImplementation(() => mockRedisInstance);
  });

  // ── onModuleInit ────────────────────────────────────────────────────────────

  describe("onModuleInit()", () => {
    it("connects to Redis on init", async () => {
      const { service } = buildService();

      await service.onModuleInit();

      expect(MockRedis).toHaveBeenCalledTimes(1);
      expect(mockPing).toHaveBeenCalled();
    });

    it("sets isRedisConnected to true after successful connection", async () => {
      const { service } = buildService();

      await service.onModuleInit();

      expect(service.isRedisConnected()).toBe(true);
    });

    it("does not throw when connection fails (logs error instead)", async () => {
      mockPing.mockRejectedValue(new Error("Connection refused") as never);
      const { service } = buildService();

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it("sets isRedisConnected to false when connection fails", async () => {
      mockPing.mockRejectedValue(new Error("Connection refused") as never);
      const { service } = buildService();

      await service.onModuleInit();

      expect(service.isRedisConnected()).toBe(false);
    });

    it("stores connection error when connection fails", async () => {
      mockPing.mockRejectedValue(new Error("ECONNREFUSED") as never);
      const { service } = buildService();

      await service.onModuleInit();

      expect(service.getConnectionError()?.message).toBe("ECONNREFUSED");
    });

    it("uses REDIS_URL when configured", async () => {
      const { service } = buildService({ REDIS_URL: "redis://localhost:6379" });

      await service.onModuleInit();

      expect(MockRedis).toHaveBeenCalledWith(
        expect.objectContaining({ url: "redis://localhost:6379" })
      );
    });

    it("uses host/port when REDIS_URL is not configured", async () => {
      const { service } = buildService({ REDIS_HOST: "myhost", REDIS_PORT: 6380 });

      await service.onModuleInit();

      expect(MockRedis).toHaveBeenCalledWith(
        expect.objectContaining({ host: "myhost", port: 6380 })
      );
    });
  });

  // ── onModuleDestroy ─────────────────────────────────────────────────────────

  describe("onModuleDestroy()", () => {
    it("calls quit on Redis client", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      await service.onModuleDestroy();

      expect(mockQuit).toHaveBeenCalled();
    });

    it("sets isRedisConnected to false after disconnect", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      await service.onModuleDestroy();

      expect(service.isRedisConnected()).toBe(false);
    });
  });

  // ── getClient ───────────────────────────────────────────────────────────────

  describe("getClient()", () => {
    it("returns Redis client when connected", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      expect(service.getClient()).toBe(mockRedisInstance);
    });

    it("throws when not connected", async () => {
      const { service } = buildService();

      expect(() => service.getClient()).toThrow("Redis client not connected");
    });
  });

  // ── getConnectionError ───────────────────────────────────────────────────────

  describe("getConnectionError()", () => {
    it("returns null when no error", async () => {
      const { service } = buildService();

      expect(service.getConnectionError()).toBeNull();
    });
  });

  // ── set ─────────────────────────────────────────────────────────────────────

  describe("set()", () => {
    it("stores a string value with custom TTL", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.set("key1", "value1", 60);

      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith("key1", "value1", "EX", 60);
    });

    it("stores an object as JSON string", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      await service.set("key2", { foo: "bar" });

      expect(mockSet).toHaveBeenCalledWith(
        "key2",
        '{"foo":"bar"}',
        "EX",
        expect.any(Number)
      );
    });

    it("stores without expiry when default TTL is 0 and no TTL given", async () => {
      const { service } = buildService({ REDIS_DEFAULT_TTL: 0 });
      await service.onModuleInit();

      await service.set("key3", "value");

      expect(mockSet).toHaveBeenCalledWith("key3", "value");
    });

    it("returns false when Redis throws", async () => {
      mockSet.mockRejectedValue(new Error("write error") as never);
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.set("key", "val");

      expect(result).toBe(false);
    });
  });

  // ── get ─────────────────────────────────────────────────────────────────────

  describe("get()", () => {
    it("returns string value", async () => {
      mockGet.mockResolvedValue("hello");
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.get("key1");

      expect(result).toBe("hello");
    });

    it("returns null when key does not exist", async () => {
      mockGet.mockResolvedValue(null);
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.get("missing");

      expect(result).toBeNull();
    });

    it("parses JSON when parse=true", async () => {
      mockGet.mockResolvedValue('{"x":42}');
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.get<{ x: number }>("key2", true);

      expect(result).toEqual({ x: 42 });
    });

    it("returns null when JSON parse fails", async () => {
      mockGet.mockResolvedValue("not-valid-json");
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.get("key3", true);

      expect(result).toBeNull();
    });

    it("returns null when Redis throws", async () => {
      mockGet.mockRejectedValue(new Error("read error") as never);
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.get("key");

      expect(result).toBeNull();
    });
  });

  // ── del ─────────────────────────────────────────────────────────────────────

  describe("del()", () => {
    it("deletes key and returns true", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.del("key1");

      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith("key1");
    });

    it("returns false when Redis throws", async () => {
      mockDel.mockRejectedValue(new Error("del error") as never);
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.del("key1");

      expect(result).toBe(false);
    });
  });

  // ── exists ──────────────────────────────────────────────────────────────────

  describe("exists()", () => {
    it("returns true when key exists", async () => {
      mockExists.mockResolvedValue(1);
      const { service } = buildService();
      await service.onModuleInit();

      expect(await service.exists("key1")).toBe(true);
    });

    it("returns false when key does not exist", async () => {
      mockExists.mockResolvedValue(0);
      const { service } = buildService();
      await service.onModuleInit();

      expect(await service.exists("key1")).toBe(false);
    });

    it("returns false when Redis throws", async () => {
      mockExists.mockRejectedValue(new Error("exists error") as never);
      const { service } = buildService();
      await service.onModuleInit();

      expect(await service.exists("key1")).toBe(false);
    });
  });

  // ── ttl ─────────────────────────────────────────────────────────────────────

  describe("ttl()", () => {
    it("returns TTL value", async () => {
      mockTtl.mockResolvedValue(250);
      const { service } = buildService();
      await service.onModuleInit();

      expect(await service.ttl("key1")).toBe(250);
    });

    it("returns -2 when Redis throws", async () => {
      mockTtl.mockRejectedValue(new Error("ttl error") as never);
      const { service } = buildService();
      await service.onModuleInit();

      expect(await service.ttl("key1")).toBe(-2);
    });
  });

  // ── expire ──────────────────────────────────────────────────────────────────

  describe("expire()", () => {
    it("sets expiry and returns true", async () => {
      const { service } = buildService();
      await service.onModuleInit();

      const result = await service.expire("key1", 120);

      expect(result).toBe(true);
      expect(mockExpire).toHaveBeenCalledWith("key1", 120);
    });

    it("returns false when Redis throws", async () => {
      mockExpire.mockRejectedValue(new Error("expire error") as never);
      const { service } = buildService();
      await service.onModuleInit();

      expect(await service.expire("key1", 120)).toBe(false);
    });
  });
});
