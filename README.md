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
- **Account Settings** — Change password/email, avatar upload, notification preferences, account deletion
- **Help & Support** — Searchable FAQ, support ticket submission, eligibility checker

### Admin Portal
- **Admissions Queue** — Searchable / filterable applicant table with queue stats
- **Application Review** — Side-by-side student data, documents, decision panel
- **Decision Engine** — Approve / Reject / Waitlist / Request Info with reason tracking
- **Internal Notes** — Timestamped staff comments (not visible to students)
- **Support Tickets** — View, reply to, and resolve student support tickets

---

## Help & Support System

### FAQ Management

FAQs are currently stored as static data in `artifacts/pakistan-apply/src/pages/HelpSupport.tsx` in the `FAQ_ITEMS` array. Each item has:

| Field | Description |
|---|---|
| `category` | One of: `application_tips`, `document_uploads`, `technical_issues`, `university_specifics` |
| `q` | The question text |
| `a` | The answer text |

**To add a new FAQ:** Edit the `FAQ_ITEMS` array in `HelpSupport.tsx` and add an object with `{ category, q, a }`. Redeploy to make the change live.

**To seed FAQs into the database** (if you migrate to DB-backed FAQs in the future), use:
```sql
INSERT INTO faq_items (category, question, answer, "order", is_active)
VALUES ('application_tips', 'Your question here?', 'Your answer here.', 1, true);
```

### Support Ticket Management (Admin)

Admins manage tickets from the Admin Portal → **Support Tickets** tab:

1. **View tickets** — All student tickets are listed, newest first. Filter by status (Open / In Progress / Resolved).
2. **Reply** — Click any ticket row to expand it. Type your reply in the text area, set the status, and click **Send Reply**.
3. **Status workflow:**
   - `Open` → ticket received, not yet reviewed
   - `In Progress` → admin is actively working on it
   - `Resolved` → issue has been addressed; student can see the reply

**Direct SQL queries for ticket management:**

```sql
-- List all open tickets
SELECT * FROM support_tickets WHERE status = 'open' ORDER BY created_at DESC;

-- Count unresolved tickets by category
SELECT category, COUNT(*) FROM support_tickets
WHERE status != 'resolved' GROUP BY category ORDER BY count DESC;

-- Mark a ticket resolved with a reply (replace :id, :reply, :admin_id, :admin_name)
UPDATE support_tickets
SET status = 'resolved',
    admin_reply = ':reply',
    admin_id = :admin_id,
    admin_name = ':admin_name',
    replied_at = NOW(),
    updated_at = NOW()
WHERE id = :id;
```

### Eligibility Checker

The Eligibility Checker in Help & Support uses approximate minimum aggregate cutoffs stored in `UNI_THRESHOLDS` (in `HelpSupport.tsx`). To update a university's cutoff:

1. Open `artifacts/pakistan-apply/src/pages/HelpSupport.tsx`
2. Find the `UNI_THRESHOLDS` array
3. Update the `cutoff` field for the relevant university (value is a percentage, e.g. `80` = 80%)
4. Redeploy

> **Note:** These are indicative cutoffs only and should be verified against each university's official merit list.

---

## Database Schema

Key tables:

| Table | Purpose |
|---|---|
| `users` | Auth accounts (email, password hash, role, avatar) |
| `student_profiles` | Extended student information |
| `applications` | Per-university applications with status |
| `application_answers` | University supplement Q&A answers |
| `documents` | Uploaded document metadata |
| `admin_remarks` | Internal staff notes on applications |
| `user_preferences` | Per-user notification settings |
| `support_tickets` | Student help requests + admin replies |

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
