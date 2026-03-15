import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { DraftsView } from "./_components/drafts-view";

const DRAFTS_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.drafts");
  return { title: t("title") };
}

export default async function DraftsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Correlated subquery — checks if the draft has non-inline attachments
  const attachmentSubquery = db
    .select({ _: sql`1` })
    .from(emailAttachments)
    .where(
      and(
        eq(emailAttachments.emailId, emails.id),
        isNull(emailAttachments.contentId),
      ),
    );

  const [rows, [{ total }], allAccounts] = await Promise.all([
    db
      .select({
        id: emails.id,
        subject: emails.subject,
        toAddresses: emails.toAddresses,
        snippet: emails.snippet,
        updatedAt: emails.updatedAt,
        accountColor: mailAccounts.color,
        mailAccountId: mailAccounts.id,
        mailAccountName: mailAccounts.name,
        hasAttachments: sql<boolean>`EXISTS (${attachmentSubquery})`,
      })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(
          eq(emails.isDraft, true),
          isNull(emails.inReplyTo),
          eq(mailAccounts.userId, userId),
        ),
      )
      .orderBy(desc(emails.updatedAt))
      .limit(DRAFTS_LIMIT),

    db
      .select({ total: count() })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(
          eq(emails.isDraft, true),
          isNull(emails.inReplyTo),
          eq(mailAccounts.userId, userId),
        ),
      ),

    db
      .select({ id: mailAccounts.id, name: mailAccounts.name, color: mailAccounts.color })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId)),
  ]);

  const locale = await getLocale();

  const entries = rows.map((row) => ({
    ...row,
    subject: row.subject ?? "",
    snippet: row.snippet ?? "",
    updatedAt: row.updatedAt.toISOString(),
    toAddresses: Array.isArray(row.toAddresses)
      ? (row.toAddresses as Array<{ address: string; name?: string }>)
      : [],
  }));

  return (
    <DraftsView
      drafts={entries}
      accounts={allAccounts}
      locale={locale}
      total={total}
    />
  );
}
