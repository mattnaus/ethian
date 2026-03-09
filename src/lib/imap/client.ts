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
import { decrypt } from "@/lib/crypto";
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

/**
 * Parse the References header string into an array of message IDs.
 */
function parseReferences(raw?: string): string[] {
  if (!raw) return [];
  // References is a space/newline-separated list of message IDs enclosed in <>
  return raw.match(/<[^>]+>/g) ?? [];
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
          bodyStructure: true,
          internalDate: true,
          headers: true,
          bodyParts: ["text", "html"],
        }
      )) {
        try {
          const envelope = message.envelope;

          // Parse body parts
          const bodyText = message.bodyParts?.get("text")
            ? Buffer.from(message.bodyParts.get("text") as Buffer).toString(
                "utf-8"
              )
            : undefined;
          const bodyHtml = message.bodyParts?.get("html")
            ? Buffer.from(message.bodyParts.get("html") as Buffer).toString(
                "utf-8"
              )
            : undefined;

          // Parse headers map
          const headersMap: Record<string, string | string[]> = {};
          if (message.headers) {
            const headerText = Buffer.from(message.headers as Buffer).toString(
              "utf-8"
            );
            for (const line of headerText.split("\r\n")) {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).toLowerCase().trim();
                const val = line.slice(colonIdx + 1).trim();
                const existing = headersMap[key];
                if (existing) {
                  headersMap[key] = Array.isArray(existing)
                    ? [...existing, val]
                    : [existing, val];
                } else {
                  headersMap[key] = val;
                }
              }
            }
          }

          const rawInReplyTo = headersMap["in-reply-to"];
          const inReplyTo = Array.isArray(rawInReplyTo)
            ? rawInReplyTo[0]
            : rawInReplyTo;

          const rawReferences = headersMap["references"];
          const referencesStr = Array.isArray(rawReferences)
            ? rawReferences.join(" ")
            : rawReferences;

          const fromParsed = parseAddresses(envelope.from ?? []);
          const replyToParsed = parseAddresses(envelope.replyTo ?? []);

          const email: RawEmailData = {
            messageId: envelope.messageId ?? `generated-${message.uid}`,
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
            references: parseReferences(referencesStr),
            headers: headersMap,

            bodyHtml,
            bodyText,
            snippet: buildSnippet(bodyHtml, bodyText),

            sentAt: envelope.date ?? message.internalDate ?? new Date(),
            receivedAt: message.internalDate ?? new Date(),
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
      let bodyHtml: string | undefined;
      let bodyText: string | undefined;
      const headersMap: Record<string, string | string[]> = {};

      for await (const message of client.fetch(
        { uid: uid.toString() },
        {
          uid: true,
          headers: true,
          bodyParts: ["text", "html"],
        },
        { uid: true }
      )) {
        if (message.bodyParts?.get("text")) {
          bodyText = Buffer.from(
            message.bodyParts.get("text") as Buffer
          ).toString("utf-8");
        }
        if (message.bodyParts?.get("html")) {
          bodyHtml = Buffer.from(
            message.bodyParts.get("html") as Buffer
          ).toString("utf-8");
        }

        if (message.headers) {
          const headerText = Buffer.from(message.headers as Buffer).toString(
            "utf-8"
          );
          for (const line of headerText.split("\r\n")) {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0) {
              const key = line.slice(0, colonIdx).toLowerCase().trim();
              const val = line.slice(colonIdx + 1).trim();
              const existing = headersMap[key];
              if (existing) {
                headersMap[key] = Array.isArray(existing)
                  ? [...existing, val]
                  : [existing, val];
              } else {
                headersMap[key] = val;
              }
            }
          }
        }

        break; // We only expect one message for a specific UID
      }

      return {
        bodyHtml,
        bodyText,
        snippet: buildSnippet(bodyHtml, bodyText),
        headers: headersMap,
      };
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
