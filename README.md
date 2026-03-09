# Ethian

A self-hosted, open-source email client inspired by [Hey.com](https://hey.com)'s opinionated approach to email. Ethian routes incoming mail into intentional buckets using sender-based rules, giving you a calmer, more deliberate inbox.

> **Status:** Early development — foundation and schema complete, UI in progress.

---

## Core Concepts

Ethian replaces the traditional inbox with purpose-built views:

| View | Description |
|------|-------------|
| **Imbox** | Emails from approved senders. These need your attention. |
| **Feed** | Newsletters and digests. Read when you feel like it. |
| **Paper Trail** | Receipts, confirmations, order updates. Auto-filed. |
| **Screener** | Emails from unknown senders. You decide: approve, feed, paper trail, or block. |
| **Set Aside** | Emails you've parked to return to later. |
| **Reply Later** | Emails you've flagged to reply to. |

### The Screener
Every email from a sender you haven't seen before lands in the Screener. You see one entry per unknown sender (not per email). When you make a decision, all held emails from that sender are re-categorised and future emails are automatically routed — no repeated decisions.

### Multi-Account
Add as many IMAP/SMTP accounts as you like (Gmail, Fastmail, Outlook, any IMAP server). Sender rules are **user-level**, not per-account: approve a sender once and it applies across all your inboxes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| IMAP | [imapflow](https://imapflow.com) |
| SMTP | [nodemailer](https://nodemailer.com) |
| Queue | [BullMQ](https://bullmq.io) + Redis |
| Auth | [NextAuth.js v5](https://authjs.dev) (credentials) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│              Next.js App Router (React 19)              │
└───────────────────────┬─────────────────────────────────┘
                        │ Server Actions / Route Handlers
┌───────────────────────▼─────────────────────────────────┐
│                  Next.js Server                         │
│         PostgreSQL via Drizzle ORM                      │
└───────────────────────┬─────────────────────────────────┘
                        │ BullMQ jobs
┌───────────────────────▼─────────────────────────────────┐
│               Background Worker Process                 │
│  ┌─────────────────┐      ┌──────────────────────────┐  │
│  │  email-sync     │ ───► │  email-process           │  │
│  │  (per account)  │      │  (categorise + store)    │  │
│  └─────────────────┘      └──────────────────────────┘  │
│                                    │                     │
│                          imapflow (IMAP)                 │
└──────────────────────────────────────────────────────────┘
```

### Email Flow

1. BullMQ fires a repeatable `sync-account` job every 5 minutes per active mail account.
2. The worker connects via IMAP (imapflow), fetches emails since `lastSyncedAt`.
3. Each email is enqueued as a `process-email` job.
4. The processor runs `categorizeSender()`:
   - Exact address match in `sender_rules` → use that decision
   - Domain match in `sender_rules` → use that decision
   - No match → category is `screener`, entry upserted in `screener_queue`
5. Email is written to the `emails` table with its assigned category.

### Database Schema

```
users
  └── mail_accounts (IMAP/SMTP credentials, sync state)
        └── emails (messages, category, IMAP metadata)
              └── email_attachments

users
  └── sender_rules (approved/blocked/feed/paper_trail, per address or domain)
  └── screener_queue (one row per unknown sender, accumulates message_count)
```

See [`CLAUDE.md`](CLAUDE.md) for the full schema reference and column details.

---

## Prerequisites

- Node.js 20+
- npm (included with Node.js) or pnpm/yarn
- PostgreSQL 15+
- Redis 7+

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/mattnaus/ethian.git
cd ethian
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ethian
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=<generate below>
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_KEY=<generate below>
```

Generate secrets:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (must be 64 hex chars = 32 bytes)
openssl rand -hex 32
```

### 3. Initialise the database

```bash
# Push schema directly (development)
npm run db:push

# Or generate + apply migrations (production-style)
npm run db:generate
npm run db:migrate
```

### 4. Run the app

In two terminals:

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Background email sync worker
npm run worker:dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Adding an Email Account

Ethian works with any IMAP/SMTP provider. Common settings:

| Provider | IMAP host | IMAP port | SMTP host | SMTP port |
|----------|-----------|-----------|-----------|-----------|
| Gmail | `imap.gmail.com` | 993 | `smtp.gmail.com` | 465 |
| Fastmail | `imap.fastmail.com` | 993 | `smtp.fastmail.com` | 465 |
| Outlook | `outlook.office365.com` | 993 | `smtp.office365.com` | 587 |
| iCloud | `imap.mail.me.com` | 993 | `smtp.mail.me.com` | 587 |

> **Gmail:** Enable IMAP in Gmail settings and use an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled.

---

## Database Management

```bash
npm run db:generate   # Generate SQL migration from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:push       # Push schema directly (dev only, skips migrations)
npm run db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## Project Structure

```
ethian/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # /login, /register
│   │   ├── (app)/              # Authenticated views (imbox, feed, etc.)
│   │   └── api/                # Route handlers
│   ├── db/
│   │   ├── schema/             # Drizzle table definitions
│   │   └── index.ts            # db instance
│   ├── lib/
│   │   ├── imap/client.ts      # IMAP sync logic
│   │   ├── smtp/client.ts      # Send email
│   │   ├── queue/              # BullMQ queues + worker
│   │   ├── crypto.ts           # Password encryption
│   │   └── utils.ts            # cn() helper
│   └── types/index.ts          # Shared TypeScript types
├── drizzle/                    # Generated SQL migrations
├── .claude/work/               # Dated session work logs
├── CLAUDE.md                   # Architecture & conventions (for Claude Code)
└── .env.example
```

---

## Contributing

This project is in early development. Architecture decisions and conventions are documented in [`CLAUDE.md`](CLAUDE.md). Recent changes are logged in [`.claude/work/`](.claude/work/).

---

## License

MIT
