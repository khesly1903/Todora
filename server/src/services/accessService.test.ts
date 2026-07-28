import { describe, expect, it } from "vitest";
import { roleAtLeast } from "./accessService.js";

describe("roleAtLeast", () => {
  it("OWNER outranks EDITOR and VIEWER", () => {
    expect(roleAtLeast("OWNER", "VIEWER")).toBe(true);
    expect(roleAtLeast("OWNER", "EDITOR")).toBe(true);
    expect(roleAtLeast("OWNER", "OWNER")).toBe(true);
  });

  it("EDITOR outranks VIEWER but not OWNER", () => {
    expect(roleAtLeast("EDITOR", "VIEWER")).toBe(true);
    expect(roleAtLeast("EDITOR", "EDITOR")).toBe(true);
    expect(roleAtLeast("EDITOR", "OWNER")).toBe(false);
  });

  it("VIEWER only satisfies VIEWER", () => {
    expect(roleAtLeast("VIEWER", "VIEWER")).toBe(true);
    expect(roleAtLeast("VIEWER", "EDITOR")).toBe(false);
    expect(roleAtLeast("VIEWER", "OWNER")).toBe(false);
  });
});
