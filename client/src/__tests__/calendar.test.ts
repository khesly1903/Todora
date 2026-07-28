import { describe, expect, it } from "vitest";
import { dayKey, dayKeyToISO, groupTasksByDueDay, isoToDayKey, monthGrid } from "../calendar";
import { makeTask } from "./factories";

describe("dayKey", () => {
  it("zero-pads month and day", () => {
    expect(dayKey(2026, 6, 4)).toBe("2026-07-04");
    expect(dayKey(2026, 11, 25)).toBe("2026-12-25");
  });
});

describe("day-key ISO round-trip", () => {
  it("survives dayKey → ISO → dayKey", () => {
    for (const key of ["2026-01-01", "2026-07-14", "2026-12-31"]) {
      expect(isoToDayKey(dayKeyToISO(key))).toBe(key);
    }
  });
});

describe("monthGrid", () => {
  it("always returns a 6×7 grid", () => {
    expect(monthGrid(2026, 6)).toHaveLength(42);
    expect(monthGrid(2026, 1)).toHaveLength(42); // February
  });

  it("starts on a Monday and covers the month contiguously", () => {
    const cells = monthGrid(2026, 6); // July 2026
    // The first in-month day is day 1.
    const firstInMonth = cells.findIndex((c) => c.inMonth && c.d === 1);
    // Leading cells are the tail of the previous month.
    for (let i = 0; i < firstInMonth; i++) expect(cells[i]!.inMonth).toBe(false);
    // Exactly 31 in-month cells for July.
    expect(cells.filter((c) => c.inMonth).length).toBe(31);
  });

  it("tags cells outside the target month", () => {
    const cells = monthGrid(2026, 6);
    expect(cells.some((c) => !c.inMonth)).toBe(true);
    expect(cells.every((c) => c.key === dayKey(c.y, c.m, c.d))).toBe(true);
  });
});

describe("groupTasksByDueDay", () => {
  it("buckets tasks by the local day of their due date", () => {
    const a = makeTask({ dueAt: dayKeyToISO("2026-07-14") });
    const b = makeTask({ dueAt: dayKeyToISO("2026-07-14") });
    const c = makeTask({ dueAt: dayKeyToISO("2026-07-20") });
    const map = groupTasksByDueDay([a, b, c]);
    expect(map.get("2026-07-14")).toHaveLength(2);
    expect(map.get("2026-07-20")).toHaveLength(1);
  });

  it("omits tasks without a due date", () => {
    const map = groupTasksByDueDay([makeTask({ dueAt: null }), makeTask({ dueAt: dayKeyToISO("2026-07-14") })]);
    expect([...map.values()].flat()).toHaveLength(1);
    expect(map.has("2026-07-14")).toBe(true);
  });
});
