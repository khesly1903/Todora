import { useEffect, useState } from "react";

export type ToastKind = "error" | "info";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (toast: Omit<Toast, "id">) => void;

let listeners: Listener[] = [];

/** Fire a toast from anywhere — including outside React (e.g. the QueryClient MutationCache). */
export function pushToast(toast: Omit<Toast, "id">) {
  for (const l of listeners) l(toast);
}

const TOAST_MS = 5000;

/** Renders transient toasts stacked in the bottom-right corner. */
export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur, { ...t, id }]);
      window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), TOAST_MS);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[350] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-[320px] items-start gap-2 px-3.5 py-2.5"
          style={{
            background: "var(--surface-overlay)",
            border: `1px solid ${t.kind === "error" ? "var(--danger-9)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <span
            aria-hidden
            className="mt-0.5 shrink-0"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: t.kind === "error" ? "var(--danger-9)" : "var(--accent-9)",
            }}
          />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", lineHeight: 1.35 }}>
            {t.message}
          </span>
          <button
            type="button"
            title="Dismiss"
            onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
            className="ml-1 shrink-0 cursor-pointer border-none bg-transparent p-0"
            style={{ fontSize: 14, lineHeight: 1, color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
