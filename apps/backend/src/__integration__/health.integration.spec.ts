import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { startContainers, stopContainers } from "./helpers/containers.js";
import { createTestApp, destroyTestApp, type TestApp } from "./helpers/test-app.js";

describe("Health endpoint (integration)", () => {
  let testApp: TestApp;
  let app: INestApplication;

  beforeAll(async () => {
    const containers = await startContainers();
    testApp = await createTestApp(containers);
    app = testApp.app;
  }, 90_000);

  afterAll(async () => {
    await destroyTestApp(testApp);
    await stopContainers();
  });

  it("GET /health → 200 with status ok", async () => {
    const res = await request(app.getHttpServer()).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});
