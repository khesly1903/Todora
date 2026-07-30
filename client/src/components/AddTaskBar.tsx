import { useState } from "react";
import type { Priority, TaskStatus } from "../types";
import {
  MINIMAL_PRIORITY_LABELS,
  NEXT_STATUS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
} from "../types";
import { DatePicker } from "./DatePicker";
import { PlusIcon, StatusDot } from "./primitives";

export interface CreateTaskInput {
  title: string;
  status?: TaskStatus;
  priority?: Priority;
  tags?: string[];
  dueAt?: string | null;
}

export function AddTaskBar({
  onAdd,
  placeholder = "Add a task…",
  className = "",
}: {
  onAdd: (input: CreateTaskInput) => void;
  placeholder?: string;
  className?: string;
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("NOT_STARTED");
  const [priority, setPriority] = useState<Priority>("NONE");
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [focused, setFocused] = useState(false);

  function submit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      status,
      priority,
      tags,
      dueAt,
    });
    setTitle("");
    setStatus("NOT_STARTED");
    setPriority("NONE");
    setDueAt(null);
    setTags([]);
    setShowTagInput(false);
    setTagInput("");
  }

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--text-tertiary)", display: "inline-flex" }}>
          <PlusIcon />
        </span>
        <input
          data-add-task
          value={title}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              submit();
            }
            if (e.key === "Escape") e.currentTarget.blur();
          }}
          className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none focus:outline-none"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
            outline: "none",
            boxShadow: "none",
            border: "none",
          }}
        />
        {!focused && !title && (
          <div className="flex items-center gap-1 pr-1 pointer-events-none select-none" style={{ opacity: 0.65 }}>
            <kbd
              className="px-1.5 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--text-tertiary)",
                background: "var(--surface-sunken)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xs)",
              }}
            >
              ⌘ I
            </kbd>
          </div>
        )}
      </div>

      {/* Minimal controls under add task area: status, priority, due date, tags */}
      <div
        className="flex flex-wrap items-center gap-2 pt-0.5"
        style={{ fontSize: "var(--text-2xs)", color: "var(--text-secondary)" }}
      >
        {/* Status indicator button */}
        <button
          type="button"
          onClick={() => setStatus(NEXT_STATUS[status])}
          title={`Status: ${STATUS_LABELS[status]}`}
          className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-hover)]"
          style={{
            borderRadius: "var(--radius-xs)",
            background: status !== "NOT_STARTED" ? "var(--surface-sunken)" : "transparent",
            color: "var(--text-secondary)",
          }}
        >
          <StatusDot status={status} />
          <span>{STATUS_LABELS[status]}</span>
        </button>

        {/* Priority buttons: - ! !! !!! */}
        <div
          className="flex items-center gap-0.5 p-0.5"
          style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-xs)" }}
        >
          {PRIORITY_ORDER.map((p) => {
            const active = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                title={PRIORITY_LABELS[p]}
                className="cursor-pointer border-none px-1.5 py-0.5 transition-colors"
                style={{
                  fontSize: "var(--text-2xs)",
                  fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                  borderRadius: "var(--radius-xs)",
                  background: active ? "var(--surface-raised)" : "transparent",
                  color:
                    active && p !== "NONE"
                      ? PRIORITY_COLORS[p]
                      : active
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
              >
                {MINIMAL_PRIORITY_LABELS[p]}
              </button>
            );
          })}
        </div>

        {/* Due Date picker */}
        <DatePicker value={dueAt} onChange={setDueAt} placeholder="Due" compact />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-1.5 py-0.5"
              style={{
                background: "var(--surface-sunken)",
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-xs)",
              }}
            >
              #{tag}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                className="cursor-pointer border-none bg-transparent p-0 hover:text-[var(--text-primary)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                ×
              </button>
            </span>
          ))}
          {showTagInput ? (
            <input
              autoFocus
              value={tagInput}
              placeholder="Tag name"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  if (!tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()]);
                  }
                  setTagInput("");
                  setShowTagInput(false);
                } else if (e.key === "Escape") {
                  setShowTagInput(false);
                  setTagInput("");
                }
              }}
              onBlur={() => {
                if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                  setTags([...tags, tagInput.trim()]);
                }
                setTagInput("");
                setShowTagInput(false);
              }}
              className="w-16 border-none bg-transparent px-1 py-0.5 outline-none"
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--text-primary)",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-xs)",
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="inline-flex cursor-pointer items-center gap-0.5 border-none bg-transparent px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: "var(--text-tertiary)", borderRadius: "var(--radius-xs)" }}
            >
              + Tag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
