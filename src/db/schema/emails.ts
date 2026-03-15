import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { mailAccounts } from "./accounts";
import { signatures } from "./signatures";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const emailCategoryEnum = pgEnum("email_category", [
  "inbox",        // Imbox: approved senders, needs attention
  "feed",         // Newsletters, updates (read when you want)
  "paper_trail",  // Receipts, confirmations, transactional
  "screener",     // New/unknown sender awaiting approval
  "set_aside",    // Manually parked for later
  "reply_later",  // Flagged to reply to
  "sent",
  "draft",
  "trash",
  "archive",
]);

// ---------------------------------------------------------------------------
// Emails table
// ---------------------------------------------------------------------------

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Account link
  mailAccountId: uuid("mail_account_id")
    .notNull()
    .references(() => mailAccounts.id, { onDelete: "cascade" }),

  // RFC 2822 identifiers
  messageId: text("message_id").notNull(), // Message-ID header value
  threadId: text("thread_id"), // Computed thread grouping key
  inReplyTo: text("in_reply_to"), // In-Reply-To header
  references: text("references").array(), // References header, split into array

  // Headers and envelope
  subject: text("subject").notNull().default("(no subject)"),
  fromAddress: text("from_address").notNull(),
  fromName: text("from_name"),
  toAddresses: jsonb("to_addresses")
    .notNull()
    .default([])
    .$type<Array<{ address: string; name?: string }>>(),
  ccAddresses: jsonb("cc_addresses")
    .notNull()
    .default([])
    .$type<Array<{ address: string; name?: string }>>(),
  bccAddresses: jsonb("bcc_addresses")
    .notNull()
    .default([])
    .$type<Array<{ address: string; name?: string }>>(),
  replyTo: text("reply_to"),
  headers: jsonb("headers")
    .notNull()
    .default({})
    .$type<Record<string, string | string[]>>(),

  // Body content
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  snippet: text("snippet").notNull().default(""), // First ~200 chars of plain text

  // Timestamps
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),

  // Status flags
  isRead: boolean("is_read").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  isTrashed: boolean("is_trashed").notNull().default(false),
  isDraft: boolean("is_draft").notNull().default(false),
  isSent: boolean("is_sent").notNull().default(false),

  // IMAP-specific
  imapUid: integer("imap_uid").notNull(),
  imapFlags: text("imap_flags").array().notNull().default([]),
  imapMailbox: text("imap_mailbox").notNull(), // Folder name on the server

  // Ethian category (Hey-inspired)
  category: emailCategoryEnum("category").notNull().default("screener"),

  // Snooze: when set, the email is hidden from its section until this time
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),

  // Signature chosen for this draft (nullable; only relevant for drafts)
  signatureId: uuid("signature_id").references(() => signatures.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index("idx_emails_thread_id").on(t.threadId),
  index("idx_emails_mail_account_message_id").on(t.mailAccountId, t.messageId),
]);

export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;

// ---------------------------------------------------------------------------
// Email attachments table
// ---------------------------------------------------------------------------

export const emailAttachments = pgTable("email_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),

  emailId: uuid("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),

  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull().default(0), // bytes

  // For inline images: the Content-ID header value (e.g. "<image001@...>")
  contentId: text("content_id"),

  // Where the attachment data is stored (local path or object storage key)
  storageKey: text("storage_key").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type NewEmailAttachment = typeof emailAttachments.$inferInsert;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const emailsRelations = relations(emails, ({ one, many }) => ({
  mailAccount: one(mailAccounts, {
    fields: [emails.mailAccountId],
    references: [mailAccounts.id],
  }),
  attachments: many(emailAttachments),
}));

export const emailAttachmentsRelations = relations(
  emailAttachments,
  ({ one }) => ({
    email: one(emails, {
      fields: [emailAttachments.emailId],
      references: [emails.id],
    }),
  })
);
