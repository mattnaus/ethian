// Re-export all tables, enums, and relations from schema files.
// This single file is the entry point referenced by drizzle.config.ts.

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export {
  syncStatusEnum,
  users,
  usersRelations,
  mailAccounts,
  mailAccountsRelations,
} from "./accounts";
export type { User, NewUser, MailAccount, NewMailAccount } from "./accounts";

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------
export {
  emailCategoryEnum,
  emails,
  emailsRelations,
  emailAttachments,
  emailAttachmentsRelations,
} from "./emails";
export type {
  Email,
  NewEmail,
  EmailAttachment,
  NewEmailAttachment,
} from "./emails";

// ---------------------------------------------------------------------------
// Senders / Screener
// ---------------------------------------------------------------------------
export {
  senderDecisionEnum,
  appliesToEnum,
  senderRules,
  senderRulesRelations,
  screenerQueue,
  screenerQueueRelations,
} from "./senders";
export type {
  SenderRule,
  NewSenderRule,
  ScreenerQueueItem,
  NewScreenerQueueItem,
} from "./senders";

// ---------------------------------------------------------------------------
// Signatures
// ---------------------------------------------------------------------------
export {
  signatures,
  signaturesRelations,
} from "./signatures";
export type { Signature, NewSignature } from "./signatures";

// ---------------------------------------------------------------------------
// Combined schema object (for Drizzle's `db` instance)
// ---------------------------------------------------------------------------
import {
  syncStatusEnum as _syncStatusEnum,
  users as _users,
  usersRelations as _usersRelations,
  mailAccounts as _mailAccounts,
  mailAccountsRelations as _mailAccountsRelations,
} from "./accounts";

import {
  emailCategoryEnum as _emailCategoryEnum,
  emails as _emails,
  emailsRelations as _emailsRelations,
  emailAttachments as _emailAttachments,
  emailAttachmentsRelations as _emailAttachmentsRelations,
} from "./emails";

import {
  senderDecisionEnum as _senderDecisionEnum,
  appliesToEnum as _appliesToEnum,
  senderRules as _senderRules,
  senderRulesRelations as _senderRulesRelations,
  screenerQueue as _screenerQueue,
  screenerQueueRelations as _screenerQueueRelations,
} from "./senders";

import {
  signatures as _signatures,
  signaturesRelations as _signaturesRelations,
} from "./signatures";

export const schema = {
  // Enums
  syncStatusEnum: _syncStatusEnum,
  emailCategoryEnum: _emailCategoryEnum,
  senderDecisionEnum: _senderDecisionEnum,
  appliesToEnum: _appliesToEnum,

  // Tables
  users: _users,
  mailAccounts: _mailAccounts,
  emails: _emails,
  emailAttachments: _emailAttachments,
  senderRules: _senderRules,
  screenerQueue: _screenerQueue,
  signatures: _signatures,

  // Relations
  usersRelations: _usersRelations,
  mailAccountsRelations: _mailAccountsRelations,
  emailsRelations: _emailsRelations,
  emailAttachmentsRelations: _emailAttachmentsRelations,
  senderRulesRelations: _senderRulesRelations,
  screenerQueueRelations: _screenerQueueRelations,
  signaturesRelations: _signaturesRelations,
};
