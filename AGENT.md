# AGENT.md — Todora

## 1. Agent role & response guidelines

You are an expert full-stack software engineer acting as a pair programmer on this project.

- Be concise and direct; skip unnecessary pleasantries.
- Provide production-ready code and briefly explain the architectural reasoning behind non-obvious decisions.
- If a request is ambiguous, implement what is clear and explicitly ask about the missing details.
- Do not break existing working functionality unless explicitly asked to refactor.
- For complex features that span layers (e.g. a Prisma schema change plus React state changes), break the work into logical, chronological steps.
- All terminal commands and paths must be macOS/Unix compatible.
- Write atomic, descriptive commit messages.

## 2. Product overview

Todora is a hierarchical task-tracking application inspired by the macOS Finder.

Work is organized in a tree of **Areas** (folders). Areas can contain child Areas and **Tasks** (leaf nodes). Tasks carry a traffic-light status.

### View modes

All views operate on the same data model. The user's view preference is persisted, and a toolbar control switches between them.

- **Tree view (MVP):** a collapsible tree sidebar on the left, with the selected Area's tasks and item details in a main/inspector panel on the right.
- **Column view (v2):** Finder-style Miller columns — selecting an item opens its children in the next column to the right, in a horizontally scrolling container. Each column's create controls are two separate bordered composer boxes pinned to the top of the column (styled like Tree view's Add-task box): "Add task…" (the full `AddTaskBar` composer) above "New sub-area…". On mobile (< 768px) the view collapses to a single pane showing only the deepest drilled-into column — no side-by-side columns — with a back button that walks up one level at a time, mirroring Tree view's breadcrumb navigation but as a single stack (`useIsMobile()` in `client/src/hooks.ts`, drives `ColumnViewScreen.tsx`).
- **Calendar view:** a monthly grid placing tasks on their due date. Open tasks show as chips (overdue in red, completed hidden); drag a chip to another day to reschedule (`dueAt`). Clicking a **chip** opens the shared task inspector; clicking a **day** opens an add-task popover (title + priority segmented control + searchable area picker, with an explicit close button); a **"+N more"** control opens that day's full task list. The header navigates months (prev/next/Today).
- **List view:** shares the Tree view's left sidebar, but the right panel recursively displays the selected area and all of its sub-areas as sequential headings, along with their active tasks. Completed tasks are hidden, and empty sub-areas do not render. If no area is selected, a designed Empty State is shown.

```text
Tree view (MVP)
Sidebar / Tree                         Main content / Inspector
──────────────────────────────         ─────────────────────────
⌄ Classes                              Classes › Payments
  ⌄ Payments
      🔴 Build data grid                Tasks in the selected area
      🟡 Add sorting                    and/or selected item details
  ⌄ Attendance
      🔴 Build data grid
```

## 3. Data model

Model Workspaces, Areas, and Tasks as separate entities. Stable IDs and parent references — never path strings and never task titles — are the source of truth for hierarchy. Task titles do not use `#` prefixes; hierarchy is never inferred from titles.

### User

Authenticated account: `id`, `username` (unique, 3-24 chars, letters/numbers/underscore), `passwordHash` (bcrypt, cost 12), `name` (nullable display name, 1-50 chars, full Unicode letters/marks/spaces/hyphen/apostrophe/period via `/^[\p{L}\p{M} .'-]+$/u` — supports names like "Ayşe Öztürk"), `avatarSeed` (nullable; falls back to the user's `id` when unset), `avatarRegenDate` + `avatarRegenCount` (server-side tracking for the daily avatar-regeneration limit). No email, no external identity provider — registration and login are entirely in-app. Signing up auto-creates a personal Workspace ("My Workspace") the new user owns.

`name` is collected at signup (required there) and shown to other members instead of the raw `username` everywhere a person is displayed — member lists, invitations, task `createdBy`/`completedBy`, notifications — falling back to `username` when `name` is null (existing accounts predate the field). A profile dialog, opened from the header avatar menu, lets a signed-in user change their display name, get a new avatar, and, separately, change their password (requires the current password, bcrypt-verified).

**Avatars:** every user has a DiceBear (`adventurer-neutral`) SVG avatar built purely from `avatarSeed` (`client/src/avatar.ts` — no uploads, no image storage). `POST /api/auth/regenerate-avatar` assigns a new random seed, capped at 2 per UTC calendar day (429 `AvatarLimitError` past that). Avatars only render when a workspace has more than one member (`Workspace.memberCount`, computed server-side) — shown leftmost, before the status dot, on task rows in Tree and Columns (whoever created the task), and before the name in the task inspector's "Created by"/"Completed by" lines (`Avatar` component in `primitives.tsx`).

### Workspace

Top-level container that isolates one Area tree from another (e.g. `Personal` vs `Work`) and is the unit of sharing between users.

- `id`
- `name`
- `ownerId` (the `User` who owns it; owner cannot be removed or demoted)
- `createdAt`
- `updatedAt`

`listWorkspaces` also returns a computed `memberCount` (not a stored column) — used client-side to decide whether avatars are worth showing at all (see Avatars, above).

Every Area belongs to exactly one Workspace; all API list queries are workspace-scoped via `?workspaceId=` and additionally require the requesting user to be a member (401 if unauthenticated, 403 if not a member). The active workspace is chosen from a header dropdown (`WorkspaceSwitcher`) and persisted in `localStorage` (`todora-workspace`). A user always owns at least one workspace — their last owned workspace cannot be deleted (`LastWorkspaceError`).

### WorkspaceMember & roles

`WorkspaceMember` joins a `User` to a `Workspace` with a `role` (`OWNER` / `EDITOR` / `VIEWER`) and a per-user `sortOrder` (so each member can order their own workspace list independently). The owner is themselves a member with role `OWNER`.

| Role | Can do |
| --- | --- |
| `OWNER` | Everything below, plus rename/delete the workspace, invite/remove members, change member roles. Exactly one per workspace (the creator); ownership doesn't transfer. |
| `EDITOR` | View and edit all Areas/Tasks in the workspace (create, rename, move, delete, status, drag & drop). |
| `VIEWER` | Read-only: sees the full tree/columns/calendar and the task inspector, but every mutating control is hidden or disabled (`canEdit` prop threaded from `App.tsx` through `TreeView`/`ColumnViewScreen`/`CalendarView`/`TaskInspector`). |

### Invitation

Sharing is username-based, no email. An `OWNER` invites by exact `username` with a target role (`EDITOR` or `VIEWER`); this creates a `PENDING` `Invitation` for that user. The invited user sees it in the header `NotificationsBell` (polled every 30s + on focus) and **Approve**s (creates their `WorkspaceMember`) or **Reject**s it. Re-inviting after a reject resets the same row to `PENDING` (upsert on `(workspaceId, invitedUserId)`). Guards: can't invite yourself, can't invite an existing member, unknown username → 404.

### Area

- `id`
- `name`
- `parentId` (`null` for a root area within its workspace)
- `workspaceId` (denormalized; every area in a subtree shares one workspace)
- `sortOrder`
- `createdAt`
- `updatedAt`

The same Area name may appear in different branches: `Classes / Payments / Data Grid` and `Classes / Attendance / Data Grid` are valid and distinct. The full path is derived from ancestors at runtime.

### Task

- `id`
- `areaId` (tasks belong to exactly one Area)
- `title`
- `status`
- `sortOrder`
- `createdAt`
- `updatedAt`
- `completedAt` (`null` until completed)

Implemented beyond the core fields, all editable in the task inspector: `description` (free-text notes), `dueAt` (optional due date, set via a custom calendar date-picker popover), `priority` (`NONE` / `LOW` / `MEDIUM` / `HIGH`), and `tags` (string list).

`createdBy` / `completedBy` / `updatedBy` (server-derived, read-only): the `User` who created the task, the `User` who last moved it to `DONE`, and the `User` who last modified it (any field), all set from `req.userId` in `taskService.ts` — never client-supplied. `completedBy` is cleared (along with `completedAt`) whenever status moves away from `DONE` (`hierarchy.completedByFor`, mirrors `completedAtFor`). `updatedBy`/`updatedById` is set on every `updateTask`/`reorderTasks` call, including drag-reorder. All three are nullable — imported tasks (`importService.ts`) record the importing user as `createdBy` but leave `completedBy`/`updatedBy` null; any can also go null if that user's account is later removed (`onDelete: SetNull`). `createdBy`/`completedBy` are shown in the task inspector next to the Created/Completed timestamps ("by \<username\>").

Future fields (not yet): `startedAt`, `activityLog`.

### Persistence notes

- Prisma schema uses a self-relation on Area (adjacency list).
- For tree queries, either use a recursive CTE or fetch all rows and build the tree in memory — the latter is fine at personal-use scale and is the MVP default.
- **`prisma migrate dev` is currently broken** for this project's shadow-database replay: an early migration (`20260727185924_workspaces`) seeds a `Workspace` row before `Workspace.ownerId` becomes required in a later migration, so a from-scratch replay fails with a null-constraint error. Fixing it properly means `prisma migrate reset` (destructive, needs explicit user consent — this is dev data, not disposable test data). Until that happens, apply schema changes with `prisma db push` (safe, no data loss, no shadow DB) against the real dev database, then hand-write a matching migration `.sql` file and register it with `prisma migrate resolve --applied <name>` so migration history stays accurate without re-running the SQL.

## 4. Task statuses (traffic-light system)

Use exactly these three statuses:

| Status | Color | Meaning |
| --- | --- | --- |
| `NOT_STARTED` | 🔴 Red | Default state; not yet started. |
| `COOKING` | 🟡 Yellow | Actively being worked on. |
| `DONE` | 🟢 Green | Complete. |

- Display every task with a small colored status dot before its title.
- Clicking the status dot cycles: `NOT_STARTED` → `COOKING` → `DONE` → `NOT_STARTED`.
- When a task becomes `DONE`, set `completedAt` automatically. When it moves away from `DONE`, clear `completedAt`.
- Never rely on color alone — pair it with text or icons for accessibility.

## 5. Completed-task behavior

Completed tasks must not dominate the active list.

- When marked `DONE`, briefly show the green state, then fade the task out smoothly (Framer Motion) and move it to a collapsed `Completed (N)` section at the bottom of its Area.
- The completed section is collapsed by default; a `Show completed` control reveals it.
- Never delete completed tasks automatically.
- Sort completed tasks by `completedAt` descending unless the user manually reorders them.

## 6. Interactions & UX

Required interactions:

- Expand and collapse Areas; select an Area to view its direct child Areas and tasks. The tree sidebar also has expand-all / collapse-all buttons to open or close every Area at once.
- Add a child Area; add a task to the currently selected Area — fast and frictionless, no tags or special syntax required.
- Rename Areas and tasks inline.
- Change task status by clicking its status dot.
- Drag and drop Areas and tasks to reorder or move them.
- Show a breadcrumb for the selected Area or task.
- Preserve the selected item and expanded tree state during normal navigation.
- **Task title display & toggle:** Task titles in Tree View and Column View wrap and display up to 3 lines by default (`line-clamp-3`), expanding the row's vertical height (`min-h-7 py-1`, `min-h-[26px] py-1`) so rows never overlap. A toggle button in the tree header ("Multiple lines" vs "1 line") lets users switch between multi-line display and compact 1-line truncation (`localStorage` persisted via `todora-task-line-clamp`). Backend Zod validation schemas permit task titles up to 5,000 characters.

Behavioral rules:

- **Deletion always requires confirmation.** Deleting an Area deletes everything beneath it, so the confirmation dialog must state how many child Areas and tasks will be removed.
- **Empty states:** show a short onboarding/empty state when no Areas exist; show an "add a task" prompt inside an empty Area.
- **Progress:** an Area's progress is calculated from its descendant tasks (`DONE` counts as completed). Areas with no descendant tasks show no percentage — never `0%`.
- Use motion subtly: completion should feel satisfying, not distracting.
- Optimize for keyboard use where practical.

Keyboard shortcuts:

```text
Enter       Open or edit the selected item
Tab         Create a child Area or nested task where appropriate
Space       Cycle the selected task's status
Cmd/Ctrl N  Create a task in the selected Area
Cmd/Ctrl K  Command palette (implemented)
```

## 7. Tech stack & project structure

- **Frontend:** React 18, TypeScript (strict — avoid `any`), Tailwind CSS v4 (`@tailwindcss/vite`).
- **Routing:** react-router-dom v7 (`client/src/App.tsx`), split across the landing (`todora.xyz`) and app (`app.todora.xyz`) subdomains in production. `client/src/domains.ts` detects the current hostname (`isAppDomain` = starts with `app.`, `isProdLandingDomain` = `todora.xyz`/`www.todora.xyz`/any non-`app.` subdomain) and exposes `getAppUrl(path)`/`getLandingUrl(path)` for cross-subdomain links (plain `<a href>`, not React Router `Link`, since the two subdomains are separate SPA instances). Three route sets in `App.tsx`: on the **prod landing domain**, only the landing page renders and `/login`, `/signup`, `/app` hard-redirect (`window.location.replace`) to the app domain; on the **app domain**, `/` and `/app` render the authed product, `/login`/`/signup` render `AuthScreen`, and `/home` redirects out to the landing domain; on **localhost/anything else** (local dev without subdomains), all routes — landing, auth, and `/app` — live together on one origin as before, so local dev doesn't require `app.localhost` unless you want to test the split explicitly. `/` and `/home` are the public Hallmark-styled marketing landing page (`client/src/landing/`, own scoped design tokens under `.landing-page`); signed-in users are redirected to the app. `/login` and `/signup` render the same `AuthScreen` in different modes. Unknown paths redirect to `/`.
- **UI components:** hand-rolled primitives styled from the design tokens (`client/src/components/primitives.tsx`) — buttons, inline inputs, icons, breadcrumb, dialog/confirm, plus a custom calendar date-picker popover (`DatePicker.tsx`) and a monthly `CalendarView`. _Implementation note:_ the original plan called for shadcn/ui + Framer Motion; the app instead uses lightweight custom components with CSS-token styling and CSS transitions, so neither dependency is installed.
- **Drag & drop:** dnd-kit — reorder, cross-area move, area re-parenting, pull-to-top-level, and calendar drag-to-reschedule, shared across tree, columns, and calendar via `client/src/dnd.ts`. The tree view resolves area-onto-area drops by pointer position within the hovered row (`pointerWithin` collision detection, not `closestCenter`): the top/bottom bands reorder as a sibling, the middle band nests as a child, each rendered with a distinct visual indicator. Column view doesn't need this since each column only ever shows one level of siblings.
- **In-app zoom:** a header control (`ZoomControl` in `App.tsx`) scales the whole app 80-150% via CSS `zoom` on `<html>`, persisted to `localStorage` (`todora-zoom`) — lets users avoid relying on browser zoom.
- **Mobile responsive layout (< 768px):** On mobile screens, the header simplifies to display only the Logo, Workspace Switcher, flexible Search Bar (`⌘K`), and User Menu (PP). Tapping the User Menu reveals a mobile-only control panel containing the View Mode Selector (Tree/Columns/Calendar), Theme Switcher, Zoom Controls, Notifications Bell, and Keyboard Shortcuts, in addition to Edit profile and Log out. The Task Inspector (`TaskInspector.tsx`) renders as an inline 280px sidebar on desktop (`md:`), and as an overlay slide-over sheet from the right (`fixed inset-y-0 right-0 z-50`) with a dark backdrop on mobile screens.
- **Logo:** monochrome checklist mark in the header (`client/src/assets/logo.png`, inlined as a data URI), inverted to white in dark theme. The landing page reveal/nav mark is a hand-recreated inline SVG version of the same mark (crisp at any size; the raster PNG blurs when scaled up).
- **Server state:** TanStack Query for data fetching, caching, and optimistic updates (e.g. status cycling).
- **Backend:** Node.js, Express, TypeScript; REST API.
- **Auth & Subdomain CORS:** username/password (bcryptjs), JWT in an httpOnly `todora_token` cookie (`cookie-parser`, `jsonwebtoken`, 7-day expiry, `secure` in production only — localhost dev is plain HTTP). `cookieDomain` in `auth.ts` is set to `.todora.xyz` in production so auth cookies are shared seamlessly across subdomains (`todora.xyz` landing vs `app.todora.xyz` app). CORS (`index.ts`) allows requests flexibly from `localhost`, `127.0.0.1`, and any `.todora.xyz` subdomain with `credentials: true`. No external identity provider. `requireAuth` middleware gates all `/api/*` routes except `/api/auth/*`. Client-side gate lives in `client/src/auth.tsx` (`AuthProvider`/`useAuth`) with `AuthScreen.tsx` shown when signed out.
- **Database & ORM:** PostgreSQL, Prisma.
- **Structure:** monorepo with npm workspaces — `client/` and `server/`.
- **Testing:** Vitest, plus React Testing Library on the client.
- **Environment:** developed on macOS; deployed to production on Coolify (`todora.xyz`). Local dev uses PostgreSQL via docker-compose. Production: server runs `prisma migrate deploy && node dist/index.js` on every deploy (safe — unlike `migrate dev`, it doesn't hit the shadow-DB issue below); client is served via `vite preview` with `preview.allowedHosts` in `client/vite.config.ts` listing the production domain(s), and `VITE_API_URL` (build-time env var) points the client at the API's public origin when client and server are on different subdomains — leave it unset for local dev, where the Vite proxy handles `/api`.

## 8. Design system

The visual design lives in the "Todora Design System" project on claude.ai/design (projectId `83405992-9f56-4c97-804b-31454cf0fc94`), kept in sync via the DesignSync tool.

- Design tokens (colors — including accessible traffic-light status colors — typography, spacing, radius) are defined there and mirrored into the Tailwind config and shadcn/ui CSS variables. The design project is the source of truth for tokens.
- Key components to design and keep synced: task row with status dot, tree Area row (disclosure + progress), breadcrumb, inspector panel, delete-confirmation dialog, `Completed (N)` section.
- During development, push HTML previews of built components to the design project incrementally so design and code don't drift.

## 9. Coding standards

### Frontend

- Functional components and React hooks only.
- Keep UI components decoupled from data-fetching logic — data access lives in TanStack Query hooks (e.g. `useAreas`, `useMoveTask`), components consume them.
- Favor Tailwind CSS for styling; keep class strings readable.

### Backend

- Keep controllers thin; put business logic in service layers.
- Validate all incoming payloads before processing (zod recommended).
- Optimize hierarchical queries for the adjacency-list structure.

## 10. Safety rules & tests

- An Area must never be moved into itself or one of its descendants (cycle protection). Enforce this in the API and prevent it in the UI.
- An Area must never be moved into a different Workspace (`CrossWorkspaceError`). The UI never surfaces cross-workspace drops, so this is an API-level guard.
- The last workspace a user *owns* cannot be deleted (`LastWorkspaceError`); a user may still leave/lose access to shared workspaces they don't own.
- **Every area/task read and write is authorization-checked server-side** (`accessService.ts`: `assertMember` for reads, `assertEditor` for writes, `assertOwner` for workspace/member management) — the client hiding `VIEWER` controls is UX polish, not the security boundary. Cross-workspace area moves and task re-parenting are re-checked even for EDITORs.
- Only a workspace's `OWNER` can invite/remove members, change roles, or delete/rename the workspace; the owner's own membership can't be removed or demoted.
- Preserve user data; no destructive action without confirmation.
- Required test coverage: hierarchy traversal, moving nodes (including cycle protection), status updates, `completedAt` behavior, progress calculations, plus auth validation and role-hierarchy logic.
  - **Done:** 88 unit tests (`npm test --workspaces`: 32 server + 56 client). Server (`server/src/services/`): `hierarchy.test.ts` (subtree traversal, `wouldCreateCycle`, `completedAtFor`, `completedByFor`), `authValidation.test.ts` (username/password/name rules), `accessService.test.ts` (`roleAtLeast` role-hierarchy comparisons). Client (`client/src/__tests__/`): `tree`, `dnd`, `calendar`, `reorder`, `utils`, `backup`, `avatar`, `domains` (hostname/URL detection for the landing/app subdomain split — see prior entries). Pure logic is factored out (`hierarchy.ts`, `authValidation.ts`, `accessService.roleAtLeast`, `dnd.ts`, `reorder.ts`, `calendar.ts`, `avatar.ts`, `domains.ts`) so it's testable without a DB or browser. The DB-coupled auth/authorization/invitation flows (register, login, uniqueness, role enforcement, invite → approve/reject → membership, cross-workspace guards, avatar regeneration + its daily limit) are verified end-to-end via live API calls and in-browser with two real accounts rather than mocked-Prisma unit tests.

## 11. Scope

**MVP:** tree view, Area management, task creation, the three statuses, completion timestamps, completed-task hiding/showing, drag & drop, PostgreSQL persistence.

**Done beyond MVP:** authentication & multi-user sharing (username/password accounts with a separate Unicode display `name` and a DiceBear avatar, httpOnly JWT cookie sessions, per-workspace `OWNER`/`EDITOR`/`VIEWER` roles, username-based invitations with an approve/reject `NotificationsBell` inbox, owner-only `MembersDialog` for invite/role-change/remove, role-aware read-only UI everywhere via `canEdit`, a profile dialog for changing display name, regenerating the avatar (2/day limit), and changing password); avatars on task rows (Tree/Columns) and the task inspector's Created/Completed-by lines whenever a workspace has more than one member; workspaces (top-level Area-tree isolation via a header `WorkspaceSwitcher` dropdown — create/rename/delete with confirm, active workspace persisted, server-side `?workspaceId=` scoping plus membership checks, cross-workspace move + last-owned-workspace-delete guards); column view (with drag & drop and area delete, at parity with the tree); calendar view (third top-level view — monthly grid by due date, drag-to-reschedule, day-click add popover with priority + searchable area picker, "+N more" day list, completed tasks hidden); list view (fourth top-level view — recursive task list view for an entire sub-tree, showing empty states properly and hiding completed tasks); per-task inspector (title, status, priority, tags, due date via custom calendar picker, notes, timestamps, plus `createdBy`/`completedBy`/`updatedBy` attribution); view switcher (Tree / Columns / Calendar / List), with Columns collapsing to a single back-button-driven pane below 768px; drag & drop reorder, cross-area task move, area re-parenting, and pull-to-top-level, with pointer-accurate before/after/into drop bands in the tree (shared `resolveDragEnd`, all views); tree expand-all/collapse-all; keyboard shortcuts (Space/Enter/Delete/arrows/Cmd+N); Cmd+K command palette searching commands, areas, and tasks; sidebar search across areas and tasks (tree & columns); in-app zoom control (80-150%, persisted); mobile responsive header, rich mobile PP UserMenu, and slide-over overlay Task Inspector drawer; multi-line task title display (`line-clamp-3` with flexible row heights) and toggle ("Multiple lines" / "1 line"); a public marketing landing page (`/`, `/home` on `todora.xyz`) with its own design system, separate from `/login`, `/signup`, and the `/app` product on `app.todora.xyz`; JSON export/import; instant synchronous undoable deletes for areas and tasks; due-date + overdue display; `priority` and `tags`; global error toasts for failed mutations; header logo; unit test suite (88 tests); production deployment on Coolify.

**Out of scope for now:** self-service password *reset* via email (no SMTP — in-app password *change* while signed in is implemented), login rate-limiting, real-time collaboration (invitations are polled, not pushed), analytics, advanced tagging.
