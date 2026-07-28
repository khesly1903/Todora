import { describe, expect, it } from "vitest";
import { isValidName, isValidPassword, isValidUsername } from "./authValidation.js";

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

describe("isValidName", () => {
  it("accepts plain ASCII names", () => {
    expect(isValidName("Alice Smith")).toBe(true);
    expect(isValidName("Bob")).toBe(true);
  });

  it("accepts Unicode letters, including Turkish characters", () => {
    expect(isValidName("Ayşe Öztürk")).toBe(true);
    expect(isValidName("Gökhan Çelik")).toBe(true);
    expect(isValidName("İbrahim Yılmaz")).toBe(true);
  });

  it("accepts hyphens, apostrophes, and periods", () => {
    expect(isValidName("Mary-Jane O'Brien")).toBe(true);
    expect(isValidName("J. R. Tolkien")).toBe(true);
  });

  it("rejects digits and symbols that aren't name punctuation", () => {
    expect(isValidName("Alice123")).toBe(false);
    expect(isValidName("Alice@Smith")).toBe(false);
    expect(isValidName("Alice_Smith")).toBe(false);
  });

  it("rejects empty or whitespace-only names", () => {
    expect(isValidName("")).toBe(false);
    expect(isValidName("   ")).toBe(false);
  });

  it("rejects names over 50 characters", () => {
    expect(isValidName("a".repeat(50))).toBe(true);
    expect(isValidName("a".repeat(51))).toBe(false);
  });
});
