import { describe, expect, it } from "vitest";
import {
  buildTree,
  countSubtree,
  deletionImpact,
  findPath,
  groupTasksByArea,
  splitActiveAndCompleted,
} from "../tree";
import { makeArea, makeTask } from "./factories";

// Workshops ─┬─ Enrollments ─── Payments
//            └─ Grading
const workshops = makeArea({ id: "workshops", name: "Workshops", parentId: null, sortOrder: 0 });
const enrollments = makeArea({ id: "enrollments", name: "Enrollments", parentId: "workshops", sortOrder: 0 });
const payments = makeArea({ id: "payments", name: "Payments", parentId: "enrollments", sortOrder: 0 });
const grading = makeArea({ id: "grading", name: "Grading", parentId: "workshops", sortOrder: 1 });
const admin = makeArea({ id: "admin", name: "Admin", parentId: null, sortOrder: 1 });
const areas = [payments, workshops, grading, enrollments, admin]; // deliberately unordered

describe("buildTree", () => {
  it("nests children under their parents and returns roots", () => {
    const roots = buildTree(areas);
    expect(roots.map((r) => r.id).sort()).toEqual(["admin", "workshops"]);
    const w = roots.find((r) => r.id === "workshops")!;
    expect(w.children.map((c) => c.id).sort()).toEqual(["enrollments", "grading"]);
    const e = w.children.find((c) => c.id === "enrollments")!;
    expect(e.children.map((c) => c.id)).toEqual(["payments"]);
  });

  it("returns an empty forest for no areas", () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe("groupTasksByArea", () => {
  it("buckets tasks by their areaId", () => {
    const t1 = makeTask({ areaId: "workshops" });
    const t2 = makeTask({ areaId: "workshops" });
    const t3 = makeTask({ areaId: "grading" });
    const byArea = groupTasksByArea([t1, t2, t3]);
    expect(byArea.get("workshops")).toHaveLength(2);
    expect(byArea.get("grading")).toHaveLength(1);
    expect(byArea.has("payments")).toBe(false);
  });
});

describe("countSubtree", () => {
  it("sums done/total across the whole subtree", () => {
    const byArea = groupTasksByArea([
      makeTask({ areaId: "workshops", status: "DONE" }),
      makeTask({ areaId: "workshops", status: "NOT_STARTED" }),
      makeTask({ areaId: "enrollments", status: "COOKING" }),
      makeTask({ areaId: "payments", status: "DONE" }),
      makeTask({ areaId: "admin", status: "NOT_STARTED" }), // unrelated branch
    ]);
    const roots = buildTree(areas);
    const w = roots.find((r) => r.id === "workshops")!;
    expect(countSubtree(w, byArea)).toEqual({ done: 2, total: 4 });
  });

  it("reports zero for an empty subtree", () => {
    const roots = buildTree(areas);
    const a = roots.find((r) => r.id === "admin")!;
    expect(countSubtree(a, new Map())).toEqual({ done: 0, total: 0 });
  });
});

describe("deletionImpact", () => {
  it("counts descendant areas and all tasks in the subtree", () => {
    const byArea = groupTasksByArea([
      makeTask({ areaId: "workshops" }),
      makeTask({ areaId: "payments" }),
      makeTask({ areaId: "admin" }),
    ]);
    const roots = buildTree(areas);
    const w = roots.find((r) => r.id === "workshops")!;
    // descendants: enrollments, payments, grading = 3; tasks: workshops(1) + payments(1) = 2
    expect(deletionImpact(w, byArea)).toEqual({ areas: 3, tasks: 2 });
  });
});

describe("splitActiveAndCompleted", () => {
  it("separates DONE tasks from open ones", () => {
    const open1 = makeTask({ id: "t1", status: "NOT_STARTED" });
    const open2 = makeTask({ id: "t2", status: "COOKING" });
    const done1 = makeTask({ id: "t3", status: "DONE", completedAt: "2026-01-01T00:00:00.000Z" });
    const { active, completed } = splitActiveAndCompleted([open1, done1, open2]);
    expect(active.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(completed.map((t) => t.id)).toEqual(["t3"]);
  });

  it("sorts completed tasks by completedAt descending", () => {
    const older = makeTask({ id: "old", status: "DONE", completedAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeTask({ id: "new", status: "DONE", completedAt: "2026-01-02T00:00:00.000Z" });
    const { completed } = splitActiveAndCompleted([older, newer]);
    expect(completed.map((t) => t.id)).toEqual(["new", "old"]);
  });
});

describe("findPath", () => {
  it("returns the ancestor chain to a deep node", () => {
    const roots = buildTree(areas);
    const path = findPath(roots, "payments");
    expect(path?.map((n) => n.id)).toEqual(["workshops", "enrollments", "payments"]);
  });

  it("returns a single-element path for a root", () => {
    const roots = buildTree(areas);
    expect(findPath(roots, "admin")?.map((n) => n.id)).toEqual(["admin"]);
  });

  it("returns null for an unknown id", () => {
    expect(findPath(buildTree(areas), "ghost")).toBeNull();
  });
});
