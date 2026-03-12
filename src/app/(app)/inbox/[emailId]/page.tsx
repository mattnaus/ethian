import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { EmailDetailView } from "./_components/email-detail-view";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = await params;

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

  // Fetch non-inline attachments
  const attachmentRows = await db
    .select({
      id: emailAttachments.id,
      filename: emailAttachments.filename,
      contentType: emailAttachments.contentType,
      size: emailAttachments.size,
    })
    .from(emailAttachments)
    .where(
      and(
        eq(emailAttachments.emailId, emailId),
        isNull(emailAttachments.contentId),
      ),
    );

  // Mark as read (fire-and-forget — don't block render)
  if (!row.isRead) {
    db.update(emails)
      .set({ isRead: true })
      .where(eq(emails.id, emailId))
      .execute()
      .catch(() => {
        // Non-critical; ignore
      });
  }

  const locale = await getLocale();

  const email = {
    ...row,
    sentAt: row.sentAt.toISOString(),
    isRead: row.isRead,
  };

  return (
    <EmailDetailView
      email={email}
      attachments={attachmentRows}
      locale={locale}
    />
  );
}
