import { describe, expect, it } from "vitest";
import { buildExport } from "../backup";
import { makeArea, makeTask } from "./factories";

describe("buildExport", () => {
  it("produces a nested tree of areas with their tasks", () => {
    const workshops = makeArea({ id: "workshops", name: "Workshops", parentId: null, sortOrder: 0 });
    const enrollments = makeArea({ id: "enrollments", name: "Enrollments", parentId: "workshops", sortOrder: 0 });
    const t1 = makeTask({ areaId: "workshops", title: "Plan", status: "COOKING", priority: "HIGH", tags: ["q3"] });
    const t2 = makeTask({ areaId: "enrollments", title: "Email list", status: "DONE" });

    const tree = buildExport([enrollments, workshops], [t2, t1]);

    expect(tree).toHaveLength(1);
    const root = tree[0]!;
    expect(root.name).toBe("Workshops");
    expect(root.tasks.map((t) => t.title)).toEqual(["Plan"]);
    expect(root.tasks[0]).toMatchObject({ status: "COOKING", priority: "HIGH", tags: ["q3"] });
    expect(root.children).toHaveLength(1);
    expect(root.children[0]!.name).toBe("Enrollments");
    expect(root.children[0]!.tasks.map((t) => t.title)).toEqual(["Email list"]);
  });

  it("returns an empty array when there are no areas", () => {
    expect(buildExport([], [])).toEqual([]);
  });

  it("omits internal ids/timestamps from exported tasks", () => {
    const area = makeArea({ id: "a", parentId: null });
    const task = makeTask({ areaId: "a" });
    const [root] = buildExport([area], [task]);
    expect(root!.tasks[0]).not.toHaveProperty("id");
    expect(root!.tasks[0]).not.toHaveProperty("createdAt");
  });
});
