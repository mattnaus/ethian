import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts, screenerQueue } from "@/db/schema";
import { GatekeeperList } from "./_components/gatekeeper-list";

const GATEKEEPER_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.gatekeeper");
  return { title: t("title") };
}

export default async function GatekeeperPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Correlated subquery — checks if the linked email has non-inline attachments
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
        id: screenerQueue.id,
        fromAddress: screenerQueue.fromAddress,
        fromName: screenerQueue.fromName,
        mailAccountId: screenerQueue.mailAccountId,
        mailAccountName: mailAccounts.name,
        subject: emails.subject,
        snippet: emails.snippet,
        lastSeenAt: screenerQueue.lastSeenAt,
        messageCount: screenerQueue.messageCount,
        accountColor: mailAccounts.color,
        hasAttachments: sql<boolean>`EXISTS (${attachmentSubquery})`,
      })
      .from(screenerQueue)
      .innerJoin(mailAccounts, eq(screenerQueue.mailAccountId, mailAccounts.id))
      .innerJoin(emails, eq(screenerQueue.emailId, emails.id))
      .where(eq(screenerQueue.userId, userId))
      .orderBy(desc(screenerQueue.lastSeenAt))
      .limit(GATEKEEPER_LIMIT),

    db
      .select({ total: count() })
      .from(screenerQueue)
      .where(eq(screenerQueue.userId, userId)),

    db
      .select({ id: mailAccounts.id, name: mailAccounts.name, color: mailAccounts.color })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId)),
  ]);

  const [locale] = await Promise.all([getLocale()]);

  // Map screener queue rows to the GatekeeperEmail shape (mirrors InboxEmail)
  const mappedEmails = rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    snippet: row.snippet ?? "",
    sentAt: row.lastSeenAt.toISOString(),
    isRead: false,
    accountColor: row.accountColor,
    mailAccountId: row.mailAccountId,
    mailAccountName: row.mailAccountName,
    hasAttachments: row.hasAttachments,
    threadId: null,
    threadCount: row.messageCount,
  }));

  return (
    <GatekeeperList
      emails={mappedEmails}
      accounts={allAccounts}
      locale={locale}
      total={total}
    />
  );
}
