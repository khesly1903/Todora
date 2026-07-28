import { describe, expect, it } from "vitest";
import { reorderByIds } from "../reorder";

interface Item {
  id: string;
  sortOrder: number;
}

const items: Item[] = [
  { id: "a", sortOrder: 0 },
  { id: "b", sortOrder: 1 },
  { id: "c", sortOrder: 2 },
];

describe("reorderByIds", () => {
  it("applies a new order by index", () => {
    const result = reorderByIds(items, ["c", "a", "b"]);
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });

  it("does not mutate the input", () => {
    const snapshot = items.map((i) => ({ ...i }));
    reorderByIds(items, ["c", "b", "a"]);
    expect(items).toEqual(snapshot);
  });

  it("leaves items absent from orderedIds after the reordered ones", () => {
    // Only reorder a and b within a list that also has c.
    const result = reorderByIds(items, ["b", "a"]);
    // b->0, a->1, c keeps sortOrder 2
    expect(result.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("returns a stable order for an empty id list", () => {
    expect(reorderByIds(items, []).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
