"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import { normalizeMessageId } from "@/lib/utils";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";
import { sendEmail } from "@/lib/smtp/client";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SaveDraftSchema = z.object({
  mailAccountId: z.string().regex(UUID_RE),
  toAddresses: z.array(z.string().email()).min(0).max(100),
  subject: z.string().max(1000),
  bodyText: z.string().max(100_000),
  draftId: z.string().regex(UUID_RE).optional(),
  signatureId: z.string().regex(UUID_RE).nullable().optional(),
});

const SendSchema = z.object({
  mailAccountId: z.string().regex(UUID_RE),
  toAddresses: z.array(z.string().email()).min(1, "At least one recipient required").max(100),
  subject: z.string().max(1000),
  bodyText: z.string().trim().min(1).max(100_000),
  draftId: z.string().regex(UUID_RE).optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SaveComposeDraftResult =
  | { success: true; draftId: string }
  | { success: false; error: string };

export type SendNewEmailResult =
  | { success: true; sentEmailId: string; sentAt: string }
  | { success: "partial" }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// saveComposeDraftAction
// ---------------------------------------------------------------------------

export async function saveComposeDraftAction(
  payload: unknown,
): Promise<SaveComposeDraftResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = SaveDraftSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { mailAccountId, toAddresses, subject, bodyText, draftId, signatureId } = parsed.data;
  const userId = session.user.id;

  // Verify account ownership and fetch display fields for draft storage
  const [account] = await db
    .select({ id: mailAccounts.id, email: mailAccounts.email, name: mailAccounts.name })
    .from(mailAccounts)
    .where(and(eq(mailAccounts.id, mailAccountId), eq(mailAccounts.userId, userId)))
    .limit(1);

  if (!account) return { success: false, error: "not_found" };

  const toJson = toAddresses.map((a) => ({ address: a }));
  const snippet = bodyText.slice(0, 200);
  const now = new Date();

  try {
    if (draftId) {
      // Verify the draft belongs to this user (via its current mailAccount, not the new one)
      const [existingDraft] = await db
        .select({ id: emails.id })
        .from(emails)
        .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
        .where(
          and(
            eq(emails.id, draftId),
            eq(emails.isDraft, true),
            eq(mailAccounts.userId, userId),
          ),
        )
        .limit(1);

      if (!existingDraft) return { success: false, error: "not_found" };

      // Update including mailAccountId so a From-account change is persisted
      await db
        .update(emails)
        .set({
          mailAccountId,
          fromAddress: account.email,
          fromName: account.name ?? null,
          toAddresses: toJson,
          subject,
          bodyText,
          snippet,
          signatureId: signatureId ?? null,
          updatedAt: now,
        })
        .where(eq(emails.id, draftId));

      revalidatePath("/drafts");
      return { success: true, draftId };
    }

    const messageId = `draft-${randomUUID()}@ethian.local`;
    const [inserted] = await db
      .insert(emails)
      .values({
        mailAccountId,
        messageId,
        threadId: null,
        inReplyTo: null,
        references: [],
        subject,
        fromAddress: account.email,
        fromName: account.name ?? null,
        toAddresses: toJson,
        bodyText,
        bodyHtml: null,
        snippet,
        signatureId: signatureId ?? null,
        sentAt: now,
        receivedAt: now,
        isRead: true,
        isDraft: true,
        isSent: false,
        category: "draft",
        imapUid: 0,
        imapFlags: [],
        imapMailbox: "Drafts",
      })
      .returning({ id: emails.id });

    revalidatePath("/drafts");
    return { success: true, draftId: inserted.id };
  } catch (err) {
    console.error("[saveComposeDraft] error:", err);
    return { success: false, error: "db_error" };
  }
}

// ---------------------------------------------------------------------------
// sendNewEmailAction
// ---------------------------------------------------------------------------

export async function sendNewEmailAction(
  payload: unknown,
): Promise<SendNewEmailResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = SendSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { mailAccountId, toAddresses, subject, bodyText, draftId } = parsed.data;
  const userId = session.user.id;

  const [account] = await db
    .select()
    .from(mailAccounts)
    .where(and(eq(mailAccounts.id, mailAccountId), eq(mailAccounts.userId, userId)))
    .limit(1);

  if (!account) return { success: false, error: "not_found" };

  // Send via SMTP
  let sendResult: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sendResult = await sendEmail(account, {
      to: toAddresses.map((a) => ({ address: a })),
      subject: subject || "(no subject)",
      bodyText,
    });
  } catch (err) {
    console.error("[sendNewEmail] SMTP error:", err);
    return { success: false, error: "smtp_error" };
  }

  const now = new Date();
  let insertedId: string | undefined;

  try {
    const [inserted] = await db
      .insert(emails)
      .values({
        mailAccountId,
        messageId: normalizeMessageId(sendResult.messageId) ?? sendResult.messageId,
        threadId: null,
        inReplyTo: null,
        references: [],
        subject: subject || "(no subject)",
        fromAddress: account.email,
        fromName: account.name,
        toAddresses: toAddresses.map((a) => ({ address: a })),
        bodyText,
        bodyHtml: null,
        snippet: bodyText.slice(0, 200),
        sentAt: now,
        receivedAt: now,
        isRead: true,
        isSent: true,
        isDraft: false,
        category: "sent",
        imapUid: 0,
        imapFlags: ["\\Seen"],
        imapMailbox: "Sent",
      })
      .returning({ id: emails.id, sentAt: emails.sentAt });

    insertedId = inserted?.id;
  } catch (err) {
    console.error("[sendNewEmail] DB insert failed after SMTP send:", sendResult.messageId, err);
    // Delete draft even on partial failure
    if (draftId) {
      await db.delete(emails).where(and(eq(emails.id, draftId), eq(emails.isDraft, true))).catch(() => {});
    }
    return { success: "partial" };
  }

  // Delete the draft if it was saved
  if (draftId) {
    await db
      .delete(emails)
      .where(
        and(
          eq(emails.id, draftId),
          eq(emails.isDraft, true),
          eq(emails.mailAccountId, mailAccountId),
        ),
      )
      .catch((err: unknown) => console.error("[sendNewEmail] draft delete failed:", err));
  }

  revalidatePath("/drafts");

  return {
    success: true,
    sentEmailId: insertedId ?? "",
    sentAt: now.toISOString(),
  };
}
