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

const SaveDraftSchema = z.object({
  mailAccountId: z.string().regex(UUID_RE),
  emailId: z.string().regex(UUID_RE),
  bodyText: z.string().max(100_000),
  draftId: z.string().regex(UUID_RE).optional(),
  signatureId: z.string().regex(UUID_RE).nullable().optional(),
});

const DeleteDraftSchema = z.object({
  draftId: z.string().regex(UUID_RE),
  emailId: z.string().regex(UUID_RE),
});

const SendDraftSchema = z.object({
  draftId: z.string().regex(UUID_RE),
  mailAccountId: z.string().regex(UUID_RE),
  emailId: z.string().regex(UUID_RE),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SaveDraftResult =
  | { success: true; draftId: string; savedAt: string }
  | { success: false; error: string };

export type DeleteDraftResult = { success: true } | { success: false; error: string };

export type SendDraftResult =
  | { success: true; sentEmailId: string; sentAt: string }
  | { success: "partial" }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Save draft
// ---------------------------------------------------------------------------

export async function saveDraftAction(payload: unknown): Promise<SaveDraftResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = SaveDraftSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { mailAccountId, emailId, bodyText, draftId, signatureId } = parsed.data;
  const userId = session.user.id;

  // Verify the parent email belongs to this user
  const [parent] = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      threadId: emails.threadId,
      messageId: emails.messageId,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(emails.id, emailId),
        eq(emails.mailAccountId, mailAccountId),
        eq(mailAccounts.userId, userId),
      ),
    )
    .limit(1);

  if (!parent) return { success: false, error: "not_found" };

  const now = new Date();
  const snippet = bodyText.slice(0, 200);

  if (draftId) {
    // Update existing draft (ownership already implied by mailAccountId + userId check)
    const [updated] = await db
      .update(emails)
      .set({ bodyText, snippet, signatureId: signatureId ?? null, updatedAt: now })
      .where(
        and(
          eq(emails.id, draftId),
          eq(emails.isDraft, true),
          eq(emails.mailAccountId, mailAccountId),
        ),
      )
      .returning({ id: emails.id, updatedAt: emails.updatedAt });

    if (!updated) return { success: false, error: "draft_not_found" };

    revalidatePath(`/inbox/${emailId}`);
    return { success: true, draftId: updated.id, savedAt: updated.updatedAt.toISOString() };
  }

  // Insert new draft
  const [inserted] = await db
    .insert(emails)
    .values({
      mailAccountId,
      messageId: `draft-${crypto.randomUUID()}@ethian.local`,
      threadId: parent.threadId ?? parent.messageId,
      subject: parent.subject,
      fromAddress: "",
      toAddresses: [],
      bodyText,
      bodyHtml: null,
      snippet,
      signatureId: signatureId ?? null,
      sentAt: now,
      receivedAt: now,
      isRead: true,
      isDraft: true,
      category: "draft",
      imapUid: 0,
      imapFlags: [],
      imapMailbox: "Drafts",
    })
    .returning({ id: emails.id, updatedAt: emails.updatedAt });

  if (!inserted) return { success: false, error: "insert_failed" };

  revalidatePath(`/inbox/${emailId}`);
  return { success: true, draftId: inserted.id, savedAt: inserted.updatedAt.toISOString() };
}

// ---------------------------------------------------------------------------
// Delete draft
// ---------------------------------------------------------------------------

export async function deleteDraftAction(payload: unknown): Promise<DeleteDraftResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = DeleteDraftSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { draftId, emailId } = parsed.data;
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

  revalidatePath(`/inbox/${emailId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Send draft
// ---------------------------------------------------------------------------

export async function sendDraftAction(payload: unknown): Promise<SendDraftResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = SendDraftSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { draftId, mailAccountId, emailId } = parsed.data;
  const userId = session.user.id;

  // Fetch draft + parent email + account in one go
  const [draft] = await db
    .select({ id: emails.id, bodyText: emails.bodyText, signatureId: emails.signatureId })
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

  // Fetch parent email for threading headers
  const [parent] = await db
    .select({
      messageId: emails.messageId,
      threadId: emails.threadId,
      subject: emails.subject,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      references: emails.references,
      account: mailAccounts,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(emails.id, emailId),
        eq(emails.mailAccountId, mailAccountId),
        eq(mailAccounts.userId, userId),
      ),
    )
    .limit(1);

  if (!parent) return { success: false, error: "not_found" };

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

  const replySubject = /^re:/i.test(parent.subject) ? parent.subject : `Re: ${parent.subject}`;
  const replyReferences = [...(parent.references ?? []), parent.messageId];

  let sendResult: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sendResult = await sendEmail(parent.account, {
      to: [{ address: parent.fromAddress, name: parent.fromName ?? undefined }],
      subject: replySubject,
      bodyText,
      inReplyTo: `<${normalizeMessageId(parent.messageId) ?? parent.messageId}>`,
      references: replyReferences.map((id) => `<${normalizeMessageId(id) ?? id}>`),
    });
  } catch (err) {
    console.error("[sendDraft] SMTP error:", err);
    return { success: false, error: "smtp_error" };
  }

  // Delete draft row
  await db.delete(emails).where(eq(emails.id, draftId)).catch((err: unknown) => {
    console.error("[sendDraft] Failed to delete draft after send:", err);
  });

  // Insert sent email
  const now = new Date();
  let inserted: { id: string; sentAt: Date } | undefined;
  try {
    [inserted] = await db
      .insert(emails)
      .values({
        mailAccountId,
        messageId: normalizeMessageId(sendResult.messageId) ?? sendResult.messageId,
        threadId: parent.threadId ?? parent.messageId,
        inReplyTo: parent.messageId,
        references: replyReferences,
        subject: replySubject,
        fromAddress: parent.account.email,
        fromName: parent.account.name,
        toAddresses: [{ address: parent.fromAddress, name: parent.fromName ?? undefined }],
        bodyText,
        bodyHtml: null,
        snippet: bodyText.slice(0, 200),
        sentAt: now,
        receivedAt: now,
        isRead: true,
        isSent: true,
        category: "sent",
        imapUid: 0,
        imapFlags: ["\\Seen"],
        imapMailbox: "Sent",
      })
      .returning({ id: emails.id, sentAt: emails.sentAt });
  } catch (err) {
    console.error("[sendDraft] DB insert failed after successful SMTP send:", err);
    revalidatePath(`/inbox/${emailId}`);
    return { success: "partial" };
  }

  if (!inserted) {
    revalidatePath(`/inbox/${emailId}`);
    return { success: "partial" };
  }

  revalidatePath(`/inbox/${emailId}`);
  return { success: true, sentEmailId: inserted.id, sentAt: inserted.sentAt.toISOString() };
}
