import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, Logo, TextField } from "./primitives";

type Mode = "login" | "register";

/** Full-screen gate shown when no user is signed in. No external site — the app owns login. */
const PASSWORD_PATTERN = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
const NAME_PATTERN = /^[\p{L}\p{M} .'-]{1,50}$/u;

export function AuthScreen({ initialMode }: { initialMode: Mode }) {
  const { login, register, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const mode = initialMode;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = mode === "login" ? "Login · Todora" : "Create account · Todora";
  }, [mode]);

  function switchMode(next: Mode) {
    setName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    clearAuthError();
    navigate(next === "login" ? "/login" : "/signup");
  }

  const isRegister = mode === "register";
  const nameValid = !isRegister || NAME_PATTERN.test(name.trim());
  const passwordMeetsPolicy = !isRegister || PASSWORD_PATTERN.test(password);
  const passwordsMatch = !isRegister || password === confirmPassword;
  const canSubmit =
    !submitting &&
    !!username &&
    !!password &&
    (!isRegister || (!!name.trim() && nameValid && passwordMeetsPolicy && passwordsMatch));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password, name.trim());
    } catch {
      // authError (from useAuth) already reflects the failure; nothing else to do.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "var(--surface-content)" }}>
      <div className="flex flex-1 items-center justify-center">
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
                {m === "login" ? "Login" : "Create account"}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5">
          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <TextField label="Name" type="text" value={name} onChange={setName} onEnter={handleSubmit} autoFocus autoComplete="name" />
              <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
                This name will be visible to others in shared workspaces.
              </div>
            </div>
          )}
          <TextField
            label="Username"
            type="text"
            value={username}
            onChange={setUsername}
            onEnter={handleSubmit}
            autoFocus={!isRegister}
          />
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
          {isRegister && name && !nameValid && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
              Name can only contain letters, spaces, hyphens, and apostrophes.
            </div>
          )}

          {authError && (
            <div style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>{authError}</div>
          )}

          <Button variant="primary" size="lg" onClick={handleSubmit} disabled={!canSubmit}>
            {mode === "login" ? "Login" : "Create account"}
          </Button>
        </div>
      </div>
      </div>

      <footer
        className="flex items-center justify-center gap-2 pb-5"
        style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
      >
        <span>Todora</span>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/khesly1903/Todora" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
          GitHub
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/khesly1903/Todora/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer"
          style={{ color: "inherit" }}
        >
          MIT License
        </a>
      </footer>
    </div>
  );
}
