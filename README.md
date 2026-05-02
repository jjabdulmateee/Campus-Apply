# PakApply — The Pakistani Common App

A full-stack Pakistani university application portal that lets students complete one profile and apply to multiple universities from a single place. University admissions staff can review and decide on applications through a built-in Admin Portal.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS v4 |
| Backend | Node.js 24, Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Validation | Zod v4 + drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks) |
| Monorepo | pnpm workspaces |

---

## Local Setup

### Prerequisites
- Node.js 20+ and pnpm 9+
- A PostgreSQL database (set `DATABASE_URL` in your environment)

### Install dependencies

```bash
pnpm install
```

### Environment variables

Create a `.env` file (or set these in your shell / Replit Secrets):

```env
DATABASE_URL=postgres://user:password@localhost:5432/pakapply
SESSION_SECRET=your-long-random-secret-here
PORT=8080
```

### Push the database schema

```bash
pnpm --filter @workspace/db run push
```

### Start development servers

```bash
# API server (port 8080 by default)
pnpm --filter @workspace/api-server run dev

# Frontend (Vite, port auto-assigned)
pnpm --filter @workspace/pakistan-apply run dev
```

### Generate API client (after OpenAPI changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Full typecheck

```bash
pnpm run typecheck
```

---

## Demo Accounts

| Role | Email | Password | Access |
|---|---|---|---|
| Student / Admin (demo) | `student@pakmail.pk` | `demo123` | Full portal + Admin Portal |
| Dedicated Admin | `admin@pakmail.pk` | `admin123` | Admin Portal only |

> Both accounts are seeded automatically on server startup. No manual setup required.

---

## Feature Overview

### Student Portal
- **Profile** — Personal info, CNIC, province, religion (Pakistani-specific fields)
- **Education** — Matric / FSc / A-Level records with BISE board selection
- **Test Scores** — ECAT, MDCAT, NTS, LUMS LAT, SAT, GAT
- **Activities** — Up to 10 extracurriculars with role and hours
- **Essays** — Personal statements with 650-word limit counter
- **University Search** — 12 Pakistani universities with filters by province and type
- **Applications** — Apply, track status through 5-stage timeline, review + submit
- **Supplement Q&A** — Per-university questions (LUMS, NUST, IBA, FAST-NU, UET, COMSATS)
- **Document Locker** — Upload CNIC, marksheets, transcripts, passport photo (GCS-backed)

### Admin Portal
- **Admissions Queue** — Searchable / filterable applicant table with queue stats
- **Application Review** — Side-by-side student data, documents, decision panel
- **Decision Engine** — Approve / Reject / Waitlist / Request Info with reason tracking
- **Internal Notes** — Timestamped staff comments (not visible to students)

---

## Project Structure

```
├── artifacts/
│   ├── pakistan-apply/     # React + Vite frontend
│   └── api-server/         # Express API server
├── lib/
│   ├── db/                 # Drizzle ORM schema + migrations
│   ├── api-spec/           # OpenAPI spec (openapi.yaml)
│   └── api-client-react/   # Generated React Query hooks
└── scripts/                # Seed scripts
```

---

## Universities Seeded

LUMS, NUST, FAST-NU, IBA, UET Lahore, AKU, COMSATS, University of Punjab, University of Karachi, GIKI, BZU, Quaid-i-Azam University

---

## License

MIT
