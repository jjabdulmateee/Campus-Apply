# PakApply — Pakistani College Application Portal

## Overview

PakApply is a full-stack Common App equivalent for Pakistani university students. Students fill one profile and apply to multiple Pakistani universities from a single portal.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (sky-blue design system)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **`artifacts/pakistan-apply`** — React+Vite frontend (`@workspace/pakistan-apply`), preview path `/`
- **`artifacts/api-server`** — Express API server (`@workspace/api-server`), preview path `/api`

## Architecture

### Frontend Pages
- `/` — Landing page
- `/dashboard` — Application progress, stats, recent activity
- `/profile` — Personal profile (name, CNIC, gender, province, religion)
- `/education` — Academic history (matric/FSc boards, marks)
- `/test-scores` — Entrance exam scores (ECAT, MDCAT, NTS, SAT, GAT)
- `/activities` — Extracurriculars and achievements
- `/writing` — Personal statements / essays
- `/universities` — Search and filter 12 Pakistani universities
- `/universities/:id` — University detail with programs list + Apply button
- `/applications` — Track all submitted applications

### Backend Routes (all under `/api`)
- `GET/PUT /api/students/me/profile` — Personal info
- `GET/PUT /api/students/me/academics` — Education history
- `GET/PUT /api/students/me/test-scores` — Exam scores
- `GET/PUT /api/students/me/activities` — Activities list
- `GET/PUT /api/students/me/essays` — Personal statements
- `GET /api/students/me/dashboard` — Dashboard aggregated data
- `GET /api/universities` — List/filter universities
- `GET /api/universities/featured` — Featured universities
- `GET /api/universities/stats` — Counts by province/type
- `GET /api/universities/:id` — University detail
- `GET /api/universities/:id/programs` — University programs
- `GET/POST /api/applications` — List/create applications
- `GET/PUT/DELETE /api/applications/:id` — Application CRUD
- `POST /api/applications/:id/submit` — Submit application
- `POST /api/applications/:id/withdraw` — Withdraw application
- `GET /api/applications/summary` — Application counts by status

### Database Schema (`lib/db/src/schema/`)
- `students` — Profile, academics, test scores, activities, essays
- `universities` — 12 Pakistani universities seeded
- `applications` — Student→Program applications with status tracking

### Pakistani-specific Fields
- CNIC number, fatherName, religion, province (all 4 + ICT)
- BISE boards (federal, Lahore, Karachi, Peshawar, etc.)
- Entry tests: ECAT, MDCAT, NTS, LUMS LAT, SAT, GAT

## Demo Data
- Demo student: `studentId = "demo-student-001"` (hardcoded, no auth yet)
- 12 universities seeded: LUMS, NUST, FAST-NU, IBA, UET, AKU, COMSATS, PU, KU, GIKI, BZU, QAU
- Programs seeded with degree type, department, duration, seats, entry test requirements

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — re-seed universities and demo student

## Design System
- Background: `sky-50`
- Primary: `sky-600`
- 3-column layout: fixed left sidebar (nav + progress) + main content + right panel (steps + help)
- Glassmorphism cards: `bg-white rounded-2xl border border-sky-100 shadow-sm`
- Active nav item: `bg-sky-600 text-white`

## Link Pattern
- Always use `<Link href="..." className="...">` directly from wouter — never wrap in `<a>` (wouter's Link renders `<a>` itself)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
