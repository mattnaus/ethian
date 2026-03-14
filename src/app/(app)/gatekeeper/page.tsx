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
        fromDomain: screenerQueue.fromDomain,
        mailAccountId: screenerQueue.mailAccountId,
        // Use the most recent email's subject and snippet (emailId → emails join)
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

  const [t, locale] = await Promise.all([
    getTranslations("pages.gatekeeper"),
    getLocale(),
  ]);

  const entries = rows.map((row) => ({
    ...row,
    lastSeenAt: row.lastSeenAt.toISOString(),
  }));

  const showingMessage =
    total > GATEKEEPER_LIMIT
      ? t("showingOf", { shown: GATEKEEPER_LIMIT, total })
      : null;

  return (
    <GatekeeperList
      entries={entries}
      accounts={allAccounts}
      showingMessage={showingMessage}
      locale={locale}
    />
  );
}
