import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDueShort, isOverdue } from "../utils";
import { makeTask } from "./factories";

describe("isOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T09:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("is true for a past due date on an unfinished task", () => {
    expect(isOverdue(makeTask({ dueAt: "2026-07-20T00:00:00.000Z" }))).toBe(true);
  });

  it("is false for a future due date", () => {
    expect(isOverdue(makeTask({ dueAt: "2026-08-01T00:00:00.000Z" }))).toBe(false);
  });

  it("is false when there is no due date", () => {
    expect(isOverdue(makeTask({ dueAt: null }))).toBe(false);
  });

  it("is false for a completed task even if past due", () => {
    expect(isOverdue(makeTask({ dueAt: "2026-07-20T00:00:00.000Z", status: "DONE" }))).toBe(false);
  });

  it("is false for a task due later today (compares against start of day)", () => {
    expect(isOverdue(makeTask({ dueAt: "2026-07-27T23:00:00.000Z" }))).toBe(false);
  });
});

describe("formatDueShort", () => {
  it("renders a short month/day label", () => {
    // Locale-independent check: contains the day number and is short.
    const label = formatDueShort("2026-07-20T12:00:00.000Z");
    expect(label).toMatch(/20/);
    expect(label.length).toBeLessThanOrEqual(8);
  });
});
