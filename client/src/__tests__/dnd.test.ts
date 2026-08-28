import { describe, expect, it } from "vitest";
import { resolveDragEnd, type DragData } from "../dnd";
import { groupTasksByArea } from "../tree";
import { makeArea, makeTask } from "./factories";

// Workshops ─┬─ Enrollments
//            └─ Grading
// Admin
const workshops = makeArea({ id: "workshops", parentId: null, sortOrder: 0 });
const enrollments = makeArea({ id: "enrollments", parentId: "workshops", sortOrder: 0 });
const grading = makeArea({ id: "grading", parentId: "workshops", sortOrder: 1 });
const admin = makeArea({ id: "admin", parentId: null, sortOrder: 1 });
const areas = [workshops, enrollments, grading, admin];

const t1 = makeTask({ id: "t1", areaId: "workshops", sortOrder: 0 });
const t2 = makeTask({ id: "t2", areaId: "workshops", sortOrder: 1 });
const t3 = makeTask({ id: "t3", areaId: "workshops", sortOrder: 2 });
const t4 = makeTask({ id: "t4", areaId: "grading", sortOrder: 0 });
const tasks = [t1, t2, t3, t4];

const data: DragData = {
  areas,
  tasksByArea: groupTasksByArea(tasks),
  areaMap: new Map(areas.map((a) => [a.id, a])),
  taskById: new Map(tasks.map((t) => [t.id, t])),
};

describe("resolveDragEnd — tasks", () => {
  it("reorders tasks within the same area", () => {
    // drag t1 onto t3 → t1 moves after where t3 was
    expect(resolveDragEnd("t1", "t3", data)).toEqual({
      type: "reorder-tasks",
      areaId: "workshops",
      orderedIds: ["t2", "t3", "t1"],
    });
  });

  it("moves a task into another area when dropped on a task there", () => {
    expect(resolveDragEnd("t1", "t4", data)).toEqual({
      type: "move-task",
      taskId: "t1",
      areaId: "grading",
      orderedIds: ["t1", "t4"],
    });
  });

  it("moves a task into an area when dropped on the area itself", () => {
    expect(resolveDragEnd("t1", "grading", data)).toEqual({
      type: "move-task",
      taskId: "t1",
      areaId: "grading",
      orderedIds: ["t4", "t1"],
    });
  });
});

describe("resolveDragEnd — areas", () => {
  it("reorders sibling areas", () => {
    expect(resolveDragEnd("grading", "enrollments", data)).toEqual({
      type: "reorder-areas",
      orderedIds: ["grading", "enrollments"],
    });
  });

  it("blocks nesting an area into its own descendant (cycle protection)", () => {
    expect(resolveDragEnd("workshops", "enrollments", data)).toBeNull();
  });
});

describe("resolveDragEnd — no-ops", () => {
  it("returns null when dropped on itself", () => {
    expect(resolveDragEnd("t1", "t1", data)).toBeNull();
  });

  it("returns null for an empty over target", () => {
    expect(resolveDragEnd("t1", "", data)).toBeNull();
  });
});
