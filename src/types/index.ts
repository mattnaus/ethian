/**
 * Shared TypeScript types and enums used across the Ethian application.
 *
 * These mirror the Drizzle pgEnum values so that application code can use
 * them as proper TypeScript types rather than raw string literals.
 */

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  users,
  mailAccounts,
  emails,
  emailAttachments,
  senderRules,
  screenerQueue,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Enum types (mirror pgEnum values)
// ---------------------------------------------------------------------------

/** The sync state of a mail account. */
export type SyncStatus = "idle" | "syncing" | "error";

/**
 * The category of an email in Ethian.
 * Maps to Hey.com-inspired concepts:
 *  - inbox       → Imbox: approved senders, needs attention
 *  - feed        → Newsletters, digests (read when you feel like it)
 *  - paper_trail → Receipts, confirmations, transactional (auto-filed)
 *  - screener    → Unknown sender awaiting your decision
 *  - set_aside   → Manually parked (you'll get back to it)
 *  - reply_later → Flagged to reply to
 *  - sent / draft / trash / archive → standard folders
 */
export type EmailCategory =
  | "inbox"
  | "feed"
  | "paper_trail"
  | "screener"
  | "set_aside"
  | "reply_later"
  | "sent"
  | "draft"
  | "trash"
  | "archive";

/**
 * The action to take on emails from a sender.
 *  - approved    → Goes to Imbox
 *  - blocked     → Silently moved to Trash
 *  - feed        → Goes to Feed
 *  - paper_trail → Goes to Paper Trail
 */
export type SenderDecision = "approved" | "blocked" | "feed" | "paper_trail";

/** Whether a sender rule applies to a specific address or an entire domain. */
export type AppliesTo = "address" | "domain";

// ---------------------------------------------------------------------------
// Drizzle inferred types (re-exported for convenience)
// ---------------------------------------------------------------------------

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type MailAccount = InferSelectModel<typeof mailAccounts>;
export type NewMailAccount = InferInsertModel<typeof mailAccounts>;

export type Email = InferSelectModel<typeof emails>;
export type NewEmail = InferInsertModel<typeof emails>;

export type EmailAttachment = InferSelectModel<typeof emailAttachments>;
export type NewEmailAttachment = InferInsertModel<typeof emailAttachments>;

export type SenderRule = InferSelectModel<typeof senderRules>;
export type NewSenderRule = InferInsertModel<typeof senderRules>;

export type ScreenerQueueItem = InferSelectModel<typeof screenerQueue>;
export type NewScreenerQueueItem = InferInsertModel<typeof screenerQueue>;

// ---------------------------------------------------------------------------
// UI / API types
// ---------------------------------------------------------------------------

/** Summary of a mail account for display in the sidebar. */
export interface MailAccountSummary {
  id: string;
  name: string;
  email: string;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  unreadCount: number;
}

/** A lightweight email row for list views. */
export interface EmailListItem {
  id: string;
  subject: string;
  fromAddress: string;
  fromName?: string | null;
  snippet: string;
  sentAt: Date;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  category: EmailCategory;
  threadId?: string | null;
  attachmentCount: number;
}

/** Thread view: a group of related emails. */
export interface EmailThread {
  threadId: string;
  subject: string;
  participants: Array<{ address: string; name?: string }>;
  emailCount: number;
  unreadCount: number;
  lastEmailAt: Date;
  category: EmailCategory;
  emails: Email[];
}

/** Screener entry shown to the user for review. */
export interface ScreenerEntry {
  id: string;
  fromAddress: string;
  fromName?: string | null;
  fromDomain: string;
  subject: string;
  messageCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  latestEmail: EmailListItem;
}

/** Pagination cursor for infinite-scroll email lists. */
export interface PaginationCursor {
  before?: string; // email ID (UUID) — fetch emails older than this
  after?: string;  // email ID — fetch emails newer than this
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}
