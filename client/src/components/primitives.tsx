import { type KeyboardEvent, type ReactNode, useState } from "react";
import type { TaskStatus } from "../types";
import { STATUS_LABELS } from "../types";
import { formatDueShort } from "../utils";
import { avatarUrl } from "../avatar";
import logoUrl from "../assets/logo.png";

const STATUS_COLORS: Record<TaskStatus, string> = {
  NOT_STARTED: "var(--status-not-started)",
  COOKING: "var(--status-cooking)",
  DONE: "var(--status-done)",
};

export function StatusDot({
  status,
  size = 8,
  onClick,
}: {
  status: TaskStatus;
  size?: number;
  onClick?: () => void;
}) {
  const dot = (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: STATUS_COLORS[status],
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
  if (!onClick) return dot;
  return (
    <button
      type="button"
      title={`${STATUS_LABELS[status]} — click to change`}
      aria-label={`Status: ${STATUS_LABELS[status]}. Click to change.`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 hover:scale-125"
      style={{ transition: `transform var(--duration-fast) var(--ease-standard)` }}
    >
      {dot}
    </button>
  );
}

export function IconButton({
  icon,
  onClick,
  title,
  active = false,
}: {
  icon: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:bg-[var(--surface-hover)]"
      style={{
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--surface-active)" : undefined,
        color: active ? "var(--accent-9)" : "var(--text-secondary)",
      }}
    >
      {icon}
    </button>
  );
}

/** Todora brand mark. Black monochrome icon; inverted to white in dark theme via .todora-logo. */
export function Logo() {
  return <img className="todora-logo" src={logoUrl} width={24} height={24} alt="Todora" />;
}

/** Small round DiceBear avatar for a user — used wherever "who did this" matters in shared workspaces. */
export function Avatar({
  user,
  size = 16,
}: {
  user: { id: string; username: string; name: string | null; avatarSeed: string | null };
  size?: number;
}) {
  return (
    <img
      src={avatarUrl(user)}
      width={size}
      height={size}
      alt=""
      title={user.name ?? user.username}
      className="shrink-0"
      style={{ borderRadius: "var(--radius-full)", background: "var(--surface-sunken)" }}
    />
  );
}

export function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.5 1.5H13.5A1 1 0 0 1 14.5 5v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9Z"
        fill="var(--accent-9)"
        opacity="0.85"
      />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <path
        d="M1.5 0.5l4 3.5-4 3.5"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M8.5 1.5L3 7l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M13 3l-1.4 1.4M4.4 11.6L3 13" />
      </g>
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
      <path d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.3 4.3 0 0 0 7 7Z" fill="currentColor" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ChevronToggle({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      aria-hidden
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: `transform var(--duration-fast) var(--ease-standard)`,
      }}
    >
      <path
        d="M2 1l4 3.5L2 8"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DueBadge({ iso, overdue }: { iso: string; overdue: boolean }) {
  return (
    <span
      title={overdue ? `Overdue — due ${new Date(iso).toLocaleDateString()}` : `Due ${new Date(iso).toLocaleDateString()}`}
      className="shrink-0 whitespace-nowrap"
      style={{
        fontSize: "var(--text-2xs)",
        color: overdue ? "var(--status-not-started-text)" : "var(--text-tertiary)",
        fontWeight: overdue ? "var(--weight-medium)" : "var(--weight-regular)",
      }}
    >
      {formatDueShort(iso)}
    </span>
  );
}

export function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
      <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BreadcrumbSegment({
  label,
  isLast,
  onClick,
}: {
  label: string;
  isLast: boolean;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  if (isLast) {
    return (
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}
      >
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "inherit",
        color: hover ? "var(--accent-9)" : "var(--text-secondary)",
        textDecoration: hover ? "underline" : "none",
      }}
    >
      {label}
    </button>
  );
}

export function Breadcrumb({
  items,
  onNavigate,
  emptyLabel,
}: {
  items: { id: string; name: string }[];
  onNavigate: (index: number) => void;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <span style={{ color: "var(--text-tertiary)" }}>{emptyLabel}</span>;
  }
  return (
    <>
      {items.map((item, i) => (
        <span key={item.id} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <span style={{ color: "var(--text-tertiary)" }}>›</span>}
          <BreadcrumbSegment
            label={item.name}
            isLast={i === items.length - 1}
            onClick={() => onNavigate(i)}
          />
        </span>
      ))}
    </>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const BUTTON_VARIANTS: Record<ButtonVariant, { background: string; color: string; border: string }> = {
  primary: { background: "var(--accent-9)", color: "var(--text-on-accent)", border: "1px solid transparent" },
  secondary: { background: "var(--surface-raised)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
  ghost: { background: "transparent", color: "var(--text-primary)", border: "1px solid transparent" },
  destructive: { background: "var(--danger-9)", color: "#fff", border: "1px solid transparent" },
};

const BUTTON_HOVER_BG: Record<ButtonVariant, string> = {
  primary: "var(--accent-10)",
  secondary: "var(--surface-hover)",
  ghost: "var(--surface-hover)",
  destructive: "var(--danger-10)",
};

const BUTTON_HEIGHT: Record<"sm" | "lg", string> = { sm: "h-7", lg: "h-10" };

export function Button({
  children,
  variant = "secondary",
  size = "sm",
  fullWidth = false,
  icon,
  disabled = false,
  onClick,
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const v = BUTTON_VARIANTS[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`inline-flex ${BUTTON_HEIGHT[size]} ${fullWidth ? "w-full" : ""} cursor-pointer items-center justify-center gap-1.5 px-3`}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        borderRadius: "var(--radius-sm)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
        transition: "background var(--duration-fast)",
        ...v,
        ...(hover && !disabled ? { background: BUTTON_HOVER_BG[variant] } : {}),
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.86 19.86 0 0 1 4.22-5.53M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/** Labeled input with an optional password-reveal toggle. Used by AuthScreen and ProfileDialog. */
export function TextField({
  label,
  type,
  value,
  onChange,
  onEnter,
  autoFocus,
  autoComplete,
}: {
  label: string;
  type: "text" | "password";
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onEnter();
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="relative">
        <input
          type={isPassword && reveal ? "text" : type}
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete ?? (type === "password" ? "current-password" : "username")}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          className="h-9 w-full border-none outline-none"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
            background: "var(--surface-sunken)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            padding: isPassword ? "0 34px 0 12px" : "0 12px",
          }}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            title={reveal ? "Hide password" : "Show password"}
            onClick={() => setReveal((v) => !v)}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center border-none bg-transparent px-2.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {reveal ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </label>
  );
}

export function InlineInput({
  defaultValue,
  placeholder,
  onSubmit,
  onCancel,
}: {
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSubmit(value);
    if (e.key === "Escape") onCancel?.();
  }
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => onSubmit(value)}
      className="min-w-0 flex-1 border-none bg-transparent p-0 outline-none focus:outline-none"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--text-primary)",
        outline: "none",
        boxShadow: "none",
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
