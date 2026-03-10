import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailAttachments, emails, mailAccounts } from "@/db/schema";
import { EmailList } from "./_components/email-list";

const INBOX_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.inbox");
  return { title: t("title") };
}

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Correlated subquery via Drizzle's query builder — table tracked at compile time
  const attachmentSubquery = db
    .select({ _: sql`1` })
    .from(emailAttachments)
    .where(
      and(
        eq(emailAttachments.emailId, emails.id),
        isNull(emailAttachments.contentId),
      ),
    );

  const baseCondition = and(
    eq(mailAccounts.userId, userId),
    eq(emails.category, "inbox"),
  );

  const [rows, [{ total }]] = await Promise.all([
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
        hasAttachments: sql<boolean>`EXISTS (${attachmentSubquery})`,
      })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(baseCondition)
      .orderBy(desc(emails.sentAt))
      .limit(INBOX_LIMIT),

    db
      .select({ total: count() })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(baseCondition),
  ]);

  const [t, locale] = await Promise.all([
    getTranslations("pages.inbox"),
    getLocale(),
  ]);

  // Serialize Date → ISO string for serialization safety
  const emailRows = rows.map((row) => ({
    ...row,
    sentAt: row.sentAt.toISOString(),
  }));

  const showingMessage =
    total > INBOX_LIMIT ? t("showingOf", { shown: INBOX_LIMIT, total }) : null;

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 items-center border-b border-zinc-800 px-6 shrink-0">
        <h1 className="text-base font-semibold text-zinc-100">{t("title")}</h1>
      </header>
      <EmailList
        emails={emailRows}
        emptyMessage={t("empty")}
        showingMessage={showingMessage}
        locale={locale}
      />
    </div>
  );
}
