import { describe, expect, it } from "vitest";
import { completedAtFor, completedByFor, computeSubtreeIds, wouldCreateCycle, type AreaRef } from "./hierarchy.js";

// Workshops
//  ├─ Enrollments
//  │   └─ Payments
//  └─ Grading
// Admin (separate root)
const areas: AreaRef[] = [
  { id: "workshops", parentId: null },
  { id: "enrollments", parentId: "workshops" },
  { id: "payments", parentId: "enrollments" },
  { id: "grading", parentId: "workshops" },
  { id: "admin", parentId: null },
];

describe("computeSubtreeIds", () => {
  it("includes the root and every descendant", () => {
    const ids = computeSubtreeIds(areas, "workshops");
    expect(new Set(ids)).toEqual(new Set(["workshops", "enrollments", "payments", "grading"]));
  });

  it("returns just the node itself for a leaf", () => {
    expect(computeSubtreeIds(areas, "payments")).toEqual(["payments"]);
  });

  it("excludes unrelated branches", () => {
    expect(computeSubtreeIds(areas, "workshops")).not.toContain("admin");
  });

  it("handles an unknown id as a lone node", () => {
    expect(computeSubtreeIds(areas, "ghost")).toEqual(["ghost"]);
  });
});

describe("wouldCreateCycle", () => {
  it("blocks moving an area into itself", () => {
    expect(wouldCreateCycle(areas, "workshops", "workshops")).toBe(true);
  });

  it("blocks moving an area into a direct child", () => {
    expect(wouldCreateCycle(areas, "workshops", "enrollments")).toBe(true);
  });

  it("blocks moving an area into a deep descendant", () => {
    expect(wouldCreateCycle(areas, "workshops", "payments")).toBe(true);
  });

  it("allows moving under a sibling", () => {
    expect(wouldCreateCycle(areas, "enrollments", "grading")).toBe(false);
  });

  it("allows moving under an unrelated branch", () => {
    expect(wouldCreateCycle(areas, "workshops", "admin")).toBe(false);
  });

  it("allows moving a descendant to become the ancestor's parent-level sibling", () => {
    // payments under admin is fine — admin is not in payments' subtree
    expect(wouldCreateCycle(areas, "payments", "admin")).toBe(false);
  });
});

describe("completedAtFor", () => {
  const now = new Date("2026-07-27T10:00:00.000Z");

  it("sets a timestamp when the status becomes DONE", () => {
    expect(completedAtFor("DONE", now)).toEqual(now);
  });

  it("clears the timestamp for NOT_STARTED", () => {
    expect(completedAtFor("NOT_STARTED", now)).toBeNull();
  });

  it("clears the timestamp for COOKING", () => {
    expect(completedAtFor("COOKING", now)).toBeNull();
  });
});

describe("completedByFor", () => {
  it("records the acting user when the status becomes DONE", () => {
    expect(completedByFor("DONE", "user-1")).toBe("user-1");
  });

  it("clears the completer for NOT_STARTED", () => {
    expect(completedByFor("NOT_STARTED", "user-1")).toBeNull();
  });

  it("clears the completer for COOKING", () => {
    expect(completedByFor("COOKING", "user-1")).toBeNull();
  });
});
