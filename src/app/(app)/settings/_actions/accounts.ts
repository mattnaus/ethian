"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db, mailAccounts } from "@/db";
import { encrypt } from "@/lib/crypto";
import { verifyImapConnection } from "@/lib/imap/client";
import { verifySmtpConnection } from "@/lib/smtp/client";
import { scheduleAccountSync, triggerImmediateSync, cancelAccountSync } from "@/lib/queue";
import { eq, and } from "drizzle-orm";
import type { MailAccount } from "@/db/schema";

// ---------------------------------------------------------------------------
// Validation schema (no custom messages — errors are translated at action time)
// ---------------------------------------------------------------------------

const accountSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#3b82f6"),
  imapHost: z.string().min(1),
  imapPort: z.coerce.number().int().min(1).max(65535).default(993),
  imapSecure: z.boolean().default(true),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(465),
  smtpSecure: z.boolean().default(true),
  username: z.string().min(1),
  password: z.string().min(1),
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

/**
 * Maps Zod field errors to translated validation messages.
 * Zod schemas have no custom messages — we translate based on field name + error type.
 */
async function translateFieldErrors(
  zodErrors: Partial<Record<string, string[] | undefined>>,
  isUpdate = false
): Promise<Partial<Record<string, string[]>>> {
  const t = await getTranslations("settings.validation");
  const result: Partial<Record<string, string[]>> = {};

  if (zodErrors.name?.length) result.name = [t("nameRequired")];
  if (zodErrors.email?.length) result.email = [t("invalidEmail")];
  if (zodErrors.color?.length) result.color = [t("invalidColor")];
  if (zodErrors.imapHost?.length) result.imapHost = [t("imapHostRequired")];
  if (zodErrors.smtpHost?.length) result.smtpHost = [t("smtpHostRequired")];
  if (zodErrors.username?.length) result.username = [t("usernameRequired")];
  if (!isUpdate && zodErrors.password?.length) result.password = [t("passwordRequired")];

  return result;
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
    color: formData.get("color"),
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
    const fieldErrors = await translateFieldErrors(parsed.error.flatten().fieldErrors);
    return { fieldErrors };
  }

  const t = await getTranslations("settings.errors");
  const { password, ...fields } = parsed.data;
  const encryptedPassword = encrypt(password);

  // Build a candidate account object for connection verification
  const candidate = {
    id: "",
    userId,
    name: fields.name,
    email: fields.email,
    color: fields.color,
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
    return { error: t("imapConnectionFailed") };
  }

  const smtpResult = await verifySmtpConnection(candidate);
  if (!smtpResult.ok) {
    console.error("[addMailAccount] SMTP verification failed for", fields.email);
    return { error: t("smtpConnectionFailed") };
  }

  const [inserted] = await db.insert(mailAccounts).values({
    userId,
    name: fields.name,
    email: fields.email,
    color: fields.color,
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
  await triggerImmediateSync(inserted.id).catch((err) =>
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
    color: formData.get("color"),
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
    const fieldErrors = await translateFieldErrors(parsed.error.flatten().fieldErrors, true);
    return { fieldErrors };
  }

  const t = await getTranslations("settings.errors");
  const { password, ...fields } = parsed.data;
  const encryptedPassword = password ? encrypt(password) : existing.encryptedPassword;

  // Re-verify connections if any connection-relevant field changed
  const candidate = {
    id: existing.id,
    userId,
    name: fields.name,
    email: fields.email,
    color: fields.color,
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
    return { error: t("imapConnectionFailed") };
  }

  const smtpResult = await verifySmtpConnection(candidate);
  if (!smtpResult.ok) {
    console.error("[updateMailAccount] SMTP verification failed for", fields.email);
    return { error: t("smtpConnectionFailed") };
  }

  await db
    .update(mailAccounts)
    .set({
      name: fields.name,
      email: fields.email,
      color: fields.color,
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

  // Trigger an immediate re-sync so updated credentials are validated by the worker
  await triggerImmediateSync(accountId).catch((err) =>
    console.error("[updateMailAccount] Failed to enqueue re-sync for", fields.email, err)
  );

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
