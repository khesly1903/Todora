import { useState } from "react";
import { useAuth } from "../auth";
import { useChangePassword } from "../hooks";
import { ApiError } from "../api";
import { Button, TextField } from "./primitives";

const PASSWORD_PATTERN = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
const NAME_PATTERN = /^[\p{L}\p{M} .'-]{1,50}$/u;

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError || e instanceof Error ? e.message : fallback;
}

function NameSection() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const valid = NAME_PATTERN.test(trimmed);
  const dirty = trimmed !== (user?.name ?? "");

  async function save() {
    if (!valid || !dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(trimmed);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e, "Could not update your name"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Display name
      </div>
      <TextField
        label="Name"
        type="text"
        value={name}
        onChange={(v) => {
          setName(v);
          setError(null);
          setSaved(false);
        }}
        onEnter={save}
      />
      <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
        This name is visible to others in shared workspaces.
      </div>
      {name && !valid && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
          Name can only contain letters, spaces, hyphens, and apostrophes.
        </div>
      )}
      {error && <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>{error}</div>}
      {saved && !dirty && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--status-done-text)" }}>Saved.</div>
      )}
      <div>
        <Button variant="primary" onClick={save} disabled={!valid || !dirty || saving}>
          Save name
        </Button>
      </div>
    </div>
  );
}

function PasswordSection() {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const newPasswordValid = PASSWORD_PATTERN.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const canSave = !!currentPassword && newPasswordValid && passwordsMatch;

  function save() {
    if (!canSave) return;
    setError(null);
    setSaved(false);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSaved(true);
        },
        onError: (e) => setError(errorMessage(e, "Could not change your password")),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Change password
      </div>
      <TextField
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={(v) => {
          setCurrentPassword(v);
          setError(null);
        }}
        onEnter={save}
        autoComplete="current-password"
      />
      <TextField
        label="New password"
        type="password"
        value={newPassword}
        onChange={(v) => {
          setNewPassword(v);
          setError(null);
        }}
        onEnter={save}
        autoComplete="new-password"
      />
      <TextField
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          setError(null);
        }}
        onEnter={save}
        autoComplete="new-password"
      />
      <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
        At least 8 characters with a number and a special character.
      </div>
      {newPassword && !newPasswordValid && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
          Password needs a number and a special character.
        </div>
      )}
      {confirmPassword && !passwordsMatch && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
          Passwords don't match.
        </div>
      )}
      {error && <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>{error}</div>}
      {saved && <div style={{ fontSize: "var(--text-xs)", color: "var(--status-done-text)" }}>Password changed.</div>}
      <div>
        <Button variant="primary" onClick={save} disabled={!canSave || changePassword.isPending}>
          Save password
        </Button>
      </div>
    </div>
  );
}

/** Edit display name and change password. Opened from the header user menu. */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
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
        className="flex max-h-[80vh] w-[400px] flex-col gap-5 p-5"
        style={{
          background: "var(--surface-overlay)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            Profile settings
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent p-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NameSection />
          <div className="my-4" style={{ borderTop: "1px solid var(--border-subtle)" }} />
          <PasswordSection />
        </div>
      </div>
    </div>
  );
}
