/**
 * BullMQ queue definitions and Redis connection.
 *
 * Two queues:
 *  1. email-sync    — Triggers full IMAP sync for a mail account.
 *  2. email-process — Processes a fetched email: applies sender rules,
 *                     assigns category, persists to DB.
 *
 * Workers live in src/lib/queue/workers/ and are run as a separate process
 * via `pnpm worker:dev` (or `tsx src/lib/queue/workers/sync.worker.ts`).
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------

if (!process.env.REDIS_URL) {
  throw new Error(
    "REDIS_URL environment variable is not set. " +
      "Please copy .env.example to .env.local and fill in the values."
  );
}

// Singleton Redis connection shared across queues and workers in this process.
const globalForRedis = globalThis as unknown as {
  _ethianRedis: IORedis | undefined;
};

export const redis: IORedis =
  globalForRedis._ethianRedis ??
  new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis._ethianRedis = redis;
}

// ---------------------------------------------------------------------------
// Job type definitions
// ---------------------------------------------------------------------------

/**
 * Payload for a 'sync-account' job.
 * Triggers a full IMAP sync for one mail account.
 */
export interface SyncAccountJobData {
  mailAccountId: string;
  /** If true, sync all mailboxes. Otherwise only INBOX. */
  fullSync?: boolean;
  /** Optional specific mailbox to sync (e.g. "Sent"). */
  mailbox?: string;
}

/**
 * Payload for a 'process-email' job.
 * Takes a raw fetched email and categorises it, then saves to DB.
 */
export interface ProcessEmailJobData {
  mailAccountId: string;
  userId: string;
  rawEmail: {
    messageId: string;
    imapUid: number;
    imapFlags: string[];
    imapMailbox: string;
    subject: string;
    fromAddress: string;
    fromName?: string;
    toAddresses: Array<{ address: string; name?: string }>;
    ccAddresses: Array<{ address: string; name?: string }>;
    bccAddresses: Array<{ address: string; name?: string }>;
    replyTo?: string;
    inReplyTo?: string;
    references: string[];
    headers: Record<string, string | string[]>;
    bodyHtml?: string;
    bodyText?: string;
    snippet: string;
    sentAt: string; // ISO string (Date is not serializable in JSON)
    receivedAt: string; // ISO string
  };
}

export type SyncAccountJobResult = {
  mailAccountId: string;
  emailsQueued: number;
  errors: number;
  syncedAt: string;
};

export type ProcessEmailJobResult = {
  emailId: string;
  category: string;
  isNew: boolean;
};

// ---------------------------------------------------------------------------
// Queue instances
// ---------------------------------------------------------------------------

const queueConnection = { connection: redis };

/**
 * Queue for triggering IMAP account syncs.
 * Add a job here to kick off a sync for any mail account.
 */
export const emailSyncQueue = new Queue<
  SyncAccountJobData,
  SyncAccountJobResult
>("email-sync", {
  ...queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 60 * 60 * 24, // keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7, // keep failed jobs for 7 days
    },
  },
});

/**
 * Queue for processing individual emails after they've been fetched from IMAP.
 * The sync worker fans out one job per email into this queue.
 */
export const emailProcessQueue = new Queue<
  ProcessEmailJobData,
  ProcessEmailJobResult
>("email-process", {
  ...queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 60 * 60 * 24,
      count: 1000,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7,
    },
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Schedule periodic sync for all active mail accounts.
 * Call this once at startup (e.g. in a scheduler process).
 * Uses BullMQ's repeatable jobs backed by Redis.
 */
export async function scheduleAccountSync(
  mailAccountId: string,
  intervalMs = 5 * 60 * 1000 // every 5 minutes
): Promise<void> {
  await emailSyncQueue.add(
    "sync-account",
    { mailAccountId },
    {
      repeat: {
        every: intervalMs,
      },
      jobId: `periodic-sync-${mailAccountId}`,
    }
  );
}

/**
 * Remove the repeatable sync job for an account (e.g. when account is deleted).
 */
export async function cancelAccountSync(mailAccountId: string): Promise<void> {
  await emailSyncQueue.removeRepeatable("sync-account", {
    every: 5 * 60 * 1000,
    jobId: `periodic-sync-${mailAccountId}`,
  });
}
