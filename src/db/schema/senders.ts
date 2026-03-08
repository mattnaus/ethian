import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users, mailAccounts } from "./accounts";
import { emails } from "./emails";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const senderDecisionEnum = pgEnum("sender_decision", [
  "approved",    // Goes to Imbox
  "blocked",     // Silently trashed
  "feed",        // Goes to Feed
  "paper_trail", // Goes to Paper Trail
]);

export const appliesToEnum = pgEnum("applies_to", [
  "address", // Rule applies to a specific email address
  "domain",  // Rule applies to all emails from a domain
]);

// ---------------------------------------------------------------------------
// Sender rules table
// ---------------------------------------------------------------------------
// Sender rules are user-level (not per-account) so one rule covers all your
// inboxes. e.g. if you approve "newsletters@substack.com" on your personal
// account, it's also approved when received on your work account.

export const senderRules = pgTable(
  "sender_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Rules belong to a user, not a specific mail account
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // The sender identifier this rule targets
    fromAddress: text("from_address"), // specific address (e.g. "hello@stripe.com")
    fromDomain: text("from_domain"),   // domain (e.g. "stripe.com")

    // Optional display info
    displayName: text("display_name"), // friendly label for this sender/domain

    // What to do with emails from this sender/domain
    decision: senderDecisionEnum("decision").notNull(),

    // Whether this rule targets a specific address or an entire domain
    appliesTo: appliesToEnum("applies_to").notNull(),

    // True if the system created this rule suggestion (user may not have
    // explicitly reviewed it yet)
    isAutoDetected: boolean("is_auto_detected").notNull().default(false),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // A user can only have one rule per specific address
    uniqueUserAddress: unique("sender_rules_user_address_unique").on(
      table.userId,
      table.fromAddress
    ),
    // A user can only have one rule per domain
    uniqueUserDomain: unique("sender_rules_user_domain_unique").on(
      table.userId,
      table.fromDomain
    ),
  })
);

export type SenderRule = typeof senderRules.$inferSelect;
export type NewSenderRule = typeof senderRules.$inferInsert;

// ---------------------------------------------------------------------------
// Screener queue table
// ---------------------------------------------------------------------------
// When an email arrives from an unknown sender (no matching rule), we hold
// it here for the user to decide. Each row represents one unknown sender
// within a user's account. Multiple emails from the same sender accumulate
// the messageCount; only one screener_queue row exists per (userId, fromAddress).

export const screenerQueue = pgTable("screener_queue", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  mailAccountId: uuid("mail_account_id")
    .notNull()
    .references(() => mailAccounts.id, { onDelete: "cascade" }),

  // The email that triggered this screener entry (most recent from sender)
  emailId: uuid("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),

  // Sender info (denormalized for fast screener display)
  fromAddress: text("from_address").notNull(),
  fromName: text("from_name"),
  fromDomain: text("from_domain").notNull(),
  subject: text("subject").notNull(), // Subject of the first email from this sender

  // How many emails are waiting from this sender
  messageCount: integer("message_count").notNull().default(1),

  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ScreenerQueueItem = typeof screenerQueue.$inferSelect;
export type NewScreenerQueueItem = typeof screenerQueue.$inferInsert;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const senderRulesRelations = relations(senderRules, ({ one }) => ({
  user: one(users, {
    fields: [senderRules.userId],
    references: [users.id],
  }),
}));

export const screenerQueueRelations = relations(screenerQueue, ({ one }) => ({
  user: one(users, {
    fields: [screenerQueue.userId],
    references: [users.id],
  }),
  mailAccount: one(mailAccounts, {
    fields: [screenerQueue.mailAccountId],
    references: [mailAccounts.id],
  }),
  email: one(emails, {
    fields: [screenerQueue.emailId],
    references: [emails.id],
  }),
}));
