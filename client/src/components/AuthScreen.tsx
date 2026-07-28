import { useState, type KeyboardEvent } from "react";
import { useAuth } from "../auth";
import { Button, Logo } from "./primitives";

type Mode = "login" | "register";

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

function TextField({
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

/** Full-screen gate shown when no user is signed in. No external site — the app owns login. */
const PASSWORD_PATTERN = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

export function AuthScreen() {
  const { login, register, authError, clearAuthError } = useAuth();
  const initialMode: Mode = new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    clearAuthError();
  }

  const isRegister = mode === "register";
  const passwordMeetsPolicy = !isRegister || PASSWORD_PATTERN.test(password);
  const passwordsMatch = !isRegister || password === confirmPassword;
  const canSubmit =
    !submitting && !!username && !!password && (!isRegister || (passwordMeetsPolicy && passwordsMatch));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
    } catch {
      // authError (from useAuth) already reflects the failure; nothing else to do.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--surface-content)" }}>
      <div
        className="w-[360px] p-6"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="mb-6 flex items-center gap-2">
          <Logo />
          <span style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            Todora
          </span>
        </div>

        <div
          className="mb-5 flex gap-0.5 p-0.5"
          style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}
        >
          {(["login", "register"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 cursor-pointer border-none px-2.5 py-2.5"
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
                  borderRadius: "var(--radius-xs)",
                  background: active ? "var(--surface-raised)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  textAlign: "center",
                }}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5">
          <TextField label="Username" type="text" value={username} onChange={setUsername} onEnter={handleSubmit} autoFocus />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            onEnter={handleSubmit}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          {isRegister && (
            <TextField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              onEnter={handleSubmit}
              autoComplete="new-password"
            />
          )}

          {isRegister && (
            <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
              3-24 characters (letters, numbers, underscore); password at least 8 characters with a number and a
              special character.
            </div>
          )}
          {isRegister && password && !passwordMeetsPolicy && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
              Password needs a number and a special character.
            </div>
          )}
          {isRegister && confirmPassword && !passwordsMatch && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
              Passwords don't match.
            </div>
          )}

          {authError && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>{authError}</div>
          )}

          <Button variant="primary" size="lg" onClick={handleSubmit} disabled={!canSubmit}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
