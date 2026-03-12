import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  emailAttachments,
  emails,
  mailAccounts,
  screenerQueue,
} from "@/db/schema";
import { InboxView } from "./_components/inbox-view";

const INBOX_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.inbox");
  return { title: t("title") };
}

export default async function InboxPage() {
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

  const [rows, [{ total }], [{ screenerCount }]] = await Promise.all([
    db
      .select({
        id: emails.id,
        subject: emails.subject,
        fromName: emails.fromName,
        fromAddress: emails.fromAddress,
        snippet: emails.snippet,
        sentAt: emails.sentAt,
        isRead: emails.isRead,
        accountColor: mailAccounts.color,
        mailAccountId: mailAccounts.id,
        mailAccountName: mailAccounts.name,
        hasAttachments: sql<boolean>`EXISTS (${attachmentSubquery})`,
      })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(eq(mailAccounts.userId, userId), eq(emails.category, "inbox")),
      )
      .orderBy(desc(emails.sentAt))
      .limit(INBOX_LIMIT),

    db
      .select({ total: count() })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(eq(mailAccounts.userId, userId), eq(emails.category, "inbox")),
      ),

    db
      .select({ screenerCount: count() })
      .from(screenerQueue)
      .where(eq(screenerQueue.userId, userId)),
  ]);

  const locale = await getLocale();

  const entries = rows.map((row) => ({
    ...row,
    snippet: row.snippet ?? "",
    sentAt: row.sentAt.toISOString(),
  }));

  // Distinct accounts in the inbox result (for the filter UI)
  const accountMap = new Map<string, { id: string; name: string; color: string }>();
  for (const row of rows) {
    if (!accountMap.has(row.mailAccountId)) {
      accountMap.set(row.mailAccountId, {
        id: row.mailAccountId,
        name: row.mailAccountName,
        color: row.accountColor,
      });
    }
  }
  const accounts = Array.from(accountMap.values());

  return (
    <InboxView
      emails={entries}
      accounts={accounts}
      screenerCount={screenerCount}
      locale={locale}
      total={total}
    />
  );
}
