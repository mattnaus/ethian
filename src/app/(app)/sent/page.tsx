import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { SentView } from "./_components/sent-view";

const SENT_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.sent");
  return { title: t("title") };
}

export default async function SentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Correlated subquery — checks if the email has non-inline attachments
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
        sentAt: emails.sentAt,
        accountColor: mailAccounts.color,
        mailAccountId: mailAccounts.id,
        mailAccountName: mailAccounts.name,
        hasAttachments: sql<boolean>`EXISTS (${attachmentSubquery})`,
      })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(
          eq(emails.isSent, true),
          eq(emails.isDraft, false),
          eq(mailAccounts.userId, userId),
        ),
      )
      .orderBy(desc(emails.sentAt))
      .limit(SENT_LIMIT),

    db
      .select({ total: count() })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(
          eq(emails.isSent, true),
          eq(emails.isDraft, false),
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
    sentAt: row.sentAt.toISOString(),
    toAddresses: Array.isArray(row.toAddresses)
      ? (row.toAddresses as Array<{ address: string; name?: string }>)
      : [],
  }));

  return (
    <SentView
      emails={entries}
      accounts={allAccounts}
      locale={locale}
      total={total}
    />
  );
}
