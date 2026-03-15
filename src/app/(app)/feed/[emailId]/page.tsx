import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { ReadOnlyEmailView } from "@/app/(app)/_components/read-only-email-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FeedDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = await params;

  if (!UUID_RE.test(emailId)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

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
      category: emails.category,
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

  // Fetch attachments
  const attachments = await db
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

  // Mark as read (fire-and-forget)
  db.update(emails)
    .set({ isRead: true })
    .where(eq(emails.id, emailId))
    .execute()
    .catch((err: unknown) => {
      console.error("[FeedDetail] Failed to mark email as read:", err);
    });

  const locale = await getLocale();

  const email = {
    ...row,
    sentAt: row.sentAt.toISOString(),
    toAddresses: Array.isArray(row.toAddresses) ? row.toAddresses as Array<{ address: string; name?: string }> : [],
    attachments,
  };

  return <ReadOnlyEmailView email={email} locale={locale} backPath="/feed" />;
}
