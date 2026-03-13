"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";
import { sendEmail } from "@/lib/smtp/client";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PayloadSchema = z.object({
  mailAccountId: z.string().regex(UUID_RE),
  emailId: z.string().regex(UUID_RE),
  bodyText: z.string().trim().min(1).max(100_000),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SendReplyError =
  | "unauthenticated"
  | "invalid_input"
  | "not_found"
  | "smtp_error"
  | "db_error";

export type SendReplyResult =
  | { success: true; sentEmailId: string; sentAt: string }
  | { success: "partial" } // SMTP sent but DB insert failed — email was delivered
  | { success: false; error: SendReplyError };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function sendReplyAction(payload: unknown): Promise<SendReplyResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "unauthenticated" };

  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  const { mailAccountId, emailId, bodyText } = parsed.data;
  const userId = session.user.id;

  // Fetch the email being replied to + full mail account (SMTP credentials)
  const [row] = await db
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

  if (!row) return { success: false, error: "not_found" };

  // RFC 2822 threading headers
  const replySubject = /^re:/i.test(row.subject) ? row.subject : `Re: ${row.subject}`;
  const replyReferences = [...(row.references ?? []), row.messageId];

  // Send via SMTP
  let sendResult: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sendResult = await sendEmail(row.account, {
      to: [{ address: row.fromAddress, name: row.fromName ?? undefined }],
      subject: replySubject,
      bodyText,
      inReplyTo: row.messageId,
      references: replyReferences,
    });
  } catch (err) {
    console.error("[sendReply] SMTP error:", err);
    return { success: false, error: "smtp_error" };
  }

  // Insert sent email into DB immediately
  const now = new Date();
  let inserted: { id: string; sentAt: Date } | undefined;
  try {
    [inserted] = await db
      .insert(emails)
      .values({
        mailAccountId,
        messageId: sendResult.messageId,
        threadId: row.threadId ?? row.messageId,
        inReplyTo: row.messageId,
        references: replyReferences,
        subject: replySubject,
        fromAddress: row.account.email,
        fromName: row.account.name,
        toAddresses: [{ address: row.fromAddress, name: row.fromName ?? undefined }],
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
    // Email was sent successfully via SMTP but we failed to record it locally.
    // Log with enough context to recover manually if needed.
    console.error(
      "[sendReply] DB insert failed after successful SMTP send. messageId:",
      sendResult.messageId,
      err,
    );
    return { success: "partial" };
  }

  if (!inserted) {
    console.error(
      "[sendReply] DB insert returned no row. messageId:",
      sendResult.messageId,
    );
    return { success: "partial" };
  }

  revalidatePath(`/inbox/${emailId}`);

  return {
    success: true,
    sentEmailId: inserted.id,
    sentAt: inserted.sentAt.toISOString(),
  };
}
