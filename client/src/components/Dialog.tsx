import { type ReactNode } from "react";
import { Button } from "./primitives";

export function Dialog({
  open,
  title,
  description,
  onClose,
  actions,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "var(--scrim)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        className="w-[380px] p-5"
        style={{
          background: "var(--surface-overlay)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            {description}
          </div>
        )}
        {actions && <div className="mt-1 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function DeleteConfirmDialog({
  open,
  name,
  areaCount,
  taskCount,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  areaCount: number;
  taskCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const parts: string[] = [];
  if (areaCount > 0) parts.push(`${areaCount} area${areaCount === 1 ? "" : "s"}`);
  if (taskCount > 0) parts.push(`${taskCount} task${taskCount === 1 ? "" : "s"}`);
  const description =
    parts.length > 0
      ? `This will permanently delete ${parts.join(" and ")}. This can't be undone.`
      : "This can't be undone.";
  return (
    <Dialog
      open={open}
      title={`Delete “${name}”?`}
      description={description}
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </>
      }
    />
  );
}
