import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { mailAccounts, screenerQueue } from "@/db/schema";
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

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: screenerQueue.id,
        fromAddress: screenerQueue.fromAddress,
        fromName: screenerQueue.fromName,
        fromDomain: screenerQueue.fromDomain,
        subject: screenerQueue.subject,
        messageCount: screenerQueue.messageCount,
        lastSeenAt: screenerQueue.lastSeenAt,
        accountColor: mailAccounts.color,
      })
      .from(screenerQueue)
      .innerJoin(mailAccounts, eq(screenerQueue.mailAccountId, mailAccounts.id))
      .where(eq(screenerQueue.userId, userId))
      .orderBy(desc(screenerQueue.lastSeenAt))
      .limit(GATEKEEPER_LIMIT),

    db
      .select({ total: count() })
      .from(screenerQueue)
      .where(eq(screenerQueue.userId, userId)),
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
    <div className="flex flex-col h-full">
      <header className="flex h-12 items-center border-b border-zinc-800 px-6 shrink-0">
        <h1 className="text-base font-semibold text-zinc-100">{t("title")}</h1>
      </header>
      <GatekeeperList
        entries={entries}
        emptyMessage={t("empty")}
        showingMessage={showingMessage}
        locale={locale}
      />
    </div>
  );
}
