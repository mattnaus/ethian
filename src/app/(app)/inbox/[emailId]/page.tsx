import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { EmailDetailView, type ThreadMessage } from "./_components/email-detail-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = await params;

  if (!UUID_RE.test(emailId)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Fetch email + account color, scoped to the session user
  const [row] = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      fromName: emails.fromName,
      fromAddress: emails.fromAddress,
      toAddresses: emails.toAddresses,
      bodyHtml: emails.bodyHtml,
      bodyText: emails.bodyText,
      sentAt: emails.sentAt,
      isRead: emails.isRead,
      threadId: emails.threadId,
      mailAccountId: emails.mailAccountId,
      accountColor: mailAccounts.color,
      accountName: mailAccounts.name,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(emails.id, emailId),
        eq(mailAccounts.userId, userId),
      ),
    )
    .limit(1);

  if (!row) notFound();

  // Fetch all thread messages (or just the entry email if threadId is null)
  // When threadId is null, treat as single-message thread — skip the query.
  const threadRows = row.threadId
    ? await db
        .select({
          id: emails.id,
          fromName: emails.fromName,
          fromAddress: emails.fromAddress,
          toAddresses: emails.toAddresses,
          bodyHtml: emails.bodyHtml,
          bodyText: emails.bodyText,
          sentAt: emails.sentAt,
          isRead: emails.isRead,
          accountColor: mailAccounts.color,
        })
        .from(emails)
        .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
        .where(and(
          eq(emails.threadId, row.threadId),
          eq(emails.mailAccountId, row.mailAccountId),
          eq(mailAccounts.userId, userId),
        ))
        .orderBy(asc(emails.sentAt))
    : [];

  // Fetch attachments for all thread messages in one query
  const threadEmailIds = threadRows.map((r) => r.id);

  const allAttachments =
    threadEmailIds.length > 0
      ? await db
          .select({
            id: emailAttachments.id,
            emailId: emailAttachments.emailId,
            filename: emailAttachments.filename,
            contentType: emailAttachments.contentType,
            size: emailAttachments.size,
          })
          .from(emailAttachments)
          .where(
            and(
              inArray(emailAttachments.emailId, threadEmailIds),
              isNull(emailAttachments.contentId),
            ),
          )
      : [];

  const attachmentsByEmailId = new Map<string, typeof allAttachments>();
  for (const att of allAttachments) {
    const list = attachmentsByEmailId.get(att.emailId) ?? [];
    list.push(att);
    attachmentsByEmailId.set(att.emailId, list);
  }

  // Mark all unread thread messages as read (fire-and-forget)
  const unreadIds = threadRows.filter((r) => !r.isRead).map((r) => r.id);
  // Also mark the entry email if it wasn't included in threadRows (null-threadId case)
  if (threadRows.length === 0 && !row.isRead) {
    db.update(emails)
      .set({ isRead: true })
      .where(eq(emails.id, row.id))
      .execute()
      .catch((err: unknown) => {
        console.error("[EmailDetail] Failed to mark email as read:", err);
      });
  } else if (unreadIds.length > 0) {
    db.update(emails)
      .set({ isRead: true })
      .where(inArray(emails.id, unreadIds))
      .execute()
      .catch((err: unknown) => {
        console.error("[EmailDetail] Failed to mark thread as read:", err);
      });
  }

  const locale = await getLocale();

  const email = {
    ...row,
    sentAt: row.sentAt.toISOString(),
    isRead: row.isRead,
  };

  // Build threadMessages array
  const threadMessages: ThreadMessage[] = threadRows.map((r) => ({
    id: r.id,
    fromName: r.fromName,
    fromAddress: r.fromAddress,
    toAddresses: Array.isArray(r.toAddresses) ? r.toAddresses : [],
    bodyHtml: r.bodyHtml,
    bodyText: r.bodyText,
    sentAt: r.sentAt.toISOString(),
    isRead: r.isRead,
    accountColor: r.accountColor,
    attachments: attachmentsByEmailId.get(r.id) ?? [],
  }));

  // If threadId was null, construct a single-entry thread from row
  const finalThreadMessages: ThreadMessage[] =
    threadMessages.length > 0
      ? threadMessages
      : [
          {
            id: row.id,
            fromName: row.fromName,
            fromAddress: row.fromAddress,
            toAddresses: Array.isArray(row.toAddresses) ? row.toAddresses : [],
            bodyHtml: row.bodyHtml,
            bodyText: row.bodyText,
            sentAt: row.sentAt.toISOString(),
            isRead: row.isRead,
            accountColor: row.accountColor,
            attachments: [],
          },
        ];

  return (
    <EmailDetailView email={email} threadMessages={finalThreadMessages} locale={locale} />
  );
}
