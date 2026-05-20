# PakApply / Campus-Apply — Read-Only System Audit

**Auditor role:** Senior System Architect & Lead QA Engineer
**Scope:** Static code & configuration audit only — no files were modified.
**Repository state inspected:** `E:\Campus-Apply` (Windows local migration from Replit).
**Workspace style:** pnpm monorepo (Node 24, TypeScript 5.9), `artifacts/api-server` (Express 5) + `artifacts/pakistan-apply` (React 19 + Vite 6) + `lib/db` (Drizzle + Postgres).

---

## 0. Executive Summary

The codebase is **functionally complete on Replit** but has **multiple hard blockers for local execution**, plus a few **logic/security defects that exist regardless of platform**. The single most-impactful issue causing "Save doesn't persist" symptoms locally is:

> **The Vite dev server has no `/api` proxy, the API client never sets a base URL, and the API server runs on a separate port.** Every `fetch("/api/...")` from the browser hits the Vite dev server (404 / index.html), not the Express server. The `PUT /api/students/me/profile` mutation therefore never reaches the database, so the next page load returns the unchanged row.

The next biggest blockers are: hardcoded **Replit GCS sidecar** for all uploads, **POSIX-only build/install scripts** that fail on Windows, and **`pnpm-workspace.yaml` overrides that delete the Windows native binaries** for `esbuild`, `rollup`, `lightningcss`, and `@tailwindcss/oxide`.

---

## 1. Findings Table — Feature × Status × Cause × Priority

| # | Feature / Area | Status | Technical Cause (file : line) | Priority |
|---|---|---|---|---|
| 1 | **Database connection string** | Working | `lib/db/src/index.ts:7-13` reads `process.env.DATABASE_URL` and throws if missing. `lib/db/drizzle.config.ts:4-13` does the same. **No hardcoded Replit DB URL.** Driver is `drizzle-orm/node-postgres` + `pg.Pool`. | ✅ OK |
| 2 | **Frontend → API connectivity (root cause of "data not persisting")** | **Broken** | (a) `artifacts/pakistan-apply/vite.config.ts` defines no `server.proxy`. (b) `lib/api-client-react/src/custom-fetch.ts:18,28` exposes `setBaseUrl` but **no caller ever invokes it** (grep returns zero hits in the frontend). (c) All calls use relative `"/api/..."` (`AuthContext.tsx:50`, `useUpload.ts:27`, `NotificationBell.tsx:26`, every Orval-generated hook). With API on `PORT=8080` and Vite on a different port, the browser hits Vite for `/api/*` and gets HTML/404. PUTs silently fail; GETs return parsed-as-JSON HTML which throws. | 🔴 P0 — blocks all persistence |
| 3 | **Profile "Save" — Language section** | Working server-side, **invisible to user without #2** | Schema column exists: `studentProfilesTable.languagesJson` (`lib/db/src/schema/students.ts:36`). API accepts: `UpdateMyProfileBody.languagesJson` (`lib/api-zod/src/generated/api.ts:89-92`). Backend persists: `routes/students.ts:212-256`. Front-end form correctly reads/writes via `LanguagePicker` (`Profile.tsx:142-200`). Will work as soon as #2 is fixed. | 🟡 P1 (depends on #2) |
| 4 | **Profile "Save" — Geography section** | Working server-side | Columns `birthCity`, `birthCountry` exist (`students.ts:34-35`); zod accepts them; backend persists; form binds them (`Profile.tsx:572-589`). | 🟡 P1 (depends on #2) |
| 5 | **Profile "Save" — Fee Waiver** | Working server-side | Column `feeWaiverEligible boolean` exists (`students.ts:37`); zod accepts; backend persists. | 🟡 P1 (depends on #2) |
| 6 | **Profile "Save" — Demographics, Contact, Address, Guardian, Legal Name** | Working server-side | All fields are present on `studentProfilesTable` and `UpdateMyProfileBody`; mapped 1:1 in `Profile.tsx:235-264`. | 🟡 P1 (depends on #2) |
| 7 | **Profile form validation (Zod)** | **Partial — looks stricter than it is** | Only `firstName`, `lastName`, `email` are actually required by the schema (`Profile.tsx:23-47`). Every other "required" label (Province, City, Address, Phone, Preferred Contact, Guardian Name/Relation) is **visual only** — the bottom **Save** button calls `update(values)` with no extra check (`Profile.tsx:275-277`). Only the **Next** button enforces `STEP_REQUIRED` (`Profile.tsx:308-321`). | 🟠 P2 |
| 8 | **Sidebar checkmark — `Writing` / Essays** | **Broken** | `AppLayout.tsx:215` maps `writing → ["essay"]`. The dashboard returns `section.slug = "writing"` (`routes/students.ts:151`). The match `s.slug.includes(t)` evaluates `"writing".includes("essay") === false`, so the green check never appears even when the personal statement is complete. Other slugs (`testing`/`test`, `activities`/`activity`, `courses`/`course`) match by accidental substring containment — fragile but works. | 🟠 P2 |
| 9 | **Sidebar checkmark — backed by DB?** | **Yes**, but trusts a derived heuristic | Source is `useGetMyDashboard()` → `dashboard.profileSections` → server-side `computeSections()` (`routes/students.ts:76-176`). Each entry's `isComplete` is computed from real DB columns (e.g., `Family.isComplete = !!profile.fatherName`, `Education.isComplete` requires both Matric/O-level **and** Inter/A-level rows). It is not pure UI state. | ✅ OK (with caveat #8) |
| 10 | **Document uploads (PDFs / images)** | **Broken locally** | `artifacts/api-server/src/lib/objectStorage.ts:12,18,21,241` hardcodes the Replit sidecar URL `http://127.0.0.1:1106`. The signed-URL call at line 240-254 explicitly throws `"make sure you're running on Replit"` if the sidecar is unreachable. There is **no AWS / Supabase / Cloudinary / local-disk fallback**. Requires env vars `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` (`objectStorage.ts:43-71`) that only Replit auto-provisions. | 🔴 P0 |
| 11 | **`vite.config.ts` requires Replit-only env vars** | **Broken locally** | `artifacts/pakistan-apply/vite.config.ts:7-27` throws if `PORT` or `BASE_PATH` is unset. It also unconditionally loads `@replit/vite-plugin-runtime-error-modal` (`vite.config.ts:5,34`); `cartographer` and `dev-banner` are gated on `REPL_ID` so they're skipped locally. | 🔴 P0 |
| 12 | **`api-server` requires `PORT`** | Trivial blocker | `artifacts/api-server/src/index.ts:5-17` throws if `PORT` is not set. | 🔴 P0 |
| 13 | **`api-server` `dev` script uses POSIX `export`** | **Broken on Windows** | `artifacts/api-server/package.json:7` — `"dev": "export NODE_ENV=development && pnpm run build && pnpm run start"`. Fails in PowerShell / `cmd.exe`. Use `cross-env` or set the var inline for Windows. | 🔴 P0 (Windows host) |
| 14 | **Root `preinstall` script is shell-only** | **Broken on Windows** | `package.json:6` — `"preinstall": "sh -c '...'"`. PowerShell has no `sh` on PATH by default; `pnpm install` will fail unless run from Git Bash / WSL. | 🔴 P0 (Windows host) |
| 15 | **Windows native binaries removed by `pnpm-workspace.yaml` overrides** | **Broken on Windows** | `pnpm-workspace.yaml` lines ~67-126 set the following to `'-'` (i.e. *excluded from install*): `esbuild>@esbuild/win32-x64`, `esbuild>@esbuild/win32-arm64`, `esbuild>@esbuild/win32-ia32`, `rollup>@rollup/rollup-win32-x64-msvc`, `rollup>@rollup/rollup-win32-arm64-msvc`, `lightningcss>lightningcss-win32-x64-msvc`, `lightningcss>lightningcss-win32-arm64-msvc`, `@tailwindcss/oxide>@tailwindcss/oxide-win32-x64-msvc`, `@tailwindcss/oxide>@tailwindcss/oxide-win32-arm64-msvc`. After `pnpm install` on Windows, builds will fail with "Could not load the X binary for this platform". Only the implicit Linux x64 GNU build is available — i.e. the lockfile was tuned for Replit's container. | 🔴 P0 (Windows host) |
| 16 | **`scripts/post-merge.sh`** | Cosmetic blocker | `.replit:18-20` registers `scripts/post-merge.sh` as a post-merge hook. Won't auto-run outside Replit; harmless if unused but listed as a `.replit` workflow. | 🟢 P3 |
| 17 | **JWT secret default** | Risk in prod, OK in dev | `artifacts/api-server/src/middleware/auth.ts:20-21` falls back to literal `"pakapp-dev-secret-change-in-prod"` if `SESSION_SECRET` is unset. README (line 39) documents the env var, but there is **no `.env.example`** to enforce setting it. | 🟠 P2 |
| 18 | **Hardcoded demo credentials seeded automatically** | Intentional, but a deployment hazard | `artifacts/api-server/src/routes/auth.ts:46-110` seeds `student@pakmail.pk` / `demo123` and `admin@pakmail.pk` / `admin123` on first API request after server boot. Also `artifacts/api-server/src/lib/seed-demo.ts` re-seeds the student. These accounts will silently exist in any production database that boots this build. | 🟠 P2 |
| 19 | **`getStudentId()` falls back to `"demo-student-001"`** | Real risk on `optionalJWT` routes | `middleware/auth.ts:83-85`: `return req.user?.studentId ?? "demo-student-001"`. Routes mounted under `optionalJWT` — `applications.ts:27` and `documents.ts:9` — therefore allow **unauthenticated** clients to read/write the demo student's applications and documents. Cross-tenant data exposure if demo data is ever real. (Student-profile/academics/tests/activities/essays routes use `verifyJWT` and are safe.) | 🟠 P2 |
| 20 | **Admin partner-invite returns plaintext password in HTTP body** | Acceptable but worth flagging | `artifacts/api-server/src/routes/admin.ts:391-406` — generates a 12-char temp password, hashes for storage, but **returns it as `tempPassword` in the response JSON**, then `AdminPartnerInvite.tsx:55-58` shows it in the UI for copy/paste. Logged in plaintext in the response body. | 🟢 P3 |
| 21 | **Hardcoded third-party API keys** | None found | `rg`-style search across `.ts/.tsx/.js/.mjs` for `api_key`, `apikey`, `Bearer`, `secret`, `token`: only matches are (a) JWT plumbing, (b) Drizzle table column names, (c) `useAuth` localStorage key `pakapp_token`. **No Stripe / OpenAI / SendGrid / GCP key embedded.** | ✅ OK |
| 22 | **Replit-specific URL/env code that will misbehave outside Replit** | Multiple sites | (a) Object storage sidecar — see #10. (b) `artifacts/api-server/src/utils/email.ts:74-81` `getAppUrl()` reads `REPLIT_DOMAINS`; without `APP_URL` set, verification + recommendation-invite links default to `http://localhost:80` (wrong for any real deployment). (c) `artifacts/api-server/src/routes/admin.ts:403` partner invite `loginUrl` uses `REPLIT_DOMAINS ?? "localhost"`. (d) `vite.config.ts:5,31` always loads `@replit/vite-plugin-runtime-error-modal` (no-op outside Replit but a runtime dep). | 🟠 P2 |
| 23 | **`/apply/:universityId` route** | Working but redundant | `App.tsx:109` registers it; `Apply.tsx:7-9` simply re-renders `UniversityDetail`. Not a dead end, but duplicate routing for the same view. | 🟢 P3 |
| 24 | **`/role-selection` route** | Working but **orphaned** | `App.tsx:96` is registered, but no `<Link>` or `setLocation()` in the codebase navigates to it. After registration the user is sent straight to `/profile` (`Register.tsx:59`). Reachable only by typing the URL. | 🟢 P3 |
| 25 | **`not-found.tsx` developer-facing copy** | Working but unprofessional | `pages/not-found.tsx:14-16`: "Did you forget to add the page to the router?" is shown to the **end user** — appropriate for dev, embarrassing in production. | 🟢 P3 |
| 26 | **Admin role enforcement** | Working | `requireAdmin` (`middleware/auth.ts:58-80`) returns 403 for non-admins; mounted at `routes/admin.ts:25`. Frontend `AdminRoute` (`App.tsx:67-88`) redirects non-admins to `/dashboard`. Two roles only: `student` & `admin` (`lib/db/src/schema/auth.ts:12`). Clear separation. **Caveat:** the README (line 78) and `replit.md` (line 134) claim the demo `student@pakmail.pk` has role `admin`; the seed code in `routes/auth.ts:62` actually inserts it as `role: "student"`, so the Admin Portal button will *not* appear when logging in with that account on a fresh DB. (`admin@pakmail.pk` is correctly seeded as admin.) Documentation drift. | 🟠 P2 (doc/data drift) |
| 27 | **Application submission validation** | Working | `routes/students.ts:686-769` (`/me/colleges/:id/validate` and `/submit`) and `routes/applications.ts:142-150` (`/applications/:id/review`) enforce: ≥1 academic record, ≥1 test score, personal statement word count, profile fields filled, signature length ≥ 2 chars. Returns 400 with structured `missing[]`. | ✅ OK |
| 28 | **`crypto.randomUUID` used without explicit import** | Works on Node 19+, fragile | `routes/auth.ts:201,274` and `routes/recommenders.ts:25` use the global `crypto`. OK on Node 24 (target). `lib/objectStorage.ts:3` correctly imports `randomUUID` from `"crypto"`. | 🟢 P3 |
| 29 | **`applicationsTable.status` enum has `"withdrawn"` but no UI flow** | Minor dead path | `lib/db/src/schema/applications.ts:5-7`. Filtered out of admin queue (`routes/admin.ts:64-65`) and student dashboard counts (`routes/students.ts:507`), but no client-side action to set it. | 🟢 P3 |
| 30 | **Honors / coursesJson fields** | Working, persisted as text | DB column `honors text` and `courses_json text` (`students.ts:64-65`); zod accepts; `Education.tsx:307-318` packs them as JSON strings before sending. Will work once #2 is fixed. | 🟢 OK |
| 31 | **Database migrations** | Missing | `lib/db/` has only `drizzle.config.ts` + schema; **no `migrations/` folder**. Schema is applied via `drizzle-kit push` (live `ALTER TABLE`s against the DB). This is OK for dev, **not** OK for production deploys; there is no migration history to roll back. | 🟠 P2 |
| 32 | **University / program seed data** | Manual step required | `scripts/src/seed.ts` seeds 12 universities + programs but is not wired into server startup; only demo *user* accounts are seeded automatically (`seedDemoAccounts()` in `routes/auth.ts:46`, `seedDemoUser()` in `lib/seed-demo.ts`). Without running the seed script, `/universities` is empty. README's Local Setup section does not mention the seed script. | 🟠 P2 |
| 33 | **`.env` template file** | Missing | No `.env.example` / `.env.template` at repo root. Users must read README + grep `process.env` to know what to set. Required vars: `DATABASE_URL`, `PORT` (×2 — different value for API vs Vite), `BASE_PATH`. Optional: `SESSION_SECRET`, `APP_URL`, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`SMTP_PORT`/`SMTP_FROM`, GCS storage trio. | 🟠 P2 |
| 34 | **CORS configuration** | Permissive | `artifacts/api-server/src/app.ts:28` — `app.use(cors())` with no options ⇒ `Access-Control-Allow-Origin: *` echoed. Fine for dev; may need tightening for prod. | 🟢 P3 |

**Status legend:** ✅ Working · 🟡 Partial · 🔴 Broken · 🟠 Risk / Defect · 🟢 Cosmetic
**Priority legend:** P0 = blocks running the app · P1 = blocks the headline feature once the app runs · P2 = correctness / security defect · P3 = polish

---

## 2. Section-by-Section Findings (matching your audit brief)

### 2.1 Data Persistence & Backend Audit

#### Database connection
- **Not hardcoded.** `lib/db/src/index.ts` and `lib/db/drizzle.config.ts` both read `process.env.DATABASE_URL` and throw a clear error if missing.
- Driver: `drizzle-orm/node-postgres` + `pg.Pool` — vanilla Postgres, not Neon/Supabase-specific. Any local Postgres (e.g. Docker `postgres:16`) works.
- **Required action locally:** create `.env` with `DATABASE_URL=postgres://user:pass@localhost:5432/pakapply`, then run `pnpm --filter @workspace/db run push` (the README mentions this) **and** `pnpm --filter scripts run start` or `tsx scripts/src/seed.ts` to seed universities (the README does *not* mention this).

#### Why "Save" doesn't persist on refresh
The 7 Profile sections (Legal Name, Address, Contact, Demographics, Language, Geography, Fee Waiver, Guardian, plus Documents) all have:
- correctly-typed columns in `studentProfilesTable` (`lib/db/src/schema/students.ts:7-40`),
- corresponding fields in the OpenAPI-generated `UpdateMyProfileBody` zod schema (`lib/api-zod/src/generated/api.ts:62-94`),
- a working `PUT /api/students/me/profile` handler that upserts and returns the row (`routes/students.ts:212-256`),
- a frontend form that correctly populates and submits all fields (`Profile.tsx:235-321`).

So the **persistence pipeline is sound on the server side**. The reason data appears to vanish on refresh is **architectural**, not logical:

1. `vite.config.ts` registers no `server.proxy`, so `/api/*` from the browser is served by **Vite** (returning `index.html` for unknown paths).
2. `lib/api-client-react/src/custom-fetch.ts:18-30` exposes `setBaseUrl(...)` to point at a remote API server, but a `grep` of the entire frontend shows **zero callers** — no startup code points the API client at the Express server.
3. Every fetch is relative: `AuthContext.tsx:50` (`apiFetch(path)` with `path="/api/auth/me"`), `useUpload.ts:27` (`/api/storage/uploads/request-url`), `NotificationBell.tsx:26` (`/api/notifications`), and all Orval-generated hooks.
4. On Replit this works because their reverse proxy mounts the API server under `/api` on the same external port as the Vite app. Locally you have two separate ports.

Result: `useUpdateMyProfile` returns "success" because Vite returns a 200 with an HTML body, the React Query mutation cache invalidates, and the next `GET /api/students/me/profile` reads HTML-as-JSON (which usually throws and is silently swallowed). Either way, the row in Postgres is unchanged.

#### Document uploads
- **Storage provider:** Google Cloud Storage **via the Replit sidecar** (`artifacts/api-server/src/lib/objectStorage.ts:12-30`). Auth uses external-account credentials whose `token_url` and `credential_source.url` both point at `http://127.0.0.1:1106` — a process that only exists inside a Replit container.
- The signed-URL endpoint at line 240-254 explicitly throws `"Failed to sign object URL ... make sure you're running on Replit"` when the sidecar is unreachable.
- No fallback provider (no AWS S3 client, no Supabase Storage, no Cloudinary, no local disk).
- Required env vars (`PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, implicitly `DEFAULT_OBJECT_STORAGE_BUCKET_ID`) are auto-provisioned by Replit and **must be set manually** (and a real GCP service account configured) to work locally.

### 2.2 Workflow & Logic Audit (Common-App Standard)

#### Sidebar checkmarks
- **Source of truth:** `useGetMyDashboard()` → `dashboard.profileSections[]` → `computeSections()` in `routes/students.ts:76-176`. Each entry's `isComplete` is computed from **actual DB rows / columns** (e.g. `Family.isComplete = !!profile.fatherName`; `Education.isComplete` requires both matric/O-level and inter/A-level academic rows; `Testing.isComplete` requires ≥ 1 `test_scores` row). So checkmarks are not pure UI state.
- **Defect (Writing slug mapping):** `AppLayout.tsx:209-217` maps `writing → ["essay"]` and matches with `s.slug.includes("essay")`. The dashboard returns `slug: "writing"` (`students.ts:151`). `"writing".includes("essay") === false`, so the Writing checkmark **never** turns green — even when the personal statement is 1 000 words. (Other slugs match by substring accident: `"testing".includes("test")`, `"activities".includes("activity")`, `"courses".includes("course")`. Brittle.)
- **Family section:** marked complete only if `fatherName` is filled — single-column heuristic.
- **Documents section:** complete only if both `cnicDocumentUrl` and `transcriptUrl` are present.

#### Form validation
- Profile zod schema (`Profile.tsx:23-47`) only requires `firstName`, `lastName`, `email`. The "required" red asterisk on Province / City / Address / Phone / Preferred Contact / Guardian Name & Relation is **cosmetic** — the bottom **Save** button submits whatever is in the form.
- The **Next** step button **does** enforce per-step required fields via `STEP_REQUIRED` (`Profile.tsx:73-83, 308-321`).
- Education (`Education.tsx:92-107`) requires `institution`, `level`, `passingYear`.
- Server-side **submission** validation is stricter and well done: `POST /api/students/me/colleges/:id/submit` (`routes/students.ts:739-794`) enforces name + ≥ 1 test score + ≥ 250-word PS + ≥ 2-char signature; `GET /me/colleges/:id/validate` returns the same `missing[]` for pre-submit display.
- `POST /api/applications/:id/review` (`applications.ts:142-150`) enforces a slightly looser set (PS ≥ 100 words). Two different bars for the same conceptual gate.

#### Dead-end routing
- `/apply/:universityId` (`App.tsx:109`) just re-renders `UniversityDetail` (`Apply.tsx:7-9`) — not a dead end, but a redundant route.
- `/role-selection` (`App.tsx:96`) is **orphaned** — no `<Link>` or `setLocation()` calls navigate to it; users go straight to `/profile` after registration (`Register.tsx:59`).
- `not-found.tsx:14-16` shows the literal string "Did you forget to add the page to the router?" to end users — dev copy in a user-facing page.
- `/admin/partners/invite` is wired (`App.tsx:115`, `AdminPartnerInvite.tsx`) but no link from `AdminDashboard.tsx` — reachable only by typing the URL.
- The status enum value `"withdrawn"` exists in the schema (`applications.ts:5-7`) and is filtered out of admin queues, but no UI sets it.

### 2.3 Authentication & Security Audit

#### User roles
- Two roles defined: `student` and `admin` (`lib/db/src/schema/auth.ts:12`).
- **Backend enforcement:** `requireAdmin` middleware (`middleware/auth.ts:58-80`) checks `role === "admin"` and returns 403 otherwise. `routes/admin.ts:25` mounts the entire admin router behind it.
- **Frontend enforcement:** `AdminRoute` (`App.tsx:67-88`) redirects non-authenticated users to `/login` and authenticated non-admins to `/dashboard`.
- **Documentation drift:** README (line 78) and `replit.md` (line 134) claim the demo `student@pakmail.pk` account has admin privileges. The seed code at `routes/auth.ts:62` inserts it with `role: "student"`. So the "Admin Portal" button will **not** appear after logging in as the demo student on a freshly seeded DB. (The `admin@pakmail.pk` / `admin123` account *is* correctly seeded as admin.)

#### Hardcoded API keys & secrets
- **JWT signing secret has a literal dev fallback:** `"pakapp-dev-secret-change-in-prod"` (`middleware/auth.ts:20-21`). The README documents `SESSION_SECRET` but the absence of `.env.example` makes it easy to ship to production with the dev fallback unchanged.
- **Demo credentials are hardcoded and auto-seeded** into Postgres on the first API call (`routes/auth.ts:46-110`): `student@pakmail.pk / demo123` and `admin@pakmail.pk / admin123`. Any deployed instance of this build will silently grant access to those credentials.
- **Plaintext temp-password in admin partner invite response** (`routes/admin.ts:391-406`): the freshly generated 12-char password is hashed for storage but also returned in the JSON body and displayed in the UI (`AdminPartnerInvite.tsx:55-58`). Acceptable for a one-time invite UX, but ends up in HTTP access logs.
- **No third-party API keys found.** Search across `.ts/.tsx/.js/.mjs` for `api_key`, `apikey`, `Bearer`, `secret`, `token` shows only JWT plumbing, Drizzle column names, and the localStorage key `pakapp_token` (`AuthContext.tsx:45`). No Stripe / OpenAI / SendGrid / GCP key embedded.
- **`getStudentId` security caveat:** `middleware/auth.ts:83-85` falls back to `"demo-student-001"` for any request without a JWT. The `applications` and `documents` routers are mounted under `optionalJWT` (`applications.ts:27`, `documents.ts:9`) — meaning **unauthenticated** clients can list/create/update/delete the demo student's applications and documents. All other student-data routes (profile, academics, tests, activities, essays) correctly use `verifyJWT`.

### 2.4 Infrastructure & Environment Audit

#### Missing dependencies / configuration to run locally vs. on Replit

| Item | Status | Notes |
|---|---|---|
| `.env` file | **Missing** | No `.env.example`. README documents only `DATABASE_URL`, `SESSION_SECRET`, `PORT` — but `BASE_PATH`, `APP_URL`, GCS trio, SMTP_*, and the *separate* `PORT` for Vite are not enumerated. |
| Postgres instance | **Required, not provisioned** | Replit auto-provisioned the DB; you must install Postgres locally (or run via Docker) and set `DATABASE_URL`. |
| DB schema | **Required step** | `pnpm --filter @workspace/db run push` (drizzle-kit). No migrations folder — schema state is whatever the latest schema files describe. |
| University & program seed | **Required step (not in README)** | Run `scripts/src/seed.ts` — but the README only mentions the demo accounts (which are seeded automatically). Without it, `/universities` is empty. |
| Vite `PORT` env | **Required** | `vite.config.ts:9-19` throws otherwise. |
| Vite `BASE_PATH` env | **Required** | `vite.config.ts:21-27` throws otherwise. Replit set this to `/`. |
| API `PORT` env | **Required** | `index.ts:5-17` throws otherwise. Must differ from Vite's `PORT`. |
| Vite `/api` proxy | **Required, not configured** | See finding #2. Until added, frontend cannot reach the API. |
| GCS object storage | **Replit-only path** | Cannot work without re-architecting `lib/objectStorage.ts` to support local disk / S3 / Supabase. |
| SMTP | **Optional** | `email.ts:16-25` falls back to logging the verify URL when `SMTP_HOST/USER/PASS` aren't set — usable for dev. |
| `pnpm` Windows binaries | **Removed by overrides** | `pnpm-workspace.yaml` excludes win32 binaries for esbuild, rollup, lightningcss, and tailwindcss/oxide — `pnpm install` will succeed but `pnpm build` / `vite dev` will fail at runtime on Windows. |
| `sh` interpreter | **Required for `preinstall`** | `package.json:6` — fails outside Git Bash / WSL on Windows. |
| `node 24` | **Required** | `.replit:1` declares `nodejs-24`; README says "Node 20+" but `replit.md` says 24. Some catalog versions (e.g. `@types/node ^25`) target 24+. |

#### Replit-specific code that will fail in standard production

1. **`artifacts/api-server/src/lib/objectStorage.ts:12-30, 240-258`** — Replit GCS sidecar (`http://127.0.0.1:1106`). Hardcoded; no env-var override; explicit error message references Replit. **All file uploads/downloads break outside Replit.**
2. **`artifacts/api-server/src/utils/email.ts:74-81`** — `getAppUrl()` reads `REPLIT_DOMAINS`; without `APP_URL` set, falls back to `http://localhost:80`. Verification + recommendation-invite links will be wrong.
3. **`artifacts/api-server/src/routes/admin.ts:403`** — partner-invite `loginUrl` uses `REPLIT_DOMAINS ?? "localhost"`.
4. **`artifacts/pakistan-apply/vite.config.ts:5,31,35-46`** — depends on `@replit/vite-plugin-runtime-error-modal` (always loaded), and conditionally `@replit/vite-plugin-cartographer` + `@replit/vite-plugin-dev-banner` (only when `REPL_ID` is set, so harmless locally). The runtime-error-modal package must remain installed.
5. **`package.json:6`** — `preinstall` is a `sh` one-liner that aborts non-pnpm installs. Fails on Windows shells.
6. **`artifacts/api-server/package.json:7`** — `dev` script uses POSIX `export NODE_ENV=development`. Fails on Windows.
7. **`scripts/post-merge.sh`** — Bash script registered as a `.replit:18-20` postMerge hook. No-op outside Replit.
8. **`pnpm-workspace.yaml`** — overrides explicitly remove all non-Linux native binaries. The lockfile is tuned for the Replit container; reinstalling on macOS/Windows will not pick up the right native modules unless those overrides are removed.
9. **`.replit`, `.replitignore`** — Replit-only configuration files; harmless but obsolete locally.
10. **`replit.md`** — documentation referencing Replit secrets, sidecar, and Replit object-storage tooling.

---

## 3. Recommended Remediation Order (read-only suggestions, no code applied)

> _For the user / next engineer — not implemented as part of this audit._

1. **(P0) Add a Vite proxy** in `artifacts/pakistan-apply/vite.config.ts` (`server.proxy = { "/api": "http://localhost:8080" }`) **OR** call `setBaseUrl(import.meta.env.VITE_API_URL)` from `main.tsx` and set `VITE_API_URL` in `.env`. Without one of these, **no persistence will ever work locally.**
2. **(P0) Replace the Replit GCS sidecar** in `lib/objectStorage.ts` with either (a) an S3-compatible client driven by env vars, (b) Supabase Storage, or (c) a local-disk fallback (`fs.writeFile` under `./uploads/` + `express.static`).
3. **(P0) Remove (or guard) the `'-'` overrides in `pnpm-workspace.yaml`** for `win32-*` and `darwin-*` native binaries — the lockfile was Replit-tuned; cross-platform installs need them.
4. **(P0) Replace POSIX-only scripts** (`api-server`'s `dev`, root `preinstall`) with `cross-env` and a Node-based pnpm guard.
5. **(P1) Ship a `.env.example`** at repo root listing every `process.env.*` consumed by the codebase.
6. **(P1) Auto-seed universities** on first server boot (or document `pnpm --filter scripts run start` in the README "Local Setup" section).
7. **(P1) Wire `verifyJWT` (not `optionalJWT`)** onto the `applications` and `documents` routers, or remove the `"demo-student-001"` fallback from `getStudentId`.
8. **(P2) Fix the Writing slug mismatch** in `AppLayout.tsx:215` (`writing → ["writing"]`) and rewrite the lookup to exact-equality, not `includes()`.
9. **(P2) Promote the Profile zod schema** to make the visually-required fields actually required (or remove the asterisks).
10. **(P2) Reconcile** the README claim that the demo student account has admin role with the actual seed code.
11. **(P2) Generate proper Drizzle migrations** (`drizzle-kit generate`) and commit them, replacing the `push` workflow for production deploys.
12. **(P2) Tighten CORS** to a known origin allow-list before any prod deployment.
13. **(P2) Replace** the literal `JWT_SECRET` dev fallback with a startup check that aborts when `NODE_ENV === "production"` and `SESSION_SECRET` is unset.
14. **(P3) Replace** `not-found.tsx` copy with a user-friendly 404, and either link to or remove the orphaned `/role-selection` route.

---

_End of audit. No source files were modified._
