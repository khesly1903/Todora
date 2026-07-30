import { describe, expect, it } from "vitest";
import { avatarUrl } from "../avatar";

describe("avatarUrl", () => {
  it("builds a DiceBear adventurer-neutral URL from the user's seed", () => {
    const url = avatarUrl({ id: "user-1", avatarSeed: "abc-123" });
    expect(url).toBe(
      "https://api.dicebear.com/10.x/adventurer-neutral/svg?scale=1.01&backgroundColor=ecad80,9e5622&seed=abc-123",
    );
  });

  it("falls back to the user's id when no seed has been assigned yet", () => {
    const url = avatarUrl({ id: "user-2", avatarSeed: null });
    expect(url).toContain("seed=user-2");
  });

  it("URL-encodes the seed", () => {
    const url = avatarUrl({ id: "user-3", avatarSeed: "a b/c" });
    expect(url).toContain("seed=a%20b%2Fc");
  });
});
