import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../types";
import { useCreateWorkspace, useDeleteWorkspace, useIsMobile, useRenameWorkspace } from "../hooks";
import { InlineInput, PlusIcon } from "./primitives";
import { DeleteConfirmDialog } from "./Dialog";
import { MembersDialog } from "./MembersDialog";
import { pushToast } from "../toast";

function WorkspaceIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 21 7 12 12 3 7 12 2" />
      <polyline points="3 12 12 17 21 12" />
      <polyline points="3 17 12 22 21 17" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const ROLE_BADGE_LABEL: Record<string, string> = { EDITOR: "Editor", VIEWER: "Viewer" };

/**
 * Header dropdown for switching between workspaces, plus create / rename / delete /
 * member management. Rename, delete, and "Manage members" are only offered for
 * workspaces the current user owns — shared workspaces show a role badge instead.
 */
export function WorkspaceSwitcher({
  workspaces,
  currentId,
  onSelect,
  currentAreaCount,
  currentTaskCount,
}: {
  workspaces: Workspace[];
  currentId: string | null;
  onSelect: (id: string) => void;
  currentAreaCount: number;
  currentTaskCount: number;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [membersTarget, setMembersTarget] = useState<Workspace | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const createWorkspace = useCreateWorkspace();
  const renameWorkspace = useRenameWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const current = workspaces.find((w) => w.id === currentId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenamingId(null);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function submitNew(name: string) {
    const trimmed = name.trim();
    setCreating(false);
    if (!trimmed) return;
    createWorkspace.mutate(
      { name: trimmed },
      {
        onSuccess: (ws) => {
          onSelect(ws.id);
          setOpen(false);
        },
        onError: (e) => pushToast({ kind: "error", message: e instanceof Error ? e.message : "Could not create workspace" }),
      },
    );
  }

  function submitRename(id: string, name: string) {
    const trimmed = name.trim();
    setRenamingId(null);
    if (!trimmed) return;
    renameWorkspace.mutate({ id, name: trimmed });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    deleteWorkspace.mutate(id, {
      onSuccess: () => {
        // Switch away from the deleted workspace to another one.
        const next = workspaces.find((w) => w.id !== id);
        if (next) onSelect(next.id);
        setOpen(false);
      },
      onError: (e) => pushToast({ kind: "error", message: e instanceof Error ? e.message : "Could not delete workspace" }),
    });
  }

  return (
    <div ref={ref} className="relative min-w-0 shrink">
      {isMobile ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={current ? `Workspace: ${current.name}` : "Switch workspace"}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
          }}
        >
          <WorkspaceIcon />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Switch workspace"
          className="flex h-8 min-w-0 max-w-[220px] cursor-pointer items-center gap-1.5 px-2.5"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
          }}
        >
          <span
            className="min-w-0 truncate"
            style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}
          >
            {current?.name ?? "Workspace"}
          </span>
          {current && current.role !== "OWNER" && (
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>
              {ROLE_BADGE_LABEL[current.role]}
            </span>
          )}
          <span style={{ color: "var(--text-tertiary)" }}>
            <ChevronDown />
          </span>
        </button>
      )}

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-[150] w-[280px] p-1"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            className="px-2 py-1"
            style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            Workspaces
          </div>

          {workspaces.map((ws) => {
            const active = ws.id === currentId;
            const isOwner = ws.role === "OWNER";
            if (renamingId === ws.id) {
              return (
                <div key={ws.id} className="flex items-center gap-2 px-2 py-1.5">
                  <InlineInput
                    defaultValue={ws.name}
                    onSubmit={(v) => submitRename(ws.id, v)}
                    onCancel={() => setRenamingId(null)}
                  />
                </div>
              );
            }
            return (
              <div
                key={ws.id}
                className="group flex items-center gap-1.5 rounded px-2 py-1.5"
                style={{ borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ws.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
                >
                  <span style={{ width: 14, color: "var(--accent-9)", flexShrink: 0 }}>
                    {active ? <CheckIcon /> : null}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)" }}
                  >
                    {ws.name}
                  </span>
                  {!isOwner && (
                    <span
                      className="shrink-0"
                      style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}
                      title={`Shared by ${ws.ownerName ?? ws.ownerUsername}`}
                    >
                      {ROLE_BADGE_LABEL[ws.role]}
                    </span>
                  )}
                </button>
                {isOwner && (
                  <>
                    <button
                      type="button"
                      title="Manage members"
                      onClick={() => setMembersTarget(ws)}
                      className="cursor-pointer border-none bg-transparent p-0.5 opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <PeopleIcon />
                    </button>
                    <button
                      type="button"
                      title="Rename workspace"
                      onClick={() => setRenamingId(ws.id)}
                      className="cursor-pointer border-none bg-transparent p-0.5 opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <PencilIcon />
                    </button>
                    {active && workspaces.some((w) => w.role === "OWNER" && w.id !== ws.id) && (
                      <button
                        type="button"
                        title="Delete workspace"
                        onClick={() => setDeleteTarget(ws)}
                        className="cursor-pointer border-none bg-transparent p-0.5 opacity-0 group-hover:opacity-100"
                        style={{ color: "var(--status-not-started-text)" }}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          <div className="my-1" style={{ borderTop: "1px solid var(--border-subtle)" }} />

          {creating ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span style={{ color: "var(--text-tertiary)" }}>
                <PlusIcon />
              </span>
              <InlineInput placeholder="New workspace…" onSubmit={submitNew} onCancel={() => setCreating(false)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-2 py-1.5 text-left"
              style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", borderRadius: "var(--radius-sm)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-sunken)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <PlusIcon />
              New workspace
            </button>
          )}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        name={deleteTarget?.name ?? ""}
        areaCount={currentAreaCount}
        taskCount={currentTaskCount}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {membersTarget && (
        <MembersDialog
          workspaceId={membersTarget.id}
          workspaceName={membersTarget.name}
          onClose={() => setMembersTarget(null)}
        />
      )}
    </div>
  );
}
