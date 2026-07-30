import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAreas, useCreateArea, useImportTree, useTasks, useWorkspaces } from "./hooks";
import { useAuth } from "./auth";
import { TreeView } from "./components/TreeView";
import { ColumnViewScreen } from "./components/ColumnViewScreen";
import { CalendarView } from "./components/CalendarView";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { ProfileDialog } from "./components/ProfileDialog";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";
import { NotificationsBell } from "./components/NotificationsBell";
import { AuthScreen } from "./components/AuthScreen";
import { IconButton, Logo, MoonIcon, SearchIcon, SunIcon } from "./components/primitives";
import { buildExport, downloadJson, pickJsonFile } from "./backup";
import { pushToast } from "./toast";
import { LandingPage } from "./landing/LandingPage";
import type { ExportNode } from "./api";
import type { Area, Task } from "./types";
import { canEditRole } from "./types";

type Theme = "light" | "dark";
type ViewMode = "tree" | "columns" | "calendar";

const VIEW_LABELS: Record<ViewMode, string> = {
  tree: "Tree",
  columns: "Columns",
  calendar: "Calendar",
};

const ZOOM_STEPS = [80, 90, 100, 110, 120, 130, 140, 150];

function useZoom() {
  const [zoom, setZoom] = useState<number>(() => {
    const stored = Number(localStorage.getItem("todora-zoom"));
    return ZOOM_STEPS.includes(stored) ? stored : 100;
  });
  useEffect(() => {
    document.documentElement.style.zoom = zoom === 100 ? "" : `${zoom}%`;
    localStorage.setItem("todora-zoom", String(zoom));
  }, [zoom]);
  return {
    zoom,
    zoomIn: () => setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.indexOf(z) + 1, ZOOM_STEPS.length - 1)]!),
    zoomOut: () => setZoom((z) => ZOOM_STEPS[Math.max(ZOOM_STEPS.indexOf(z) - 1, 0)]!),
    reset: () => setZoom(100),
  };
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("todora-theme") as Theme) ?? "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("todora-theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(theme === "light" ? "dark" : "light") };
}

function useViewMode() {
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem("todora-view") as ViewMode) ?? "tree",
  );
  useEffect(() => {
    localStorage.setItem("todora-view", view);
  }, [view]);
  return [view, setView] as const;
}

function useCurrentWorkspaceId() {
  const [id, setId] = useState<string | null>(() => localStorage.getItem("todora-workspace"));
  useEffect(() => {
    if (id) localStorage.setItem("todora-workspace", id);
  }, [id]);
  return [id, setId] as const;
}

function ZoomControl({
  zoom,
  onZoomOut,
  onZoomIn,
  onReset,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
}) {
  const buttonStyle = {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  } as const;
  return (
    <div
      className="flex h-[22px] items-center"
      style={{ background: "var(--surface-sunken)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-full)" }}
    >
      <button
        type="button"
        title="Zoom out"
        onClick={onZoomOut}
        disabled={zoom <= ZOOM_STEPS[0]!}
        className="inline-flex h-full w-5 items-center justify-center disabled:opacity-40"
        style={buttonStyle}
      >
        −
      </button>
      <button
        type="button"
        title="Reset zoom"
        onClick={onReset}
        className="inline-flex h-full items-center justify-center px-1 tabular-nums"
        style={{ ...buttonStyle, fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", minWidth: 32 }}
      >
        {zoom}%
      </button>
      <button
        type="button"
        title="Zoom in"
        onClick={onZoomIn}
        disabled={zoom >= ZOOM_STEPS.at(-1)!}
        className="inline-flex h-full w-5 items-center justify-center disabled:opacity-40"
        style={buttonStyle}
      >
        +
      </button>
    </div>
  );
}

function UserMenu({
  label,
  onEditProfile,
  onLogout,
}: {
  label: string;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label}
        className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center border-none"
        style={{
          fontSize: "var(--text-2xs)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-primary)",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-full)",
        }}
      >
        {label.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-[150] w-[200px] p-1"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="truncate px-2 py-1.5" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
            {label}
          </div>
          <div className="my-1" style={{ borderTop: "1px solid var(--border-subtle)" }} />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEditProfile();
            }}
            className="flex w-full cursor-pointer items-center border-none bg-transparent px-2 py-1.5 text-left"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full cursor-pointer items-center border-none bg-transparent px-2 py-1.5 text-left"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 p-0.5"
      style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}
    >
      {(["tree", "columns", "calendar"] as const).map((mode) => {
        const active = view === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="cursor-pointer border-none px-2.5 py-1"
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
              borderRadius: "var(--radius-xs)",
              background: active ? "var(--surface-raised)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            {VIEW_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}

function AuthedApp() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { zoom, zoomIn, zoomOut, reset: resetZoom } = useZoom();
  const [view, setView] = useViewMode();
  const workspacesQuery = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useCurrentWorkspaceId();
  const createArea = useCreateArea();
  const importTree = useImportTree();

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);

  useEffect(() => {
    document.title = "Todora";
  }, []);

  // Resolve the active workspace once the list loads: keep the persisted one if it
  // still exists, otherwise fall back to the first workspace.
  useEffect(() => {
    if (workspaces.length === 0) return;
    if (!workspaceId || !workspaces.some((w) => w.id === workspaceId)) {
      setWorkspaceId(workspaces[0]!.id);
    }
  }, [workspaces, workspaceId, setWorkspaceId]);

  const activeWorkspaceId =
    workspaceId && workspaces.some((w) => w.id === workspaceId) ? workspaceId : null;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const canEdit = canEditRole(activeWorkspace?.role);
  // Avatars only add value once a workspace has more than one member.
  const showAvatars = (activeWorkspace?.memberCount ?? 1) > 1;

  const areasQuery = useAreas(activeWorkspaceId);
  const tasksQuery = useTasks(activeWorkspaceId);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusAreaId, setFocusAreaId] = useState<string | null>(null);

  const areas = areasQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const loading =
    workspacesQuery.isLoading || (!!activeWorkspaceId && (areasQuery.isLoading || tasksQuery.isLoading));
  const error = workspacesQuery.isError || areasQuery.isError || tasksQuery.isError;

  // Global keyboard shortcuts:
  // - Cmd/Ctrl+K: Toggle command palette
  // - Cmd/Ctrl+I (Insert task) or Cmd/Ctrl+N: Focus Add Task input
  // - C / N / A / I (when not typing): Focus Add Task input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }

      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "n")) {
        e.preventDefault();
        const inputs = document.querySelectorAll<HTMLInputElement>("[data-add-task]");
        if (inputs.length > 0) {
          inputs[inputs.length - 1]?.focus();
        }
        return;
      }

      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === "c" || k === "n" || k === "a" || k === "i") {
          e.preventDefault();
          const inputs = document.querySelectorAll<HTMLInputElement>("[data-add-task]");
          if (inputs.length > 0) {
            inputs[inputs.length - 1]?.focus();
          }
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleImport() {
    try {
      const parsed = await pickJsonFile();
      const tree = (Array.isArray(parsed) ? parsed : (parsed as { tree?: unknown }).tree) as ExportNode[];
      if (!Array.isArray(tree)) {
        pushToast({ kind: "error", message: "That file doesn't look like a Todora backup." });
        return;
      }
      if (!activeWorkspaceId) return;
      importTree.mutate({ tree, parentId: null, workspaceId: activeWorkspaceId });
    } catch (err) {
      if (err instanceof Error && err.message === "No file selected") return;
      pushToast({ kind: "error", message: err instanceof Error ? err.message : "Import failed" });
    }
  }

  const commands = useMemo<Command[]>(
    () => [
      ...(canEdit
        ? [
            {
              id: "new-task",
              label: "New task / Add task",
              hint: "⌘ I",
              run: () => {
                const inputs = document.querySelectorAll<HTMLInputElement>("[data-add-task]");
                if (inputs.length > 0) {
                  inputs[inputs.length - 1]?.focus();
                }
              },
            },
            {
              id: "new-area",
              label: "New area",
              hint: "root",
              run: () => {
                if (activeWorkspaceId) createArea.mutate({ name: "New area", parentId: null, workspaceId: activeWorkspaceId });
              },
            },
          ]
        : []),
      { id: "view-tree", label: "Switch to Tree view", run: () => setView("tree") },
      { id: "view-columns", label: "Switch to Columns view", run: () => setView("columns") },
      { id: "view-calendar", label: "Switch to Calendar view", run: () => setView("calendar") },
      { id: "theme", label: theme === "light" ? "Switch to dark theme" : "Switch to light theme", run: toggle },
      { id: "export", label: "Export backup (JSON)", run: () => downloadJson(buildExport(areas, tasks), "todora-backup.json") },
      ...(canEdit ? [{ id: "import", label: "Import backup (JSON)…", run: handleImport }] : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, areas, tasks, activeWorkspaceId, canEdit],
  );

  function pickTask(task: Task) {
    setView("tree");
    setFocusTaskId(task.id);
  }

  function pickArea(area: Area) {
    setView("tree");
    setFocusAreaId(area.id);
  }

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "var(--surface-content)" }}>
      <header
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center gap-2 justify-self-start">
          <Logo />
          <span
            style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            Todora
          </span>
          <div className="mx-1 h-5" style={{ width: 1, background: "var(--border-default)" }} />
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentId={activeWorkspaceId}
            onSelect={setWorkspaceId}
            currentAreaCount={areas.length}
            currentTaskCount={tasks.length}
          />
        </div>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          title="Search areas, tasks, or run a command (⌘K)"
          className="flex h-8 w-[380px] max-w-[40vw] cursor-text items-center gap-2 justify-self-center px-2.5"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-tertiary)",
          }}
        >
          <SearchIcon />
          <span className="flex-1 text-left" style={{ fontSize: "var(--text-sm)" }}>
            Search areas, tasks, or run a command…
          </span>
          <span
            className="shrink-0 px-1.5 py-0.5"
            style={{
              fontSize: "var(--text-2xs)",
              color: "var(--text-secondary)",
              background: "var(--surface-sunken)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-xs)",
            }}
          >
            ⌘K
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          <ViewSwitch view={view} onChange={setView} />
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts"
            className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center"
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              color: "var(--text-secondary)",
              background: "var(--surface-sunken)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-full)",
            }}
          >
            ?
          </button>
          <ZoomControl zoom={zoom} onZoomOut={zoomOut} onZoomIn={zoomIn} onReset={resetZoom} />
          <IconButton
            icon={theme === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggle}
            title="Toggle theme"
          />
          <NotificationsBell />
          {user && (
            <UserMenu
              label={user.name ?? user.username}
              onEditProfile={() => setProfileOpen(true)}
              onLogout={logout}
            />
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
            Loading…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div style={{ color: "var(--status-not-started-text)" }}>Could not reach the Todora server.</div>
            <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs)" }}>
              Is it running? Check DATABASE_URL in .env, then `npm run dev:server`.
            </div>
          </div>
        ) : !activeWorkspaceId ? (
          <div className="flex h-full items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
            No workspace selected.
          </div>
        ) : view === "tree" ? (
          <TreeView
            areas={areas}
            tasks={tasks}
            workspaceId={activeWorkspaceId}
            canEdit={canEdit}
            showAvatars={showAvatars}
            focusTaskId={focusTaskId}
            onFocusHandled={() => setFocusTaskId(null)}
            focusAreaId={focusAreaId}
            onAreaFocusHandled={() => setFocusAreaId(null)}
          />
        ) : view === "columns" ? (
          <ColumnViewScreen
            areas={areas}
            tasks={tasks}
            workspaceId={activeWorkspaceId}
            canEdit={canEdit}
            showAvatars={showAvatars}
          />
        ) : (
          <CalendarView areas={areas} tasks={tasks} canEdit={canEdit} />
        )}
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        tasks={tasks}
        areas={areas}
        onPickTask={pickTask}
        onPickArea={pickArea}
      />

      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--surface-content)" }}>
      <div style={{ color: "var(--text-tertiary)" }}>Loading…</div>
    </div>
  );
}

/** Wraps a route that requires a signed-in user; bounces to /login otherwise. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Wraps a public route (landing, login, signup); bounces signed-in users straight to /app. */
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RedirectIfAuthed>
            <LandingPage />
          </RedirectIfAuthed>
        }
      />
      <Route path="/home" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <AuthScreen initialMode="login" />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <AuthScreen initialMode="register" />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AuthedApp />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
