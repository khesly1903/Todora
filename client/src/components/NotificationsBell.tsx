import { useEffect, useRef, useState } from "react";
import { useApproveInvitation, useMyInvitations, useRejectInvitation } from "../hooks";
import { Button } from "./primitives";
import { pushToast } from "../toast";

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/** Header bell showing pending workspace invitations; approve/reject inline. */
export function NotificationsBell() {
  const invitationsQuery = useMyInvitations();
  const approve = useApproveInvitation();
  const reject = useRejectInvitation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const invitations = invitationsQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleApprove(id: string) {
    approve.mutate(id, {
      onError: (e) => pushToast({ kind: "error", message: e instanceof Error ? e.message : "Could not approve invitation" }),
    });
  }

  function handleReject(id: string) {
    reject.mutate(id, {
      onError: (e) => pushToast({ kind: "error", message: e instanceof Error ? e.message : "Could not reject invitation" }),
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center border-none bg-transparent p-0"
        style={{ color: "var(--text-secondary)" }}
      >
        <BellIcon />
        {invitations.length > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center px-0.5"
            style={{
              fontSize: 9,
              fontWeight: "var(--weight-semibold)",
              color: "white",
              background: "var(--status-not-started)",
              borderRadius: "var(--radius-full)",
            }}
          >
            {invitations.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-[150] w-[300px] p-1"
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
            Invitations
          </div>
          {invitations.length === 0 ? (
            <div className="px-2 py-3" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>
              No pending invitations.
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-1.5 p-2"
                  style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-sm)" }}
                >
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                    <strong>{inv.invitedBy?.name ?? inv.invitedBy?.username}</strong> invited you to{" "}
                    <strong>{inv.workspace?.name}</strong>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="flex-1">
                      <Button variant="primary" fullWidth onClick={() => handleApprove(inv.id)}>
                        Approve
                      </Button>
                    </div>
                    <div className="flex-1">
                      <Button variant="secondary" fullWidth onClick={() => handleReject(inv.id)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
