import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";
import { DraftDetailView, type DraftDetail } from "./_components/draft-detail-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  if (!UUID_RE.test(draftId)) notFound();

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
      updatedAt: emails.updatedAt,
      mailAccountId: emails.mailAccountId,
      accountColor: mailAccounts.color,
      accountName: mailAccounts.name,
      accountEmail: mailAccounts.email,
    })
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

  if (!row) notFound();

  const draft: DraftDetail = {
    ...row,
    toAddresses: Array.isArray(row.toAddresses) ? row.toAddresses : [],
    updatedAt: row.updatedAt.toISOString(),
    accountName: row.accountName ?? "",
    accountEmail: row.accountEmail,
  };

  return <DraftDetailView draft={draft} />;
}
