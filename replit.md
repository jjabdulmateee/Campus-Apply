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
- **Auth**: JWT (jsonwebtoken + bcryptjs), stored in localStorage, injected via setAuthTokenGetter
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **`artifacts/pakistan-apply`** — React+Vite frontend (`@workspace/pakistan-apply`), preview path `/`
- **`artifacts/api-server`** — Express API server (`@workspace/api-server`), preview path `/api`

## Architecture

### Frontend Pages
- `/` — Landing page (links to /login and /register)
- `/login` — JWT login page (demo credentials shown inline)
- `/register` — New account registration
- `/dashboard` — Application progress, stats, recent activity
- `/profile` — Personal profile (name, CNIC, gender, province, religion)
- `/education` — Academic history (matric/FSc boards, marks)
- `/testing` — Entrance exam scores (ECAT, MDCAT, NTS, SAT, GAT)
- `/activities` — Extracurriculars and achievements
- `/writing` — Personal statements / essays
- `/universities` — Search and filter 12 Pakistani universities
- `/universities/:id` — University detail with programs list + Apply button
- `/applications` — Track all submitted applications (with vertical status timeline)
- `/applications/:id/review` — 3-tab review + supplement Q&A + submit screen
- `/documents` — Document Locker: upload/manage CNIC, marksheets, transcripts, passport photo

### File Storage
- **Object Storage**: Google Cloud Storage (GCS) via Replit sidecar auth, bucket provisioned automatically
- **Upload flow**: 2-step presigned URL — client requests a signed PUT URL from `/api/storage/uploads/request-url`, then uploads directly to GCS (not through the backend)
- **Serving**: `GET /api/storage/objects/*` for private uploads, `GET /api/storage/public-objects/*` for public assets
- **Validation**: PDF/JPG/PNG only, 2MB max — enforced on both server and client
- **Env vars needed**: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` (auto-provisioned)

### Backend Routes (all under `/api`)
- `POST /api/auth/register` — Create account, returns JWT + seeded student profile
- `POST /api/auth/login` — Returns JWT token
- `GET /api/auth/me` — Get current user from JWT
- `GET/PUT /api/students/me/profile` — Personal info
- `GET/POST /api/students/me/academics` — Education history
- `PUT/DELETE /api/students/me/academics/:id`
- `GET/POST /api/students/me/test-scores` — Exam scores
- `PUT/DELETE /api/students/me/test-scores/:id`
- `GET/POST /api/students/me/activities` — Activities list
- `PUT/DELETE /api/students/me/activities/:id`
- `GET/POST /api/students/me/essays` — Personal statements
- `PUT/DELETE /api/students/me/essays/:id`
- `GET /api/students/me/dashboard` — Dashboard aggregated data
- `GET /api/universities` — List/filter universities
- `GET /api/universities/featured` — Featured universities
- `GET /api/universities/stats` — Counts by province/type
- `GET /api/universities/:id` — University detail
- `GET /api/universities/:id/programs` — University programs
- `GET/POST /api/applications` — List/create applications
- `GET/PUT/DELETE /api/applications/:id` — Application CRUD
- `POST /api/applications/:id/submit` — Submit application
- `GET /api/applications/:id/review` — Aggregated review data (student+academics+tests+essays+answers+validation)
- `GET/PUT /api/applications/:id/answers` — Supplement Q&A answers
- `GET /api/applications/summary` — Application counts by status
- `POST /api/storage/uploads/request-url` — Generate presigned GCS upload URL (validates file type + size)
- `GET /api/storage/objects/*` — Serve uploaded private objects
- `GET /api/documents` — List student documents
- `POST /api/documents` — Save document metadata after upload
- `DELETE /api/documents/:id` — Delete a document record

### Auth Middleware (`artifacts/api-server/src/middleware/auth.ts`)
- `verifyJWT` — Requires valid Bearer token
- `optionalJWT` — Attaches user if token present, otherwise fallback to demo-student-001
- `getStudentId(req)` — Returns real studentId or `"demo-student-001"`

### Database Schema (`lib/db/src/schema/`)
- `students` — Profile, academics, test scores, activities, essays
- `universities` — 12 Pakistani universities seeded
- `applications` — Student→Program applications with status tracking
- `auth` — `users` table (email, passwordHash, fullName, studentId) + `application_answers` table

### Supplement Questions (`artifacts/pakistan-apply/src/lib/supplements.ts`)
- Per-university question sets: LUMS, NUST, IBA, FAST-NU, UET, COMSATS
- Fallback default questions for all other universities
- `getSupplementQuestions(shortName)` returns `SupplementQuestion[]`

### Pakistani-specific Fields
- CNIC number, fatherName, religion, province (all 4 + ICT)
- BISE boards (federal, Lahore, Karachi, Peshawar, etc.)
- Entry tests: ECAT, MDCAT, NTS, LUMS LAT, SAT, GAT

## Demo Data
- Demo user: `student@pakmail.pk` / `demo123` → seeded on server startup via `seed-demo.ts`
- Demo student: `studentId = "demo-student-001"` (linked to demo user account)
- 12 universities seeded: LUMS, NUST, FAST-NU, IBA, UET, AKU, COMSATS, PU, KU, GIKI, BZU, QAU
- Programs seeded with degree type, department, duration, seats, entry test requirements

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push-force` — push DB schema changes (dev only)
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
