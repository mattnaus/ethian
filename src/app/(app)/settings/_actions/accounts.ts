"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, mailAccounts } from "@/db";
import { encrypt } from "@/lib/crypto";
import { verifyImapConnection } from "@/lib/imap/client";
import { verifySmtpConnection } from "@/lib/smtp/client";
import { emailSyncQueue, scheduleAccountSync, cancelAccountSync } from "@/lib/queue";
import { eq, and } from "drizzle-orm";
import type { MailAccount } from "@/db/schema";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  imapHost: z.string().min(1, "IMAP host is required"),
  imapPort: z.coerce.number().int().min(1).max(65535).default(993),
  imapSecure: z.boolean().default(true),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
  smtpSecure: z.boolean().default(true),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const updateSchema = accountSchema.extend({
  // password is optional on update — empty string means "keep existing"
  password: z.string().optional(),
});

export type AccountFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  success?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

async function verifyOwnership(accountId: string, userId: string): Promise<MailAccount> {
  const [account] = await db
    .select()
    .from(mailAccounts)
    .where(and(eq(mailAccounts.id, accountId), eq(mailAccounts.userId, userId)))
    .limit(1);

  if (!account) {
    throw new Error("Account not found");
  }
  return account;
}

// ---------------------------------------------------------------------------
// Add account
// ---------------------------------------------------------------------------

export async function addMailAccountAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const userId = await requireSession();

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
    imapSecure: formData.get("imapSecure") === "true",
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure") === "true",
    username: formData.get("username"),
    password: formData.get("password"),
  };

  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { password, ...fields } = parsed.data;
  const encryptedPassword = encrypt(password);

  // Build a candidate account object for connection verification
  const candidate = {
    id: "",
    userId,
    name: fields.name,
    email: fields.email,
    imapHost: fields.imapHost,
    imapPort: fields.imapPort,
    imapSecure: fields.imapSecure,
    smtpHost: fields.smtpHost,
    smtpPort: fields.smtpPort,
    smtpSecure: fields.smtpSecure,
    username: fields.username,
    encryptedPassword,
    isActive: true,
    lastSyncedAt: null,
    syncStatus: "idle" as const,
    syncError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const imapResult = await verifyImapConnection(candidate);
  if (!imapResult.ok) {
    console.error("[addMailAccount] IMAP verification failed for", fields.email);
    return { error: "Could not connect to IMAP server. Check your host, port, and credentials." };
  }

  const smtpResult = await verifySmtpConnection(candidate);
  if (!smtpResult.ok) {
    console.error("[addMailAccount] SMTP verification failed for", fields.email);
    return { error: "Could not connect to SMTP server. Check your SMTP host, port, and credentials." };
  }

  const [inserted] = await db.insert(mailAccounts).values({
    userId,
    name: fields.name,
    email: fields.email,
    imapHost: fields.imapHost,
    imapPort: fields.imapPort,
    imapSecure: fields.imapSecure,
    smtpHost: fields.smtpHost,
    smtpPort: fields.smtpPort,
    smtpSecure: fields.smtpSecure,
    username: fields.username,
    encryptedPassword,
  }).returning({ id: mailAccounts.id });

  // Schedule repeatable 5-minute sync and trigger an immediate first sync
  await scheduleAccountSync(inserted.id).catch((err) =>
    console.error("[addMailAccount] Failed to schedule sync for", fields.email, err)
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (emailSyncQueue.add as any)("sync-account", { mailAccountId: inserted.id }).catch((err: unknown) =>
    console.error("[addMailAccount] Failed to enqueue immediate sync for", fields.email, err)
  );

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update account
// ---------------------------------------------------------------------------

export async function updateMailAccountAction(
  accountId: string,
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const userId = await requireSession();
  const existing = await verifyOwnership(accountId, userId);

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
    imapSecure: formData.get("imapSecure") === "true",
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure") === "true",
    username: formData.get("username"),
    password: formData.get("password") || undefined,
  };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { password, ...fields } = parsed.data;
  const encryptedPassword = password ? encrypt(password) : existing.encryptedPassword;

  // Re-verify connections if any connection-relevant field changed
  const candidate = {
    id: existing.id,
    userId,
    name: fields.name,
    email: fields.email,
    imapHost: fields.imapHost,
    imapPort: fields.imapPort,
    imapSecure: fields.imapSecure,
    smtpHost: fields.smtpHost,
    smtpPort: fields.smtpPort,
    smtpSecure: fields.smtpSecure,
    username: fields.username,
    encryptedPassword,
    isActive: existing.isActive,
    lastSyncedAt: existing.lastSyncedAt,
    syncStatus: existing.syncStatus,
    syncError: existing.syncError,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  };

  const imapResult = await verifyImapConnection(candidate);
  if (!imapResult.ok) {
    console.error("[updateMailAccount] IMAP verification failed for", fields.email);
    return { error: "Could not connect to IMAP server. Check your host, port, and credentials." };
  }

  const smtpResult = await verifySmtpConnection(candidate);
  if (!smtpResult.ok) {
    console.error("[updateMailAccount] SMTP verification failed for", fields.email);
    return { error: "Could not connect to SMTP server. Check your SMTP host, port, and credentials." };
  }

  await db
    .update(mailAccounts)
    .set({
      name: fields.name,
      email: fields.email,
      imapHost: fields.imapHost,
      imapPort: fields.imapPort,
      imapSecure: fields.imapSecure,
      smtpHost: fields.smtpHost,
      smtpPort: fields.smtpPort,
      smtpSecure: fields.smtpSecure,
      username: fields.username,
      encryptedPassword,
    })
    .where(and(eq(mailAccounts.id, accountId), eq(mailAccounts.userId, userId)));

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

export async function deleteMailAccountAction(accountId: string): Promise<void> {
  const userId = await requireSession();
  await verifyOwnership(accountId, userId);

  // Cancel the repeatable sync job before deleting the account
  await cancelAccountSync(accountId).catch((err) =>
    console.error("[deleteMailAccount] Failed to cancel sync for", accountId, err)
  );

  await db
    .delete(mailAccounts)
    .where(and(eq(mailAccounts.id, accountId), eq(mailAccounts.userId, userId)));

  revalidatePath("/settings");
}
