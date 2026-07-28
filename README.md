# Todora

[![License: MIT](https://img.shields.io/github/license/khesly1903/Todora)](LICENSE)

A hierarchical task-tracking app inspired by the macOS Finder. Work is organized in a tree of **Areas** (folders) that can hold child Areas and **Tasks** — not a single flat to-do list.

**[Landing page](client/src/landing/LandingPage.tsx)** · [License](LICENSE)

## Routes

| Path | Page |
| --- | --- |
| `/` | Marketing landing page (redirects to `/app` if already signed in) |
| `/home` | Same landing page, always visible — even while signed in |
| `/login` | Sign in |
| `/signup` | Create an account |
| `/app` | The product itself (tree / columns / calendar) — requires sign-in |

## Features

- **Areas & Tasks tree** — nest Areas as deep as a project needs; the same Area name can appear in different branches.
- **Three-state task status** — Not started / Cooking / Done, cycled by clicking a status dot, always paired with text (not colour alone).
- **Three views on one data model** — a collapsible Tree, Finder-style Columns, and a monthly Calendar with drag-to-reschedule.
- **Workspaces & sharing** — username-based invitations, per-workspace roles (Owner / Editor / Viewer), no email required.
- **Drag & drop** — reorder, move across Areas, re-parent Areas, pull to top level — shared across all three views.
- **Keyboard-first** — Cmd/Ctrl+K command palette, Space to cycle status, Cmd/Ctrl+N to add a task.
- Due dates, priority, tags, notes, JSON export/import, undoable deletes, task search.

## Tech stack

- **Client:** React 18, TypeScript, Tailwind CSS v4, TanStack Query, dnd-kit, Vite.
- **Server:** Node.js, Express, TypeScript, Prisma, PostgreSQL.
- **Auth:** username/password (bcrypt), JWT in an httpOnly cookie.

See [AGENT.md](AGENT.md) for the full data model, API design, and safety rules.

## Getting started

Requires Node.js 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm run --workspace server prisma:generate
npm run --workspace server prisma:migrate
npm run dev             # runs client (5173) and server (3001) together
```

Other useful scripts:

```bash
npm run typecheck   # both workspaces
npm test            # both workspaces
```

## License

[MIT](LICENSE) © 2026 Berkay Kaya
