import { useState } from "react";
import {
  useCancelInvitation,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useWorkspaceMembers,
} from "../hooks";
import type { WorkspaceRole } from "../types";
import { ROLE_LABELS } from "../types";
import { Button } from "./primitives";
import { ApiError } from "../api";

const INVITABLE_ROLES: WorkspaceRole[] = ["EDITOR", "VIEWER"];

const selectStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--text-primary)",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-xs)",
} as const;

function RoleSelect({ value, onChange }: { value: WorkspaceRole; onChange: (r: WorkspaceRole) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as WorkspaceRole)}
      className="h-6 cursor-pointer px-1.5"
      style={selectStyle}
    >
      {INVITABLE_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Owner-only member/invite management for one workspace. Rendered by WorkspaceSwitcher. */
export function MembersDialog({
  workspaceId,
  workspaceName,
  onClose,
}: {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}) {
  const membersQuery = useWorkspaceMembers(workspaceId);
  const inviteMember = useInviteMember(workspaceId);
  const cancelInvitation = useCancelInvitation(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const updateMemberRole = useUpdateMemberRole(workspaceId);

  const [username, setUsername] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("EDITOR");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const members = membersQuery.data?.members ?? [];
  const pendingInvitations = membersQuery.data?.pendingInvitations ?? [];

  function submitInvite() {
    const trimmed = username.trim();
    if (!trimmed) return;
    setInviteError(null);
    inviteMember.mutate(
      { username: trimmed, role },
      {
        onSuccess: () => setUsername(""),
        onError: (e) => setInviteError(e instanceof ApiError || e instanceof Error ? e.message : "Could not send invite"),
      },
    );
  }

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
        className="flex max-h-[80vh] w-[440px] flex-col p-5"
        style={{
          background: "var(--surface-overlay)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
            Members — {workspaceName}
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
          <div style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Members
          </div>
          <div className="mt-1.5 flex flex-col gap-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 py-1">
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                  {m.user.username}
                </span>
                {m.role === "OWNER" ? (
                  <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>Owner</span>
                ) : (
                  <>
                    <RoleSelect value={m.role} onChange={(r) => updateMemberRole.mutate({ userId: m.userId, role: r })} />
                    <button
                      type="button"
                      title="Remove member"
                      onClick={() => removeMember.mutate(m.userId)}
                      className="cursor-pointer border-none bg-transparent p-0.5"
                      style={{ color: "var(--status-not-started-text)" }}
                    >
                      <CloseIcon />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {pendingInvitations.length > 0 && (
            <>
              <div className="mt-4" style={{ fontSize: "var(--text-2xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Pending invitations
              </div>
              <div className="mt-1.5 flex flex-col gap-1">
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 py-1">
                    <span className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                      {inv.invitedUser?.username}
                    </span>
                    <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-tertiary)" }}>{ROLE_LABELS[inv.role]}</span>
                    <button
                      type="button"
                      title="Cancel invitation"
                      onClick={() => cancelInvitation.mutate(inv.id)}
                      className="cursor-pointer border-none bg-transparent p-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <input
              value={username}
              placeholder="Username to invite"
              onChange={(e) => {
                setUsername(e.target.value);
                setInviteError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitInvite()}
              className="h-8 min-w-0 flex-1 border-none px-2.5 outline-none"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--text-primary)",
                background: "var(--surface-sunken)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="h-8 cursor-pointer px-2"
              style={selectStyle}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={submitInvite} disabled={!username.trim() || inviteMember.isPending}>
              Invite
            </Button>
          </div>
          {inviteError && (
            <div className="mt-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--status-not-started-text)" }}>
              {inviteError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
