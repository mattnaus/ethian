"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts, signatures } from "@/db/schema";
import { sendEmail } from "@/lib/smtp/client";
import { normalizeMessageId } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DiscardSchema = z.object({
  draftId: z.string().regex(UUID_RE),
});

const SendSchema = z.object({
  draftId: z.string().regex(UUID_RE),
  mailAccountId: z.string().regex(UUID_RE),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiscardDraftResult = { success: true } | { success: false; error: string };

export type SendStandaloneDraftResult =
  | { success: true; sentEmailId: string; sentAt: string }
  | { success: "partial" }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// discardStandaloneDraftAction
// ---------------------------------------------------------------------------

export async function discardStandaloneDraftAction(
  payload: unknown,
): Promise<DiscardDraftResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = DiscardSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { draftId } = parsed.data;
  const userId = session.user.id;

  // Ownership check via join
  const [draft] = await db
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

  if (!draft) return { success: false, error: "not_found" };

  await db.delete(emails).where(eq(emails.id, draftId));

  revalidatePath("/drafts");
  return { success: true };
}

// ---------------------------------------------------------------------------
// sendStandaloneDraftAction
// ---------------------------------------------------------------------------

export async function sendStandaloneDraftAction(
  payload: unknown,
): Promise<SendStandaloneDraftResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = SendSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { draftId, mailAccountId } = parsed.data;
  const userId = session.user.id;

  // Fetch draft row
  const [draft] = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      bodyText: emails.bodyText,
      toAddresses: emails.toAddresses,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      signatureId: emails.signatureId,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(emails.id, draftId),
        eq(emails.isDraft, true),
        eq(emails.mailAccountId, mailAccountId),
        eq(mailAccounts.userId, userId),
      ),
    )
    .limit(1);

  if (!draft) return { success: false, error: "not_found" };

  // Fetch account with SMTP credentials
  const [account] = await db
    .select()
    .from(mailAccounts)
    .where(and(eq(mailAccounts.id, mailAccountId), eq(mailAccounts.userId, userId)))
    .limit(1);

  if (!account) return { success: false, error: "not_found" };

  const toAddresses = Array.isArray(draft.toAddresses) ? draft.toAddresses : [];
  if (toAddresses.length === 0) return { success: false, error: "no_recipients" };

  let bodyText = draft.bodyText ?? "";

  // Append stored signature if one was chosen
  if (draft.signatureId) {
    const [sig] = await db
      .select({ content: signatures.content })
      .from(signatures)
      .where(eq(signatures.id, draft.signatureId))
      .limit(1);
    if (sig) {
      bodyText = `${bodyText}\n\n--\n${sig.content}`;
    }
  }

  // Send via SMTP
  let sendResult: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sendResult = await sendEmail(account, {
      to: toAddresses,
      subject: draft.subject || "(no subject)",
      bodyText,
    });
  } catch (err) {
    console.error("[sendStandaloneDraft] SMTP error:", err);
    return { success: false, error: "smtp_error" };
  }

  // Delete draft row
  await db.delete(emails).where(eq(emails.id, draftId)).catch((err: unknown) => {
    console.error("[sendStandaloneDraft] Failed to delete draft after send:", err);
  });

  // Insert sent email row
  const now = new Date();
  let inserted: { id: string; sentAt: Date } | undefined;
  try {
    [inserted] = await db
      .insert(emails)
      .values({
        mailAccountId,
        messageId: normalizeMessageId(sendResult.messageId) ?? sendResult.messageId,
        threadId: null,
        inReplyTo: null,
        references: [],
        subject: draft.subject || "(no subject)",
        fromAddress: account.email,
        fromName: account.name,
        toAddresses,
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
  } catch (err) {
    console.error("[sendStandaloneDraft] DB insert failed after SMTP send:", err);
    revalidatePath("/drafts");
    return { success: "partial" };
  }

  if (!inserted) {
    revalidatePath("/drafts");
    return { success: "partial" };
  }

  revalidatePath("/drafts");
  return { success: true, sentEmailId: inserted.id, sentAt: inserted.sentAt.toISOString() };
}
