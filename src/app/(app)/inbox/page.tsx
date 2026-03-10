import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";
import { EmailList } from "./_components/email-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.inbox");
  return { title: t("title") };
}

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const rows = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      fromName: emails.fromName,
      fromAddress: emails.fromAddress,
      snippet: emails.snippet,
      sentAt: emails.sentAt,
      isRead: emails.isRead,
      accountColor: mailAccounts.color,
      hasAttachments: sql<boolean>`EXISTS (
        SELECT 1 FROM email_attachments
        WHERE email_attachments.email_id = ${emails.id}
        AND email_attachments.content_id IS NULL
      )`,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(mailAccounts.userId, userId),
        eq(emails.category, "inbox"),
      ),
    )
    .orderBy(desc(emails.sentAt))
    .limit(100);

  const t = await getTranslations("pages.inbox");

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 items-center border-b border-zinc-800 px-6 shrink-0">
        <h1 className="text-base font-semibold text-zinc-100">{t("title")}</h1>
      </header>
      <EmailList emails={rows} emptyMessage={t("empty")} />
    </div>
  );
}
