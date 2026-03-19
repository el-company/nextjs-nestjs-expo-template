import { describe, it, expect } from "@jest/globals";
import {
  renderEmailVerificationTemplate,
  emailVerificationPlainText,
} from "./email-verification.template.js";
import {
  renderPasswordResetTemplate,
  passwordResetPlainText,
} from "./password-reset.template.js";

describe("email templates", () => {
  describe("email verification", () => {
    it("renders greeting, code, and expiry in HTML", () => {
      const html = renderEmailVerificationTemplate({
        code: "123456",
        name: "Alice",
        expiresInMinutes: 15,
      });

      expect(html).toContain("Verify your email address");
      expect(html).toContain("Hi Alice");
      expect(html).toContain("123456");
      expect(html).toContain("15 minutes");
    });

    it("falls back to generic greeting when name is missing", () => {
      const html = renderEmailVerificationTemplate({
        code: "654321",
        name: null,
        expiresInMinutes: 30,
      });

      expect(html).toContain("Hi there");
      expect(html).toContain("654321");
      expect(html).toContain("30 minutes");
    });

    it("generates consistent plain text output", () => {
      const text = emailVerificationPlainText({
        code: "999999",
        name: "Taylor",
        expiresInMinutes: 10,
      });

      expect(text).toContain("Verify your email address");
      expect(text).toContain("Hi Taylor,");
      expect(text).toContain("999999");
      expect(text).toContain("10 minutes");
    });
  });

  describe("password reset", () => {
    it("renders greeting, code, and expiry in HTML", () => {
      const html = renderPasswordResetTemplate({
        code: "111222",
        name: "Jordan",
        expiresInMinutes: 20,
      });

      expect(html).toContain("Reset your password");
      expect(html).toContain("Hi Jordan");
      expect(html).toContain("111222");
      expect(html).toContain("20 minutes");
    });

    it("falls back to generic greeting when name is missing", () => {
      const html = renderPasswordResetTemplate({
        code: "333444",
        name: undefined,
        expiresInMinutes: 25,
      });

      expect(html).toContain("Hi there");
      expect(html).toContain("333444");
      expect(html).toContain("25 minutes");
    });

    it("generates consistent plain text output", () => {
      const text = passwordResetPlainText({
        code: "777888",
        name: null,
        expiresInMinutes: 5,
      });

      expect(text).toContain("Reset your password");
      expect(text).toContain("Hi there,");
      expect(text).toContain("777888");
      expect(text).toContain("5 minutes");
    });
  });
});
