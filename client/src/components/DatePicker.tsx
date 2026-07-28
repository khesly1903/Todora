import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type DayCell, monthGrid } from "../calendar";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameYMD(a: { y: number; m: number; d: number }, date: Date | null): boolean {
  return (
    !!date && date.getFullYear() === a.y && date.getMonth() === a.m && date.getDate() === a.d
  );
}

/** shadcn-style calendar date picker with a popover; stores the chosen day as a local-midnight ISO string. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
}) {
  const selected = useMemo(() => (value ? new Date(value) : null), [value]);
  const today = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected ?? today);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // When re-opening, jump the view to the selected month (or today).
  useEffect(() => {
    if (open) setView(selected ?? today);
  }, [open, selected, today]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const width = 252;
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos({ top: r.bottom + 4, left: Math.max(8, left) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const viewYear = view.getFullYear();
  const viewMonth = view.getMonth();
  const cells = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function pick(cell: DayCell) {
    onChange(new Date(cell.y, cell.m, cell.d).toISOString());
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView(new Date(viewYear, viewMonth + delta, 1));
  }

  const label = selected
    ? selected.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : placeholder;

  return (
    <div className="flex flex-1 items-center gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-1 cursor-pointer items-center gap-2 px-2 py-1 text-left"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <CalendarGlyph />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      </button>
      {selected && (
        <button
          type="button"
          title="Clear due date"
          onClick={() => onChange(null)}
          className="cursor-pointer border-none bg-transparent p-0"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
        >
          Clear
        </button>
      )}

      {open && pos && (
        <div
          ref={popRef}
          className="fixed z-[360] p-2.5"
          style={{
            top: pos.top,
            left: pos.left,
            width: 252,
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Month header */}
          <div className="mb-1.5 flex items-center justify-between">
            <NavButton dir="prev" onClick={() => shiftMonth(-1)} />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <NavButton dir="next" onClick={() => shiftMonth(1)} />
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="flex h-7 items-center justify-center"
                style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)", fontWeight: "var(--weight-medium)" }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((c) => {
              const isSelected = sameYMD(c, selected);
              const isToday = sameYMD(c, today);
              return (
                <button
                  key={`${c.y}-${c.m}-${c.d}`}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex h-8 cursor-pointer items-center justify-center border-none"
                  style={{
                    margin: 1,
                    fontSize: "var(--text-xs)",
                    borderRadius: "var(--radius-sm)",
                    background: isSelected ? "var(--accent-9)" : "transparent",
                    color: isSelected
                      ? "var(--text-on-accent)"
                      : c.inMonth
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    fontWeight: isSelected || isToday ? "var(--weight-medium)" : "var(--weight-regular)",
                    boxShadow: !isSelected && isToday ? "inset 0 0 0 1px var(--accent-9)" : "none",
                    opacity: c.inMonth ? 1 : 0.5,
                    transition: "background var(--duration-fast)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {c.d}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-1.5 flex items-center justify-between px-0.5">
            <button
              type="button"
              onClick={() =>
                pick({
                  y: today.getFullYear(),
                  m: today.getMonth(),
                  d: today.getDate(),
                  inMonth: true,
                  key: "",
                })
              }
              className="cursor-pointer border-none bg-transparent p-0"
              style={{ fontSize: "var(--text-xs)", color: "var(--accent-9)", fontWeight: "var(--weight-medium)" }}
            >
              Today
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="cursor-pointer border-none bg-transparent p-0"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      title={dir === "prev" ? "Previous month" : "Next month"}
      onClick={onClick}
      className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-[var(--surface-hover)]"
      style={{ borderRadius: "var(--radius-sm)", color: "var(--text-secondary)" }}
    >
      <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden style={{ transform: dir === "prev" ? "rotate(180deg)" : "none" }}>
        <path d="M2 1l4 3.5L2 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function CalendarGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden style={{ color: "var(--text-tertiary)" }}>
      <rect x="2" y="3" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6h12M5.5 1.5v2.5M10.5 1.5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
