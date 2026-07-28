import { useEffect, useMemo, useRef, useState } from "react";
import { useAreas, useCreateArea, useImportTree, useTasks, useWorkspaces } from "./hooks";
import { useAuth } from "./auth";
import { TreeView } from "./components/TreeView";
import { ColumnViewScreen } from "./components/ColumnViewScreen";
import { CalendarView } from "./components/CalendarView";
import { CommandPalette, type Command } from "./components/CommandPalette";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";
import { NotificationsBell } from "./components/NotificationsBell";
import { AuthScreen } from "./components/AuthScreen";
import { IconButton, Logo, MoonIcon, SearchIcon, SunIcon } from "./components/primitives";
import { buildExport, downloadJson, pickJsonFile } from "./backup";
import { pushToast } from "./toast";
import type { ExportNode } from "./api";
import type { Task } from "./types";
import { canEditRole } from "./types";

type Theme = "light" | "dark";
type ViewMode = "tree" | "columns" | "calendar";

const VIEW_LABELS: Record<ViewMode, string> = {
  tree: "Tree",
  columns: "Columns",
  calendar: "Calendar",
};

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

function UserMenu({ username, onLogout }: { username: string; onLogout: () => void }) {
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
        title={username}
        className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center border-none"
        style={{
          fontSize: "var(--text-2xs)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-primary)",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-full)",
        }}
      >
        {username.slice(0, 1).toUpperCase()}
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
          <div className="px-2 py-1.5" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
            {username}
          </div>
          <div className="my-1" style={{ borderTop: "1px solid var(--border-subtle)" }} />
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
  const [view, setView] = useViewMode();
  const workspacesQuery = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useCurrentWorkspaceId();
  const createArea = useCreateArea();
  const importTree = useImportTree();

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);

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

  const areasQuery = useAreas(activeWorkspaceId);
  const tasksQuery = useTasks(activeWorkspaceId);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);

  const areas = areasQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const loading =
    workspacesQuery.isLoading || (!!activeWorkspaceId && (areasQuery.isLoading || tasksQuery.isLoading));
  const error = workspacesQuery.isError || areasQuery.isError || tasksQuery.isError;

  // Cmd/Ctrl+K toggles the command palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
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
          title="Search tasks or run a command (⌘K)"
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
            Search tasks or run a command…
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
          <IconButton
            icon={theme === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggle}
            title="Toggle theme"
          />
          <NotificationsBell />
          {user && <UserMenu username={user.username} onLogout={logout} />}
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
            focusTaskId={focusTaskId}
            onFocusHandled={() => setFocusTaskId(null)}
          />
        ) : view === "columns" ? (
          <ColumnViewScreen areas={areas} tasks={tasks} workspaceId={activeWorkspaceId} canEdit={canEdit} />
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
      />

      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--surface-content)" }}>
        <div style={{ color: "var(--text-tertiary)" }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <AuthedApp />;
}
