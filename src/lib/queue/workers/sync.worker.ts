/**
 * BullMQ worker process.
 *
 * Run with: tsx src/lib/queue/workers/sync.worker.ts
 * (or via `pnpm worker:dev` for watch mode)
 *
 * This single file registers workers for both queues:
 *   - email-sync    → sync-account jobs
 *   - email-process → process-email jobs
 */

import { Worker, type Job } from "bullmq";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  mailAccounts,
  emails,
  senderRules,
  screenerQueue,
  type MailAccount,
  type NewEmail,
  type NewScreenerQueueItem,
} from "@/db/schema";
import { syncMailbox } from "@/lib/imap/client";
import {
  redis,
  emailProcessQueue,
  type SyncAccountJobData,
  type SyncAccountJobResult,
  type ProcessEmailJobData,
  type ProcessEmailJobResult,
} from "@/lib/queue";
import type { EmailCategory } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the domain from an email address.
 * e.g. "hello@stripe.com" → "stripe.com"
 */
function extractDomain(address: string): string {
  const at = address.lastIndexOf("@");
  return at >= 0 ? address.slice(at + 1).toLowerCase() : address.toLowerCase();
}

// ---------------------------------------------------------------------------
// Screener / categorisation logic
// ---------------------------------------------------------------------------

/**
 * Determine which Ethian category an incoming email should be placed in.
 *
 * Lookup order:
 *  1. Exact address match in sender_rules  → use the rule's decision
 *  2. Domain match in sender_rules          → use the rule's decision
 *  3. No rule found                         → 'screener'
 *
 * Decision → category mapping:
 *  - approved    → 'inbox'
 *  - feed        → 'feed'
 *  - paper_trail → 'paper_trail'
 *  - blocked     → 'trash'
 *  - (none)      → 'screener'
 */
export async function categorizeSender(
  userId: string,
  fromAddress: string,
  fromDomain: string
): Promise<EmailCategory> {
  // 1. Try exact address match
  const [addressRule] = await db
    .select()
    .from(senderRules)
    .where(
      and(
        eq(senderRules.userId, userId),
        eq(senderRules.fromAddress, fromAddress.toLowerCase()),
        eq(senderRules.appliesTo, "address")
      )
    )
    .limit(1);

  if (addressRule) {
    return decisionToCategory(addressRule.decision);
  }

  // 2. Try domain match
  const [domainRule] = await db
    .select()
    .from(senderRules)
    .where(
      and(
        eq(senderRules.userId, userId),
        eq(senderRules.fromDomain, fromDomain.toLowerCase()),
        eq(senderRules.appliesTo, "domain")
      )
    )
    .limit(1);

  if (domainRule) {
    return decisionToCategory(domainRule.decision);
  }

  // 3. Unknown sender → screener
  return "screener";
}

function decisionToCategory(
  decision: "approved" | "blocked" | "feed" | "paper_trail"
): EmailCategory {
  switch (decision) {
    case "approved":
      return "inbox";
    case "blocked":
      return "trash";
    case "feed":
      return "feed";
    case "paper_trail":
      return "paper_trail";
  }
}

// ---------------------------------------------------------------------------
// Worker: email-sync
// ---------------------------------------------------------------------------

async function handleSyncAccount(
  job: Job<SyncAccountJobData, SyncAccountJobResult>
): Promise<SyncAccountJobResult> {
  const { mailAccountId, mailbox = "INBOX" } = job.data;

  job.log(`Starting sync for account ${mailAccountId}, mailbox: ${mailbox}`);

  // Load account from DB
  const [account] = await db
    .select()
    .from(mailAccounts)
    .where(eq(mailAccounts.id, mailAccountId))
    .limit(1);

  if (!account) {
    throw new Error(`Mail account ${mailAccountId} not found`);
  }

  if (!account.isActive) {
    job.log(`Account ${mailAccountId} is inactive, skipping`);
    return {
      mailAccountId,
      emailsQueued: 0,
      errors: 0,
      syncedAt: new Date().toISOString(),
    };
  }

  // Mark as syncing
  await db
    .update(mailAccounts)
    .set({ syncStatus: "syncing", syncError: null })
    .where(eq(mailAccounts.id, mailAccountId));

  let emailsQueued = 0;
  let errorCount = 0;

  try {
    const result = await syncMailbox(account, mailbox);

    job.log(
      `Fetched ${result.fetched.length} emails, ${result.errors.length} errors`
    );

    // Fan out one process-email job per fetched message
    const processJobs = result.fetched.map((rawEmail) => ({
      name: "process-email",
      data: {
        mailAccountId,
        userId: account.userId,
        rawEmail: {
          ...rawEmail,
          sentAt: rawEmail.sentAt.toISOString(),
          receivedAt: rawEmail.receivedAt.toISOString(),
        },
      } satisfies ProcessEmailJobData,
    }));

    if (processJobs.length > 0) {
      await emailProcessQueue.addBulk(processJobs);
      emailsQueued = processJobs.length;
    }

    errorCount = result.errors.length;

    // Update lastSyncedAt on success
    await db
      .update(mailAccounts)
      .set({
        syncStatus: "idle",
        syncError: null,
        lastSyncedAt: result.syncedAt,
      })
      .where(eq(mailAccounts.id, mailAccountId));

    return {
      mailAccountId,
      emailsQueued,
      errors: errorCount,
      syncedAt: result.syncedAt.toISOString(),
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown sync error";

    job.log(`Sync failed: ${errorMessage}`);

    // Mark account as errored
    await db
      .update(mailAccounts)
      .set({ syncStatus: "error", syncError: errorMessage })
      .where(eq(mailAccounts.id, mailAccountId));

    throw err; // Let BullMQ handle retries
  }
}

// ---------------------------------------------------------------------------
// Worker: email-process
// ---------------------------------------------------------------------------

async function handleProcessEmail(
  job: Job<ProcessEmailJobData, ProcessEmailJobResult>
): Promise<ProcessEmailJobResult> {
  const { mailAccountId, userId, rawEmail } = job.data;

  job.log(`Processing email ${rawEmail.messageId}`);

  const fromDomain = extractDomain(rawEmail.fromAddress);

  // Determine category based on sender rules
  const category = await categorizeSender(
    userId,
    rawEmail.fromAddress,
    fromDomain
  );

  // Check if this email already exists (idempotency: re-sync may re-process)
  const [existing] = await db
    .select({ id: emails.id })
    .from(emails)
    .where(
      and(
        eq(emails.mailAccountId, mailAccountId),
        eq(emails.messageId, rawEmail.messageId)
      )
    )
    .limit(1);

  if (existing) {
    job.log(`Email ${rawEmail.messageId} already exists, skipping insert`);
    return {
      emailId: existing.id,
      category,
      isNew: false,
    };
  }

  // Determine IMAP flags
  const flagsLower = rawEmail.imapFlags.map((f) => f.toLowerCase());
  const isRead = flagsLower.includes("\\seen");
  const isDraft = rawEmail.imapMailbox.toLowerCase().includes("draft") ||
    flagsLower.includes("\\draft");
  const isSent = rawEmail.imapMailbox.toLowerCase().includes("sent") ||
    flagsLower.includes("\\answered");

  // Build thread ID from References or In-Reply-To
  // Simple strategy: use the root message ID as the thread ID
  const threadId =
    rawEmail.references.length > 0
      ? rawEmail.references[0]
      : rawEmail.inReplyTo ?? rawEmail.messageId;

  const newEmail: NewEmail = {
    mailAccountId,
    messageId: rawEmail.messageId,
    threadId,
    inReplyTo: rawEmail.inReplyTo,
    references: rawEmail.references,

    subject: rawEmail.subject,
    fromAddress: rawEmail.fromAddress.toLowerCase(),
    fromName: rawEmail.fromName,
    toAddresses: rawEmail.toAddresses,
    ccAddresses: rawEmail.ccAddresses,
    bccAddresses: rawEmail.bccAddresses,
    replyTo: rawEmail.replyTo,
    headers: rawEmail.headers,

    bodyHtml: rawEmail.bodyHtml,
    bodyText: rawEmail.bodyText,
    snippet: rawEmail.snippet,

    sentAt: new Date(rawEmail.sentAt),
    receivedAt: new Date(rawEmail.receivedAt),

    isRead,
    isDraft,
    isSent,

    imapUid: rawEmail.imapUid,
    imapFlags: rawEmail.imapFlags,
    imapMailbox: rawEmail.imapMailbox,

    category,
  };

  const [inserted] = await db.insert(emails).values(newEmail).returning({
    id: emails.id,
  });

  job.log(`Inserted email ${inserted.id} with category '${category}'`);

  // If the email landed in the screener, update (or create) the screener queue
  // entry for this sender so the user can see a summary.
  if (category === "screener") {
    await upsertScreenerEntry({
      userId,
      mailAccountId,
      emailId: inserted.id,
      fromAddress: rawEmail.fromAddress.toLowerCase(),
      fromName: rawEmail.fromName,
      fromDomain,
      subject: rawEmail.subject,
    });
  }

  return {
    emailId: inserted.id,
    category,
    isNew: true,
  };
}

// ---------------------------------------------------------------------------
// Screener queue upsert
// ---------------------------------------------------------------------------

async function upsertScreenerEntry(params: {
  userId: string;
  mailAccountId: string;
  emailId: string;
  fromAddress: string;
  fromName?: string;
  fromDomain: string;
  subject: string;
}): Promise<void> {
  const {
    userId,
    mailAccountId,
    emailId,
    fromAddress,
    fromName,
    fromDomain,
    subject,
  } = params;

  // Check if an entry already exists for this sender
  const [existing] = await db
    .select()
    .from(screenerQueue)
    .where(
      and(
        eq(screenerQueue.userId, userId),
        eq(screenerQueue.fromAddress, fromAddress)
      )
    )
    .limit(1);

  if (existing) {
    // Increment count and update the most recent email reference
    await db
      .update(screenerQueue)
      .set({
        emailId, // point to the latest email from this sender
        messageCount: existing.messageCount + 1,
        lastSeenAt: new Date(),
        fromName: fromName ?? existing.fromName,
      })
      .where(eq(screenerQueue.id, existing.id));
  } else {
    // Create new screener entry
    const entry: NewScreenerQueueItem = {
      userId,
      mailAccountId,
      emailId,
      fromAddress,
      fromName,
      fromDomain,
      subject,
      messageCount: 1,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    };
    await db.insert(screenerQueue).values(entry);
  }
}

// ---------------------------------------------------------------------------
// Register workers
// ---------------------------------------------------------------------------

const workerConnection = { connection: redis };
const concurrency = parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10);

const syncWorker = new Worker<SyncAccountJobData, SyncAccountJobResult>(
  "email-sync",
  handleSyncAccount,
  {
    ...workerConnection,
    concurrency,
  }
);

const processWorker = new Worker<ProcessEmailJobData, ProcessEmailJobResult>(
  "email-process",
  handleProcessEmail,
  {
    ...workerConnection,
    concurrency: concurrency * 2, // process can run more in parallel than sync
  }
);

// ---------------------------------------------------------------------------
// Lifecycle logging
// ---------------------------------------------------------------------------

syncWorker.on("completed", (job, result) => {
  console.log(
    `[sync-worker] Job ${job.id} completed: ${result.emailsQueued} emails queued`
  );
});

syncWorker.on("failed", (job, err) => {
  console.error(`[sync-worker] Job ${job?.id} failed:`, err.message);
});

processWorker.on("completed", (job, result) => {
  console.log(
    `[process-worker] Job ${job.id} completed: email ${result.emailId} → ${result.category}`
  );
});

processWorker.on("failed", (job, err) => {
  console.error(`[process-worker] Job ${job?.id} failed:`, err.message);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown() {
  console.log("Shutting down workers...");
  await syncWorker.close();
  await processWorker.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(
  `Workers started (concurrency: sync=${concurrency}, process=${concurrency * 2})`
);
