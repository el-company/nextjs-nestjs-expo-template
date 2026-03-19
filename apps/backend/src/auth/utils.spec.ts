import { describe, it, expect } from "@jest/globals";
import { parseExpiryToMs } from "@repo/services";

describe("parseExpiryToMs", () => {
  it("converts seconds", () => {
    expect(parseExpiryToMs("30s")).toBe(30 * 1000);
  });

  it("converts minutes", () => {
    expect(parseExpiryToMs("15m")).toBe(15 * 60 * 1000);
  });

  it("converts hours", () => {
    expect(parseExpiryToMs("2h")).toBe(2 * 60 * 60 * 1000);
  });

  it("converts days", () => {
    expect(parseExpiryToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("returns default 15m for invalid input", () => {
    expect(parseExpiryToMs("invalid")).toBe(15 * 60 * 1000);
    expect(parseExpiryToMs("")).toBe(15 * 60 * 1000);
    expect(parseExpiryToMs("15x")).toBe(15 * 60 * 1000);
  });

  it("handles large values", () => {
    expect(parseExpiryToMs("1000s")).toBe(1000 * 1000);
  });
});
