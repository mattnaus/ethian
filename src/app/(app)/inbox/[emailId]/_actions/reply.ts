"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";
import { sendEmail } from "@/lib/smtp/client";

type SendReplyResult =
  | { success: true; sentEmailId: string; sentAt: string }
  | { success: false; error: string };

export async function sendReplyAction(payload: {
  mailAccountId: string;
  emailId: string;
  bodyText: string;
}): Promise<SendReplyResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

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
        eq(emails.id, payload.emailId),
        eq(emails.mailAccountId, payload.mailAccountId),
        eq(mailAccounts.userId, userId),
      ),
    )
    .limit(1);

  if (!row) return { success: false, error: "Email not found" };

  // RFC 2822 threading headers
  const replySubject = /^re:/i.test(row.subject) ? row.subject : `Re: ${row.subject}`;
  const replyReferences = [...(row.references ?? []), row.messageId];

  // Send via SMTP
  let sendResult: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sendResult = await sendEmail(row.account, {
      to: [{ address: row.fromAddress, name: row.fromName ?? undefined }],
      subject: replySubject,
      bodyText: payload.bodyText,
      inReplyTo: row.messageId,
      references: replyReferences,
    });
  } catch (err) {
    console.error("[sendReply] SMTP error:", err);
    return { success: false, error: "Failed to send. Please try again." };
  }

  // Insert sent email into DB immediately
  const now = new Date();
  const [inserted] = await db
    .insert(emails)
    .values({
      mailAccountId: payload.mailAccountId,
      messageId: sendResult.messageId,
      threadId: row.threadId ?? row.messageId,
      inReplyTo: row.messageId,
      references: replyReferences,
      subject: replySubject,
      fromAddress: row.account.email,
      fromName: row.account.name,
      toAddresses: [{ address: row.fromAddress, name: row.fromName ?? undefined }],
      bodyText: payload.bodyText,
      bodyHtml: null,
      snippet: payload.bodyText.slice(0, 200),
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

  revalidatePath(`/inbox/${payload.emailId}`);

  return {
    success: true,
    sentEmailId: inserted.id,
    sentAt: inserted.sentAt.toISOString(),
  };
}
