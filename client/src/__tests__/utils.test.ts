import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDueShort, isOverdue, taskMatchesQuery } from "../utils";
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

describe("taskMatchesQuery", () => {
  it("matches tasks by title", () => {
    const task = makeTask({ title: "Write documentation" });
    expect(taskMatchesQuery(task, "doc")).toBe(true);
    expect(taskMatchesQuery(task, "xyz")).toBe(false);
  });

  it("matches tasks by tags with or without # prefix", () => {
    const task = makeTask({ title: "Fix bug", tags: ["urgent", "frontend"] });
    expect(taskMatchesQuery(task, "urg")).toBe(true);
    expect(taskMatchesQuery(task, "#urgent")).toBe(true);
    expect(taskMatchesQuery(task, "frontend")).toBe(true);
    expect(taskMatchesQuery(task, "#backend")).toBe(false);
  });

  it("matches tasks by description", () => {
    const task = makeTask({ title: "Deploy app", description: "Use Coolify for database" });
    expect(taskMatchesQuery(task, "coolify")).toBe(true);
    expect(taskMatchesQuery(task, "aws")).toBe(false);
  });
});
