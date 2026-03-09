# Ethian — Architecture & Developer Guide

## Project Overview

Ethian is a multi-account email client inspired by Hey.com's opinionated approach to email. Instead of a traditional inbox, Ethian sorts incoming email into intentional buckets using sender-based rules — a process called **Screening**.

### Hey-Inspired Concepts

| Concept | Hey equivalent | Description |
|---------|---------------|-------------|
| **Imbox** | The Imbox | Approved senders. Emails here need your attention. |
| **Feed** | The Feed | Newsletters, digests. Read when you feel like it. |
| **Paper Trail** | Paper Trail | Receipts, confirmations, order updates. Auto-filed. |
| **Screener** | The Screener | Emails from unknown senders. Approve or block. |
| **Set Aside** | Set Aside | Manually parked emails you'll return to later. |
| **Reply Later** | Reply Later | Emails flagged for follow-up. |

---

## Current Status

> Last updated: 2026-03-08

### What exists (foundation complete)

| Area | Status | Notes |
|------|--------|-------|
| Project scaffold | ✅ Done | Next.js 15, TS strict, Tailwind v4, all deps |
| Database schema | ✅ Done | All tables defined; no migrations applied yet |
| IMAP client | ✅ Done | `src/lib/imap/client.ts` — imapflow wrapper |
| SMTP client | ✅ Done | `src/lib/smtp/client.ts` — nodemailer wrapper |
| BullMQ queues | ✅ Done | `src/lib/queue/` — queues + sync worker with categorisation |
| Password encryption | ✅ Done | `src/lib/crypto.ts` — AES-256-CBC |
| Shared types | ✅ Done | `src/types/index.ts` — enums, Drizzle type re-exports |
| README | ✅ Done | Setup guide, architecture overview, provider table |
| CLAUDE.md | ✅ Done | This file |

### What exists (complete)

| Area | Status | Notes |
|------|--------|-------|
| Auth | ✅ Done | NextAuth.js v5 credentials; `/login`, `/register`, middleware, session |

### What's not built yet

| Area | Notes |
|------|-------|
| Mail account management | Settings UI + Server Actions to add/edit/delete IMAP accounts |
| Email views | Imbox, Feed, Paper Trail, Screener, Set Aside, Reply Later |
| Screener UI | Approve/block decisions, re-categorisation trigger |
| Email detail view | Thread view, body rendering, attachment download |
| Compose / Reply | SMTP send flow wired to UI |

### Next logical steps
1. Mail account CRUD (Server Actions + settings page)
2. Trigger initial sync when an account is added
3. Imbox view (list + detail)
4. Screener view (approve/block UI)

---

## UI & Design System

### Principles
- **shadcn/ui only** — use shadcn/ui components by default for all UI elements. Custom components require explicit user confirmation before building.
- **Dark mode only** — no light mode; all CSS variables and Tailwind classes target dark backgrounds.
- **Inspiration:** Linear (linear.app) and Superlist — clean, compact, high-contrast dark UI with strong typographic hierarchy.
- **Consistency is non-negotiable** — spacing, heights, borders, and colors must align perfectly across the app. When in doubt, measure against an existing element rather than guessing. Pixel-level alignment (e.g. sidebar header height matching the main panel header height) is expected, not optional.
- **PWA — desktop and mobile** — the app is a Progressive Web App, installable and usable on both desktop browsers and mobile devices (iOS/Android). Every UI decision must work well in both contexts. Mobile is not an afterthought.

### Color palette
| Role | Value | Usage |
|------|-------|-------|
| Background | `zinc-950` (#09090b) | App background, sidebar |
| Surface | `zinc-900` (#18181b) | Cards, panels, inputs |
| Border | `zinc-800` (#27272a) | Dividers, input borders |
| Text primary | `zinc-50` (#fafafa) | Headlines, body |
| Text muted | `zinc-400` (#a1a1aa) | Labels, secondary info |
| Accent | `orange-500` (#f97316) | Active nav, primary buttons, focus rings |
| Accent hover | `orange-400` (#fb923c) | Button hover states |
| Destructive | `red-500` (#ef4444) | Delete, error states |

### App shell layout
- **Left sidebar (desktop `≥ md`):** Fixed width 56px (`w-14`), icon-only rail, `zinc-950` background, `zinc-800` right border. Hidden on mobile.
- **Nav items:** Icon only (Lucide, `h-5 w-5`). Label shown in a Radix tooltip on hover (side=right, no delay).
- **Active state:** `orange-500` icon + `zinc-900` background pill (`bg-zinc-900`). Inactive hover: `bg-zinc-800/60`.
- **Main content:** Fills remaining width, `zinc-950` background.
- **Header height:** Both the sidebar logo bar and every main-panel top bar use `h-12` (48px) with `flex items-center`. This keeps the horizontal border line continuous across the full width of the app.
- **Mobile layout:** On small screens (< `md`, i.e. < 768px), the sidebar collapses to a bottom tab bar. Main content fills the full screen width. The header shrinks or is hidden in favour of the tab bar.

### Typography
- **Font:** Inter (already configured)
- **Density:** Compact — tight line heights, small-to-medium text sizes (14px body)
- **Hierarchy:** `text-sm` body, `text-xs` muted labels, `text-base` headings

### Component conventions
- Inputs: `zinc-900` background, `zinc-800` border, focus ring in `orange-500`
- Buttons (primary): `orange-500` bg, white text; hover `orange-400`
- Buttons (secondary/ghost): transparent bg, `zinc-400` text, hover `zinc-800` bg
- Cards/panels: `zinc-900` bg, `zinc-800` border, `rounded-lg`

### Responsiveness & touch
- **Mobile-first** — build for small screens first, then enhance for larger ones with `md:` / `lg:` variants.
- **Touch targets** — interactive elements must be at least 44×44px on mobile (use `min-h-11 min-w-11` / `p-3` where needed).
- **No hover-only interactions** — anything triggered by `:hover` must also be accessible via tap/focus. Don't hide critical affordances behind hover.
- **No fixed pixel widths** that would cause horizontal scroll on mobile. Use `max-w-*` + `w-full` patterns.
- **Safe areas** — account for iOS home indicator and notch using `pb-safe` / `env(safe-area-inset-*)` where relevant (bottom nav, modals).

### PWA requirements
- **Web app manifest** (`/public/manifest.json`) — name, icons, `display: standalone`, `theme_color`, `background_color`. Planned; not yet implemented.
- **Service worker** — planned for offline shell caching. Use Next.js PWA tooling (e.g. `next-pwa`) when ready.
- **Installable** — the app must meet browser installability criteria on both iOS Safari (Add to Home Screen) and Android Chrome.
- **Standalone mode** — when launched from home screen, the browser chrome is hidden. Layouts must not rely on browser navigation (back button). Provide in-app back navigation where needed.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Server Components + Server Actions for clean server/client split |
| UI | shadcn/ui + Tailwind CSS v4 | Unstyled accessible primitives; CSS-first config in v4 |
| Database | PostgreSQL + Drizzle ORM | Type-safe queries; migrations via drizzle-kit |
| IMAP | imapflow | Modern, Promise-based IMAP client with streaming support |
| SMTP | nodemailer | Battle-tested; supports all major providers |
| Queue | BullMQ + Redis | Reliable background processing; retries, rate limiting |
| Auth | NextAuth.js v5 (beta) | App Router compatible; credentials + OAuth ready |
| Encryption | Node.js crypto (AES-256-CBC) | Secure storage of IMAP/SMTP passwords in DB |
| PWA | Web app manifest + service worker (planned) | Installable on iOS/Android/desktop; standalone mode |

---

## Directory Structure

Directories and files marked `[planned]` are intended but not yet created.

```
ethian/
├── .claude/
│   └── work/                # Dated session work logs (YYYYMMDD.md)
├── drizzle/                 # Generated SQL migrations [planned — run db:generate]
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout (Inter font, global CSS)
│   │   ├── page.tsx         # Placeholder page
│   │   ├── globals.css      # Tailwind v4 + shadcn/ui CSS variables
│   │   ├── (auth)/          # /login, /register + Server Actions
│   │   ├── (app)/           # Authenticated app shell
│   │   │   ├── imbox/       # Imbox view [planned]
│   │   │   ├── feed/        # Feed view [planned]
│   │   │   ├── paper-trail/ # Paper Trail view [planned]
│   │   │   ├── screener/    # Screener view [planned]
│   │   │   ├── set-aside/   # Set Aside view [planned]
│   │   │   ├── reply-later/ # Reply Later view [planned]
│   │   │   └── settings/    # Account management [planned]
│   │   └── api/             # Route handlers (auth callbacks)
│   ├── db/
│   │   ├── schema/
│   │   │   ├── accounts.ts  # users, mail_accounts tables
│   │   │   ├── emails.ts    # emails, email_attachments tables
│   │   │   ├── senders.ts   # sender_rules, screener_queue tables
│   │   │   └── index.ts     # Re-exports + combined schema object
│   │   └── index.ts         # Drizzle db instance + connection pool
│   ├── lib/
│   │   ├── imap/
│   │   │   └── client.ts    # imapflow wrapper: createImapClient, syncMailbox
│   │   ├── smtp/
│   │   │   └── client.ts    # nodemailer wrapper: createTransport, sendEmail
│   │   ├── queue/
│   │   │   ├── index.ts     # BullMQ queue definitions + Redis connection
│   │   │   └── workers/
│   │   │       └── sync.worker.ts  # Background worker: sync + categorise
│   │   ├── crypto.ts        # AES-256-CBC encrypt/decrypt for passwords
│   │   └── utils.ts         # cn() Tailwind class merging helper
│   └── types/
│       └── index.ts         # Shared TS types, enums, Drizzle type re-exports
├── .env.example             # Environment variable template
├── CLAUDE.md                # This file — architecture & conventions
├── README.md                # User-facing setup guide and overview
├── drizzle.config.ts        # Drizzle Kit configuration
├── next.config.ts           # Next.js config (serverExternalPackages)
├── package.json
├── postcss.config.mjs       # PostCSS with @tailwindcss/postcss
├── tailwind.config.ts       # Tailwind v4 config (minimal)
└── tsconfig.json            # TypeScript strict mode + @/* path alias
```

---

## Database Schema

### `users`
Application users (one per login). Email + bcrypt password hash.

### `mail_accounts`
One row per email account (e.g. Gmail, Fastmail). Belongs to a user.
Stores encrypted IMAP and SMTP credentials. Tracks sync state.

| Column | Notes |
|--------|-------|
| `encrypted_password` | AES-256-CBC encrypted, see `src/lib/crypto.ts` |
| `sync_status` | `idle` / `syncing` / `error` |
| `last_synced_at` | Used as the IMAP `SINCE` search boundary |

### `emails`
One row per RFC 2822 message. The `message_id` + `mail_account_id` combination is effectively unique (duplicate check before insert).

| Column | Notes |
|--------|-------|
| `category` | The Ethian category (see below) |
| `thread_id` | Derived from `References` header; root message ID |
| `imap_uid` | IMAP UID in the source mailbox |
| `snippet` | First 200 chars of plain text for list previews |

### `email_attachments`
Attachment metadata. The actual bytes are referenced by `storage_key` (local filesystem path or object storage key).

### `sender_rules`
User-level rules (not per-account). A rule targets either:
- A specific `from_address` (`applies_to = 'address'`)
- An entire `from_domain` (`applies_to = 'domain'`)

Decisions: `approved` → Imbox, `feed` → Feed, `paper_trail` → Paper Trail, `blocked` → Trash.

### `screener_queue`
One row per unknown sender per user. Accumulates `message_count` as more emails arrive. Cleared when the user makes a decision (approve/block/categorize).

---

## Email Categories

```
EmailCategory =
  | "inbox"        // Imbox: approved senders
  | "feed"         // Newsletters (approved as feed)
  | "paper_trail"  // Receipts (approved as paper trail)
  | "screener"     // Unknown sender, pending decision
  | "set_aside"    // Manually parked
  | "reply_later"  // Flagged for follow-up
  | "sent"         // Sent mail
  | "draft"        // Unsent drafts
  | "trash"        // Deleted / blocked
  | "archive"      // Archived
```

---

## Email Flow

```
IMAP Server
    │
    │  (every 5 minutes via BullMQ repeatable job)
    ▼
email-sync queue
    │  sync-account job
    ▼
sync.worker.ts → syncMailbox()
    │  fetches all emails since lastSyncedAt
    │  fans out one job per email
    ▼
email-process queue
    │  process-email job (per email)
    ▼
sync.worker.ts → handleProcessEmail()
    │
    ├─ categorizeSender()
    │    ├─ Check sender_rules (address match)
    │    ├─ Check sender_rules (domain match)
    │    └─ → "screener" if no rule found
    │
    ├─ INSERT into emails (with category)
    │
    └─ if category == "screener":
         upsertScreenerEntry() → screener_queue
```

---

## Screener Logic

The Screener is the heart of Ethian's value proposition:

1. **Every new email** goes through `categorizeSender()`.
2. If the sender's email address has a rule → use that rule's decision.
3. Else if the sender's domain has a rule → use the domain rule.
4. Else → category is `"screener"` and a `screener_queue` entry is created.
5. The user sees the Screener view, which shows one entry per unknown sender.
6. User can **Approve** (→ creates an `approved` sender rule, re-categorizes emails to `inbox`), **Feed** (→ `feed` rule), **Paper Trail** (→ `paper_trail` rule), or **Block** (→ `blocked` rule, trashes emails).
7. Future emails from that sender/domain are automatically categorized.

Sender rules are **user-level** (not per mail account) so approving a sender on one account covers all your accounts.

---

## Multi-Account Model

```
User (1)
  └── MailAccount (many)   ← one per email address
        └── Email (many)   ← all fetched messages

User (1)
  └── SenderRule (many)    ← user-wide, covers all accounts
```

This means:
- A sender you approve from your personal Gmail is also approved when that sender emails your work address.
- Sender rules can be overridden per-account in future by adding an `mailAccountId` filter if needed.

---

## Conventions

### TypeScript
- **Strict mode** is enabled. No `any` — use `unknown` and type guards.
- Use Drizzle's `InferSelectModel` / `InferInsertModel` for DB types.
- Shared types live in `src/types/index.ts`.

### Database Access
- All DB access goes through the Drizzle `db` instance from `src/db/index.ts`.
- Use Drizzle's query builder (not raw SQL) for type safety.
- Migrations: run `npm run db:generate` then `npm run db:migrate`.

### Server Actions
- Use Next.js Server Actions for all mutations (form submissions, email operations).
- Keep Server Actions in `src/app/(app)/**/_actions/` co-located with the route.

### Background Work
- Long-running operations (IMAP sync, email processing) always go through BullMQ.
- Never run IMAP operations in a Next.js Server Action directly — add a job.

### Debugging Workflow

When the user reports a bug or problem:

1. **Investigate first** — read the relevant files, check logs, trace the code path. Do not make any changes.
2. **Report findings** — describe the root cause clearly: what is wrong, where it is, and why it happens.
3. **Propose the fix** — outline the planned changes and ask the user to confirm before touching any code.
4. **Implement on approval** — once confirmed, follow the standard workflow: write the fix, commit with a work log entry, run the reviewer.

Never skip to step 4 without explicit user confirmation of the proposed fix.

### Definition of Done
Every change — no matter how small — is only done when all of the following are complete:
1. Code is committed and pushed.
2. The **reviewer sub-agent** has been invoked (`/reviewer` or via the Agent tool with `.claude/agents/reviewer.md`).
3. Review findings are saved to `.claude/reviews/[feature]-[short-commit-hash].md`.
4. The review file and any updated `.claude/work/` files are committed and pushed.
5. **Wait for user approval** before implementing any reviewer suggestions — do not auto-fix Critical, Warning, or Suggestion findings. Present the review summary to the user and implement only what they explicitly approve.

**Skip condition:** Steps 2–4 are skipped **only** when the user's prompt explicitly ends with `- no review`.

### Committing & Pushing
- **Always commit and push after completing a task**, unless the user explicitly says otherwise.
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Stage specific files by name — avoid `git add -A` or `git add .`.
- Update `README.md` if the change affects setup, architecture, or user-facing behaviour.
- **All related files go in one commit.** The work log (`.claude/work/YYYYMMDD.md`), review files (`.claude/reviews/`), e2e spec files (`.claude/e2e_tests_to_make/`), and any lockfile changes (`package-lock.json`) must be staged and committed together with the code changes they document. Never leave these files uncommitted after a task is done.

### Password Storage
- IMAP/SMTP passwords are encrypted with AES-256-CBC before DB insert.
- Use `encrypt()` / `decrypt()` from `src/lib/crypto.ts`.
- The key is `ENCRYPTION_KEY` (64 hex chars = 32 bytes).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection URL (for BullMQ) |
| `NEXTAUTH_SECRET` | Yes | NextAuth.js signing secret |
| `NEXTAUTH_URL` | Yes | Canonical app URL |
| `ENCRYPTION_KEY` | Yes | 64 hex chars (32 bytes) for AES-256-CBC |

Generate secrets:
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY
openssl rand -hex 32
```

---

## Work Log Convention

Recent work is documented in [`.claude/work/`](.claude/work/) — see the dated files there for change history.

For every feature, bug fix, or change session, maintain a dated work log:

- **Location:** `.claude/work/YYYYMMDD.md` (e.g. `.claude/work/20260308.md`)
- If a file for the current date does not exist, **create it**.
- Append to the file if it already exists (multiple sessions on the same day).
- **Write the entry after committing**, not before — so the real commit hash is always available. Never use `(pending commit)` or placeholder text.

Each entry should document:
1. **Commit** — the short commit hash (first 8 chars) of the resulting commit, filled in immediately after `git commit`
2. **Request** — the feature, issue, or bug as described
3. **Plan** — the approach and key decisions made
4. **Changes** — files created/modified and what changed in each

Example entry format:
```markdown
## [Brief title] — `a1b2c3d4`

**Request:** ...

**Plan:** ...

**Changes:**
- `src/db/schema/accounts.ts` — added X column
- `src/lib/imap/client.ts` — fixed Y
```

---

## Development Workflow

### Initial setup
```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Fill in DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY
#    (see .env.example for generation commands)

# 3. Install dependencies
npm install

# 4. Push DB schema (first time) or run migrations
npm run db:push          # Fast for development
# or
npm run db:generate      # Generate migration SQL
npm run db:migrate       # Apply migrations

# 5. Start Next.js dev server
npm run dev

# 6. Start background worker (separate terminal)
npm run worker:dev
```

### Database changes
```bash
# 1. Edit schema files in src/db/schema/
# 2. Generate migration
npm run db:generate
# 3. Review generated SQL in drizzle/
# 4. Apply
npm run db:migrate
# 5. Inspect data
npm run db:studio
```

### Adding a new email provider
Most IMAP/SMTP providers work out-of-the-box. When adding a new account:
1. Find the provider's IMAP/SMTP host, port, and security settings.
2. Create a `MailAccount` row via the settings UI (Server Action).
3. The account will be synced on the next worker cycle (or immediately if you enqueue a `sync-account` job).

Common settings:
| Provider | IMAP host | IMAP port | SMTP host | SMTP port |
|----------|-----------|-----------|-----------|-----------|
| Gmail | imap.gmail.com | 993 | smtp.gmail.com | 465 |
| Fastmail | imap.fastmail.com | 993 | smtp.fastmail.com | 465 |
| Outlook | outlook.office365.com | 993 | smtp.office365.com | 587 |
| iCloud | imap.mail.me.com | 993 | smtp.mail.me.com | 587 |

For Gmail, you must use an App Password (not your Google account password) if 2FA is enabled.

---

## Key Design Decisions

### Why BullMQ instead of cron jobs?
IMAP sync can take seconds to minutes depending on the number of new emails. Running it inside a Next.js route handler would block the request. BullMQ gives us reliable retries, concurrency control, and visibility into job state.

### Why Drizzle over Prisma?
Drizzle generates zero runtime overhead — queries are plain SQL under the hood. It also has better support for complex PostgreSQL features (jsonb, arrays, enums) and the schema-as-code approach works well with TypeScript strict mode.

### Why per-user sender rules (not per-account)?
A sender is a person or service, not a mailbox. If you approve Stripe on your personal account, you want Stripe receipts to go to Paper Trail on your work account too. User-level rules make this automatic.

### Why AES-256-CBC for password storage?
We need to decrypt passwords at runtime to authenticate with IMAP/SMTP servers. Hashing (like bcrypt) is one-way and can't be used here. AES-256-CBC with a fresh IV per encryption gives strong symmetric encryption. For production, rotate to a KMS-backed approach.
