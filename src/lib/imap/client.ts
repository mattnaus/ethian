/**
 * IMAP client wrapper built on top of imapflow.
 *
 * Design goals:
 *  - Always close the IMAP connection in a finally block to avoid leaks.
 *  - Return structured TypeScript types, never raw imapflow internals.
 *  - Keep this module free of database calls — callers are responsible for
 *    persisting the returned data.
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decrypt } from "@/lib/crypto";
import { normalizeMessageId } from "@/lib/utils";
import type { MailAccount } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailAddress {
  address: string;
  name?: string;
}

export interface RawEmailData {
  messageId: string;
  imapUid: number;
  imapFlags: string[];
  imapMailbox: string;

  subject: string;
  fromAddress: string;
  fromName?: string;
  toAddresses: EmailAddress[];
  ccAddresses: EmailAddress[];
  bccAddresses: EmailAddress[];
  replyTo?: string;
  inReplyTo?: string;
  references: string[];
  headers: Record<string, string | string[]>;

  bodyHtml?: string;
  bodyText?: string;
  snippet: string;

  sentAt: Date;
  receivedAt: Date;
}

export interface EmailBodyData {
  bodyHtml?: string;
  bodyText?: string;
  snippet: string;
  headers: Record<string, string | string[]>;
}

export interface SyncResult {
  accountId: string;
  mailbox: string;
  fetched: RawEmailData[];
  errors: Array<{ uid: number; error: string }>;
  syncedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an imapflow address object into our EmailAddress shape.
 */
function parseAddresses(
  raw: Array<{ address?: string; name?: string }> | undefined
): EmailAddress[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((a) => a.address)
    .map((a) => ({ address: a.address!, name: a.name || undefined }));
}

/**
 * Extract a plain-text snippet from HTML or plain text body.
 * Strips HTML tags and collapses whitespace, then truncates to 200 chars.
 */
function buildSnippet(html?: string, text?: string): string {
  const source = text ?? html ?? "";
  const stripped = source
    .replace(/<[^>]+>/g, " ") // remove HTML tags
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 200);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a configured ImapFlow client for a mail account.
 * The client is NOT connected yet — callers must call client.connect().
 */
export function createImapClient(account: MailAccount): ImapFlow {
  const password = decrypt(account.encryptedPassword);

  return new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    auth: {
      user: account.username,
      pass: password,
    },
    logger: process.env.NODE_ENV === "development"
      ? undefined // imapflow logs to console by default
      : false,    // silence in production
  });
}

// ---------------------------------------------------------------------------
// Connection verification
// ---------------------------------------------------------------------------

/**
 * Verify that we can authenticate with the IMAP server.
 * Connects, opens INBOX, then immediately logs out.
 * Returns { ok: true } on success or { ok: false, error: string } on failure.
 */
export async function verifyImapConnection(
  account: MailAccount
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = createImapClient(account);
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown IMAP error",
    };
  } finally {
    try {
      await client.logout();
    } catch {
      // non-fatal
    }
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Connect to the account's IMAP server and fetch all emails received since
 * `account.lastSyncedAt` (or the last 30 days if never synced before).
 *
 * Returns a SyncResult containing all fetched emails across all standard
 * mailboxes (INBOX, Sent, Drafts, etc.).
 */
export async function syncMailbox(
  account: MailAccount,
  mailboxName = "INBOX"
): Promise<SyncResult> {
  const client = createImapClient(account);
  const fetched: RawEmailData[] = [];
  const errors: Array<{ uid: number; error: string }> = [];

  try {
    await client.connect();

    const lock = await client.getMailboxLock(mailboxName);

    try {
      // Determine the search range
      const since =
        account.lastSyncedAt ??
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      for await (const message of client.fetch(
        { since },
        {
          uid: true,
          flags: true,
          envelope: true,
          internalDate: true,
          source: true,
        }
      )) {
        try {
          if (!message.envelope) {
            errors.push({ uid: message.uid, error: "No envelope returned" });
            continue;
          }
          const envelope = message.envelope;

          // source: true downloads the full RFC 2822 message (including attachments).
          // This is the only correct way to get text/html bodies in imapflow — bodyParts
          // takes IMAP section numbers (1, 2, 1.1), not content-type names. Fetching full
          // source trades more bandwidth for correct multipart parsing via simpleParser.
          // TODO: for large inboxes consider streaming or size-gating attachments.
          if (!message.source) {
            errors.push({ uid: message.uid, error: "No message source returned" });
            continue;
          }
          const parsed = await simpleParser(message.source);

          const bodyText = parsed.text ?? undefined;
          const bodyHtml = parsed.html !== false ? (parsed.html ?? undefined) : undefined;

          // Build a flat headers map — only keep string-valued headers.
          // Structured values (AddressObject, Date, etc.) would stringify to "[object Object]".
          const headersMap: Record<string, string | string[]> = {};
          parsed.headers.forEach((value, key) => {
            if (typeof value === "string") {
              headersMap[key] = value;
            } else if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
              headersMap[key] = value as string[];
            }
          });

          const inReplyTo = normalizeMessageId(parsed.inReplyTo);
          // Use simpleParser's already-parsed references array directly.
          const references = parsed.references
            ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
            : [];

          const fromParsed = parseAddresses(envelope.from ?? []);
          const replyToParsed = parseAddresses(envelope.replyTo ?? []);

          const email: RawEmailData = {
            messageId: normalizeMessageId(envelope.messageId) ?? `generated-${message.uid}`,
            imapUid: message.uid,
            imapFlags: [...(message.flags ?? [])].map(String),
            imapMailbox: mailboxName,

            subject: envelope.subject ?? "(no subject)",
            fromAddress: fromParsed[0]?.address ?? "unknown@unknown.invalid",
            fromName: fromParsed[0]?.name,
            toAddresses: parseAddresses(envelope.to ?? []),
            ccAddresses: parseAddresses(envelope.cc ?? []),
            bccAddresses: parseAddresses(envelope.bcc ?? []),
            replyTo: replyToParsed[0]?.address,
            inReplyTo,
            references,
            headers: headersMap,

            bodyHtml,
            bodyText,
            snippet: buildSnippet(bodyHtml, bodyText),

            sentAt: parsed.date ?? (message.internalDate ? new Date(message.internalDate) : new Date()),
            receivedAt: message.internalDate ? new Date(message.internalDate) : new Date(),
          };

          fetched.push(email);
        } catch (msgError) {
          errors.push({
            uid: message.uid,
            error:
              msgError instanceof Error
                ? msgError.message
                : "Unknown error processing message",
          });
        }
      }
    } finally {
      lock.release();
    }

    return {
      accountId: account.id,
      mailbox: mailboxName,
      fetched,
      errors,
      syncedAt: new Date(),
    };
  } finally {
    // Always close the connection, even if an error occurred
    try {
      await client.logout();
    } catch {
      // logout errors are non-fatal
    }
  }
}

// ---------------------------------------------------------------------------
// Fetch full email body by UID
// ---------------------------------------------------------------------------

/**
 * Fetch the full body of a specific email by its IMAP UID.
 * Useful when the initial sync only fetched headers/snippets.
 */
export async function fetchEmailBody(
  account: MailAccount,
  uid: number,
  mailboxName: string
): Promise<EmailBodyData> {
  const client = createImapClient(account);

  try {
    await client.connect();

    const lock = await client.getMailboxLock(mailboxName);

    try {
      let result: EmailBodyData = {
        snippet: "",
        headers: {},
      };

      for await (const message of client.fetch(
        { uid: uid.toString() },
        { uid: true, source: true },
        { uid: true }
      )) {
        if (!message.source) break;

        const parsed = await simpleParser(message.source);

        const bodyText = parsed.text ?? undefined;
        const bodyHtml = parsed.html !== false ? (parsed.html ?? undefined) : undefined;

        const headersMap: Record<string, string | string[]> = {};
        parsed.headers.forEach((value, key) => {
          if (typeof value === "string") {
            headersMap[key] = value;
          } else if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
            headersMap[key] = value as string[];
          }
        });

        result = {
          bodyHtml,
          bodyText,
          snippet: buildSnippet(bodyHtml, bodyText),
          headers: headersMap,
        };
        break; // We only expect one message for a specific UID
      }

      return result;
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      // non-fatal
    }
  }
}
