import { describe, it, expect } from "@jest/globals";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  const controller = new HealthController();

  describe("check()", () => {
    it("returns status ok", () => {
      const result = controller.check();
      expect(result.status).toBe("ok");
    });

    it("returns ISO timestamp", () => {
      const result = controller.check();
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it("timestamp is recent (within 1 second)", () => {
      const before = Date.now();
      const result = controller.check();
      const after = Date.now();

      const ts = new Date(result.timestamp).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });
});
