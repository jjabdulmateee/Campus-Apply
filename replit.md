# PakApply — Pakistani College Application Portal

## Overview

PakApply is a full-stack Common App equivalent for Pakistani university students. Students fill one profile and apply to multiple Pakistani universities from a single portal. University admissions staff can review, decide on, and track applications through the Admin Portal.

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

**Student Portal**
- `/` — Landing page
- `/login` — JWT login (demo credentials shown inline)
- `/register` — New account registration
- `/dashboard` — Progress, stats, recent activity
- `/profile` — Personal profile (name, CNIC, gender, province, religion)
- `/education` — Academic history (matric/FSc boards, marks)
- `/testing` — Entrance exam scores (ECAT, MDCAT, NTS, SAT, GAT)
- `/activities` — Extracurriculars and achievements
- `/writing` — Personal statements / essays
- `/universities` — Search and filter 12 Pakistani universities (debounced search, province/type/deadline type/no-fee/no-essay filters, + save buttons)
- `/universities/:id` — University detail with programs list + Apply button
- `/my-colleges` — Saved college list: 5-stage progress tracker per college, expandable detail panel, status advancement
- `/applications` — Track all submitted applications (5-stage status timeline)
- `/applications/:id/review` — 3-tab review + supplement Q&A + submit screen
- `/recommenders` — Recommenders (FERPA): invite up to 3 teachers/mentors; status tracking (pending → submitted → declined)
- `/documents` — Document Locker: upload/manage CNIC, marksheets, transcripts, passport photo

**Admin Portal** (role-gated — requires `role === "admin"` in JWT)
- `/admin/dashboard` — Admissions queue: searchable/filterable applicant table, queue stats
- `/admin/applications/:id` — Full application review: side-by-side student data + documents, decision panel, internal notes

### File Storage
- **Object Storage**: Google Cloud Storage (GCS) via Replit sidecar auth
- **Upload flow**: 2-step presigned URL — client requests signed PUT URL from `/api/storage/uploads/request-url`, then uploads directly to GCS
- **Validation**: PDF/JPG/PNG only, 2MB max — enforced on both server and client
- **Env vars**: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` (auto-provisioned)

### Backend Routes (all under `/api`)

**Auth**
- `POST /api/auth/register` — Create account, returns JWT + seeded student profile
- `POST /api/auth/login` — Returns JWT token (includes `role` field)
- `GET /api/auth/me` — Get current user from JWT

**Student**
- `GET/PUT /api/students/me/profile`
- `GET/POST /api/students/me/academics`, `PUT/DELETE /api/students/me/academics/:id`
- `GET/POST /api/students/me/test-scores`, `PUT/DELETE /api/students/me/test-scores/:id`
- `GET/POST /api/students/me/activities`, `PUT/DELETE /api/students/me/activities/:id`
- `GET/POST /api/students/me/essays`, `PUT/DELETE /api/students/me/essays/:id`
- `GET /api/students/me/dashboard`
- `GET /api/students/me/colleges` — List saved colleges (with joined university data)
- `POST /api/students/me/colleges` — Save a college (idempotent)
- `DELETE /api/students/me/colleges/:universityId` — Remove from saved list
- `PATCH /api/students/me/colleges/:universityId` — Update application progress status

**Universities & Applications**
- `GET /api/universities`, `/featured`, `/stats`, `/:id`, `/:id/programs`
- `GET/POST /api/applications`, `GET/PUT/DELETE /api/applications/:id`
- `POST /api/applications/:id/submit`
- `GET /api/applications/:id/review`
- `GET/PUT /api/applications/:id/answers`
- `GET /api/applications/summary`

**Storage & Documents**
- `POST /api/storage/uploads/request-url`
- `GET /api/storage/objects/*`, `GET /api/storage/public-objects/*`
- `GET/POST /api/documents`, `DELETE /api/documents/:id`

**Admin** (all require `role === "admin"` in JWT — `requireAdmin` middleware)
- `GET /api/admin/stats` — Queue-level stats (total, pending, underReview, accepted, rejected)
- `GET /api/admin/applications` — List all non-draft applications; filterable by universityId, status; searchable by name/email/CNIC; sortable by date/name/score
- `GET /api/admin/applications/:id` — Full detail: profile, academics, tests, essays, documents, remarks
- `PUT /api/admin/applications/:id/decision` — Approve / Reject / Waitlist / Request Info + adminNotes + decisionReason
- `GET /api/admin/applications/:id/remarks` — List internal admin remarks
- `POST /api/admin/applications/:id/remarks` — Add internal remark (auto-advances status to under_review)

### Auth Middleware (`artifacts/api-server/src/middleware/auth.ts`)
- `verifyJWT` — Requires valid Bearer token (ALL student routes now use this — no unauthenticated access)
- `optionalJWT` — Attaches user if token present (used only where public access is needed)
- `requireAdmin` — Requires valid Bearer token AND `role === "admin"` in payload (403 otherwise)
- `getStudentId(req)` — Returns real studentId or `"demo-student-001"`

### Database Schema (`lib/db/src/schema/`)
- `students` — Profile, academics, test scores, activities, essays; profile now has `cnicDocumentUrl`, `transcriptUrl`, `photoUrl` columns for verification uploads
- `auth` — users, application_answers, admin_remarks, user_preferences, support_tickets, **recommenders** (studentId, firstName, lastName, email, subjectTaught, relationship, status: pending|submitted|declined)
- `universities` — 12 Pakistani universities seeded; new columns: `deadlineType`, `applicationFeeRequired`, `essayRequired`, `acceptsTransfer`
- `user_colleges` — Student saved-college list with 5-stage status: `researching → questions_started → recommenders_invited → review_and_submit → submitted`
- `applications` — Student→Program applications with status + `adminNotes`, `decisionReason`, `reviewedAt` columns
- `auth` — `users` table (email, passwordHash, fullName, studentId, **role: student|admin**) + `application_answers` + **`admin_remarks`** tables
- `documents` — Student uploaded document metadata

### Supplement Questions (`artifacts/pakistan-apply/src/lib/supplements.ts`)
- Per-university question sets: LUMS, NUST, IBA, FAST-NU, UET, COMSATS
- `getSupplementQuestions(shortName)` returns `SupplementQuestion[]`

### Pakistani-specific Fields
- CNIC number, fatherName, religion, province (all 4 + ICT)
- BISE boards (federal, Lahore, Karachi, Peshawar, etc.)
- Entry tests: ECAT, MDCAT, NTS, LUMS LAT, SAT, GAT

## Demo Data & Accounts

| Account | Email | Password | Role |
|---|---|---|---|
| Demo student (has admin role for testing) | `student@pakmail.pk` | `demo123` | admin |
| Dedicated admin | `admin@pakmail.pk` | `admin123` | admin |

- 12 universities seeded: LUMS, NUST, FAST-NU, IBA, UET, AKU, COMSATS, PU, QAU, UOP, BUITEMS, HU
- Programs seeded with degree, department, duration, seats, entry test requirements
- Demo student has `role = "admin"` so the **Admin Portal** button appears in the sidebar immediately after login with `student@pakmail.pk / demo123`

## Production Hardening (Step 6)

- **Error Boundary** — `ErrorBoundary.tsx` wraps the entire app (double-wrapped: outer + inner around Router); any uncaught render error shows a clean recovery UI instead of a blank page
- **Skeleton loaders** — Dashboard and ReviewApplication use shadcn/ui `<Skeleton>` components for per-field shimmer loading instead of block pulse
- **Print-friendly view** — `@media print` CSS in `index.css` hides sidebar/nav/buttons; ReviewApplication shows a clean A4 print header with date and university name; a printer icon button appears on submitted applications
- **Secrets audit** — All sensitive keys use `process.env.*`; demo passwords are intentional seed data, not production secrets; JWT secret uses `SESSION_SECRET` with a clearly-labeled dev fallback
- **README.md** — Created at project root with tech stack, setup instructions, env vars, demo credentials, feature overview, and project structure

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages (zero errors)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Design System

**Student portal**: `bg-sky-50`, primary `sky-600`, 3-column layout, glassmorphism cards
**Admin portal**: `bg-slate-900` top bar, `bg-slate-50` body, professional dark-header table layout

## Link Pattern
Always use `<Link href="..." className="...">` from wouter — never wrap in `<a>` (wouter's Link renders `<a>` itself)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
