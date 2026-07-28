import { describe, expect, it } from "vitest";
import { isValidPassword, isValidUsername } from "./authValidation.js";

describe("isValidUsername", () => {
  it("accepts letters, numbers, underscore within length bounds", () => {
    expect(isValidUsername("alice")).toBe(true);
    expect(isValidUsername("alice_99")).toBe(true);
    expect(isValidUsername("abc")).toBe(true);
    expect(isValidUsername("a".repeat(24))).toBe(true);
  });

  it("rejects too short or too long usernames", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(25))).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(isValidUsername("alice smith")).toBe(false);
    expect(isValidUsername("alice@example")).toBe(false);
    expect(isValidUsername("alice-99")).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("requires at least 8 characters", () => {
    expect(isValidPassword("ab1!ab1")).toBe(false); // 7 chars
    expect(isValidPassword("ab1!ab12")).toBe(true); // 8 chars
  });

  it("requires at least one digit", () => {
    expect(isValidPassword("abcdefg!")).toBe(false);
    expect(isValidPassword("abcdefg1")).toBe(false); // missing special char
    expect(isValidPassword("abcdefg1!")).toBe(true);
  });

  it("requires at least one special character", () => {
    expect(isValidPassword("abcdefg1")).toBe(false);
    expect(isValidPassword("abcdefg1!")).toBe(true);
    expect(isValidPassword("password123$")).toBe(true);
  });

  it("rejects a password missing both a digit and a special character", () => {
    expect(isValidPassword("onlyletters")).toBe(false);
  });
});
