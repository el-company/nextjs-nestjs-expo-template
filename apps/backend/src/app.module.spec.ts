import { describe, it, expect } from "@jest/globals";
import { AppModule } from "./app.module.js";

describe("AppModule", () => {
  it("should be defined", () => {
    expect(AppModule).toBeDefined();
  });
});
