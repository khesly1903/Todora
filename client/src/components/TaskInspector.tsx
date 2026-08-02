import { type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import type { Task, TaskStatus } from "../types";
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS } from "../types";
import type { TaskUpdate } from "../api";
import { Avatar, StatusDot } from "./primitives";
import { DatePicker } from "./DatePicker";
import { useIsMobile } from "../hooks";

// On mobile the inspector opens fullscreen, so the notes field gets a much
// taller floor than on desktop's compact side panel — otherwise it looks
// cramped in all that extra vertical space.
const NOTES_MIN_HEIGHT = { mobile: 200, desktop: 72 };

const STATUS_ORDER: TaskStatus[] = ["NOT_STARTED", "COOKING", "DONE"];

function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

function FieldLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: "var(--text-2xs)",
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--text-tertiary)",
      }}
    >
      {children}
    </div>
  );
}

export function TaskInspector({
  task,
  canEdit,
  showAvatars = false,
  onUpdate,
  onClose,
  onDelete,
}: {
  task: Task;
  canEdit: boolean;
  showAvatars?: boolean;
  onUpdate: (fields: TaskUpdate) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  // Keyed by task.id in the parent, so the draft resets when the selection changes.
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [tagDraft, setTagDraft] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const notesMinHeight = isMobile ? NOTES_MIN_HEIGHT.mobile : NOTES_MIN_HEIGHT.desktop;

  function commitDescription() {
    const next = description.trim() === "" ? null : description;
    if ((next ?? "") !== (task.description ?? "")) onUpdate({ description: next });
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || task.tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    onUpdate({ tags: [...task.tags, tag] });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    onUpdate({ tags: task.tags.filter((t) => t !== tag) });
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && tagDraft === "" && task.tags.length > 0) {
      removeTag(task.tags[task.tags.length - 1]!);
    }
  }

  // Title height is handled by pure CSS (see .title-autosize-wrap) — a
  // JS/scrollHeight approach proved unreliable on mobile Safari.

  // Auto-grow the notes textarea up to 320px, with scroll enabled above that.
  useLayoutEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${Math.min(Math.max(el.scrollHeight, notesMinHeight), 320)}px`;
    };
    fit();
    const raf = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(raf);
  }, [description, notesMinHeight]);

  // Re-fit notes once web fonts finish loading — a font swap after the initial
  // measurement can change line-wrapping without triggering a re-render.
  useLayoutEffect(() => {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (!fonts?.ready) return;
    fonts.ready.then(() => {
      const el = notesRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(Math.max(el.scrollHeight, notesMinHeight), 320)}px`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On open, place the caret at the end of the task text rather than the start.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const end = el.value.length;
    el.setSelectionRange(end, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else if (!trimmed) setTitle(task.title);
  }

  const lastUpdater = task.updatedBy ?? task.createdBy;

  return (
    <>
      {/* Mobile backdrop (< 768px only) */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden transition-opacity"
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-50 flex h-full w-[320px] max-w-[88vw] flex-col gap-4 overflow-y-auto p-5 shadow-2xl md:relative md:inset-auto md:z-0 md:w-[280px] md:max-w-[85vw] md:shrink-0 md:shadow-none"
        style={{ background: "var(--surface-inspector)", borderLeft: "1px solid var(--border-default)" }}
      >
      <div className="flex items-start justify-between gap-2">
        <FieldLabel>Task</FieldLabel>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0"
          style={{ color: "var(--text-tertiary)", fontSize: 15, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Title — a CSS grid mirror (see .title-autosize-wrap) grows the box to
          fit the text; a plain textarea, background, and outline none are set
          via CSS so the invisible ::after mirror keeps identical metrics. */}
      <div className="title-autosize-wrap" data-replicated-value={`${title} `}>
        <textarea
          ref={titleRef}
          autoFocus={!isMobile}
          readOnly={!canEdit}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              setTitle(task.title);
              e.currentTarget.blur();
            }
          }}
          rows={1}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Status</FieldLabel>
        <div
          className="flex flex-col gap-0.5 p-0.5"
          style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}
        >
          {STATUS_ORDER.map((s) => {
            const active = task.status === s;
            return (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                onClick={() => onUpdate({ status: s })}
                className="flex items-center gap-2 border-none px-2 py-1.5"
                style={{
                  fontSize: "var(--text-xs)",
                  borderRadius: "var(--radius-xs)",
                  background: active ? "var(--surface-raised)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  cursor: canEdit ? "pointer" : "default",
                }}
              >
                <StatusDot status={s} size={8} />
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Priority</FieldLabel>
        <div
          className="flex items-center gap-0.5 p-0.5"
          style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}
        >
          {PRIORITY_ORDER.map((p) => {
            const active = task.priority === p;
            return (
              <button
                key={p}
                type="button"
                disabled={!canEdit}
                onClick={() => onUpdate({ priority: p })}
                className="flex flex-1 items-center justify-center border-none py-1"
                style={{
                  fontSize: "var(--text-2xs)",
                  borderRadius: "var(--radius-xs)",
                  background: active ? "var(--surface-raised)" : "transparent",
                  color: active ? PRIORITY_COLORS[p] : "var(--text-secondary)",
                  fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  cursor: canEdit ? "pointer" : "default",
                }}
              >
                {PRIORITY_LABELS[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Tags</FieldLabel>
        <div
          className="flex flex-wrap items-center gap-1.5 px-2 py-1.5"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-1.5"
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--text-secondary)",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-full)",
              }}
            >
              {tag}
              {canEdit && (
                <button
                  type="button"
                  title="Remove tag"
                  onClick={() => removeTag(tag)}
                  className="cursor-pointer border-none bg-transparent p-0"
                  style={{ color: "var(--text-tertiary)", fontSize: 12, lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {canEdit && (
            <input
              value={tagDraft}
              placeholder={task.tags.length === 0 ? "Add tags…" : ""}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={() => addTag(tagDraft)}
              className="min-w-[60px] flex-1 border-none bg-transparent p-0 outline-none"
              style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
            />
          )}
          {!canEdit && task.tags.length === 0 && (
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>No tags</span>
          )}
        </div>
      </div>

      {/* Due date */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Due date</FieldLabel>
        {canEdit ? (
          <DatePicker value={task.dueAt} onChange={(dueAt) => onUpdate({ dueAt })} />
        ) : (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{formatDate(task.dueAt)}</div>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Notes</FieldLabel>
        <textarea
          ref={notesRef}
          value={description}
          placeholder="Add notes…"
          readOnly={!canEdit}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          rows={3}
          className="notes-textarea w-full resize-none overflow-x-hidden overflow-y-auto px-2 py-1.5 outline-none"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-normal)",
            color: "var(--text-primary)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            minHeight: `${notesMinHeight}px`,
            maxHeight: "320px",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        />
      </div>

      {/* Meta */}
      <div className="mt-auto flex flex-col gap-1.5 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between" style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
          <span>Created</span>
          <span className="flex items-center gap-1.5">
            {formatDate(task.createdAt)}
            {task.createdBy && (
              <>
                by
                {showAvatars && <Avatar user={task.createdBy} size={14} />}
                {task.createdBy.name ?? task.createdBy.username}
              </>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between" style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
          <span>Updated</span>
          <span className="flex items-center gap-1.5">
            {formatDate(task.updatedAt)}
            {lastUpdater && (
              <>
                by
                {showAvatars && <Avatar user={lastUpdater} size={14} />}
                {lastUpdater.name ?? lastUpdater.username}
              </>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between" style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
          <span>Completed</span>
          <span className="flex items-center gap-1.5">
            {task.completedAt ? formatDate(task.completedAt, true) : "—"}
            {task.completedAt && task.completedBy && (
              <>
                by
                {showAvatars && <Avatar user={task.completedBy} size={14} />}
                {task.completedBy.name ?? task.completedBy.username}
              </>
            )}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-1 cursor-pointer self-start border-none bg-transparent p-0"
            style={{ fontSize: "var(--text-xs)", color: "var(--danger-9)" }}
          >
            Delete task
          </button>
        )}
      </div>
    </div>
    </>
  );
}
