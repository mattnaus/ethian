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

  const [rows, [{ total }], [{ screenerCount }], allAccounts] = await Promise.all([
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
        threadId: emails.threadId,
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

    db
      .select({ id: mailAccounts.id, name: mailAccounts.name, color: mailAccounts.color })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId)),
  ]);

  const locale = await getLocale();

  // Pass 1: raw rows → flat entries
  const allEntries = rows.map((row) => ({
    ...row,
    snippet: row.snippet ?? "",
    sentAt: row.sentAt.toISOString(),
    threadCount: 1,
  }));

  // Pass 2: group by threadId, pick the latest (rows are DESC by sentAt)
  // TODO: threadCount may be understated if thread spans >100 rows
  const threadMap = new Map<string, typeof allEntries[number]>();
  const threadCounts = new Map<string, number>();

  for (const entry of allEntries) {
    const key = entry.threadId ? `${entry.threadId}:${entry.mailAccountId}` : entry.id;
    threadCounts.set(key, (threadCounts.get(key) ?? 0) + 1);
    if (!threadMap.has(key)) {
      threadMap.set(key, entry);
    } else {
      const existing = threadMap.get(key)!;
      if (!entry.isRead) existing.isRead = false;
      if (entry.hasAttachments) existing.hasAttachments = true;
    }
  }

  // Pass 3: output in original order, deduplicated
  const seen = new Set<string>();
  const entries: typeof allEntries = [];
  for (const entry of allEntries) {
    const key = entry.threadId ? `${entry.threadId}:${entry.mailAccountId}` : entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ ...threadMap.get(key)!, threadCount: threadCounts.get(key) ?? 1 });
  }

  // All user accounts — used for the mailbox filter (independent of inbox contents)
  const accounts = allAccounts;

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
