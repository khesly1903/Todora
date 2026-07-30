const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "⌘/Ctrl K", action: "Open command palette" },
  { keys: "⌘/Ctrl I", action: "Insert task — focus 'Add a task' input (anywhere)" },
  { keys: "N / A / I", action: "Focus 'Add a task' input (when not typing)" },
  { keys: "Space", action: "Cycle the selected task's status" },
  { keys: "Enter", action: "Edit the selected task" },
  { keys: "↑ / ↓", action: "Move between tasks" },
  { keys: "Delete / ⌫", action: "Delete the selected task (undoable)" },
  { keys: "Esc", action: "Clear selection / blur input" },
  { keys: "Double-click", action: "Rename a task or area" },
  { keys: "Drag", action: "Reorder, move a task into another area, or nest areas" },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ background: "var(--scrim)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] max-w-[92vw] p-5"
        style={{
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            Keyboard shortcuts
          </span>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent p-0"
            style={{ fontSize: 16, lineHeight: 1, color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between gap-4">
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{s.action}</span>
              <kbd
                className="shrink-0 whitespace-nowrap px-2 py-0.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  color: "var(--text-primary)",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4" style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
          Shortcuts act on the selected task in the tree view.
        </div>
      </div>
    </div>
  );
}
