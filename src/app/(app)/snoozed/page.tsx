import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { SnoozedView } from "./_components/snoozed-view";

const SNOOZED_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.snoozed");
  return { title: t("title") };
}

export default async function SnoozedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const attachmentSubquery = db
    .select({ _: sql`1` })
    .from(emailAttachments)
    .where(
      and(
        eq(emailAttachments.emailId, emails.id),
        sql`${emailAttachments.contentId} IS NULL`,
      ),
    );

  // Only show non-sent snoozed emails (sent emails are part of conversations)
  const snoozedFilter = and(
    eq(mailAccounts.userId, userId),
    isNotNull(emails.snoozedUntil),
    eq(emails.isSent, false),
  );

  const [rows, [{ total }], allAccounts] = await Promise.all([
    db
      .select({
        id: emails.id,
        subject: emails.subject,
        fromName: emails.fromName,
        fromAddress: emails.fromAddress,
        snippet: emails.snippet,
        sentAt: emails.sentAt,
        snoozedUntil: emails.snoozedUntil,
        category: emails.category,
        accountColor: mailAccounts.color,
        mailAccountId: mailAccounts.id,
        mailAccountName: mailAccounts.name,
        hasAttachments: sql<boolean>`EXISTS (${attachmentSubquery})`,
        threadId: emails.threadId,
      })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(snoozedFilter)
      .orderBy(desc(emails.snoozedUntil))
      .limit(SNOOZED_LIMIT),

    db
      .select({ total: count() })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(snoozedFilter),

    db
      .select({ id: mailAccounts.id, name: mailAccounts.name, color: mailAccounts.color })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId)),
  ]);

  const locale = await getLocale();

  // Thread-group: deduplicate by threadId, keeping the latest entry per thread
  const allEntries = rows.map((row) => ({
    ...row,
    subject: row.subject ?? "",
    snippet: row.snippet ?? "",
    sentAt: row.sentAt.toISOString(),
    snoozedUntil: row.snoozedUntil!.toISOString(),
  }));

  const seen = new Set<string>();
  const entries: typeof allEntries = [];
  for (const entry of allEntries) {
    const key = entry.threadId
      ? `${entry.threadId}:${entry.mailAccountId}`
      : entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  return (
    <SnoozedView
      emails={entries}
      accounts={allAccounts}
      locale={locale}
      total={entries.length}
    />
  );
}
