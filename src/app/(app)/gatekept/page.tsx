import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { senderRules } from "@/db/schema";
import { GatekeptList } from "./_components/gatekept-list";

const GATEKEPT_LIMIT = 200;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.gatekept");
  return { title: t("title") };
}

export type SerializedSenderRule = {
  id: string;
  fromAddress: string | null;
  fromDomain: string | null;
  displayName: string | null;
  decision: string;
  appliesTo: string;
  createdAt: string;
};

export default async function GatekeptPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(senderRules)
      .where(eq(senderRules.userId, userId))
      .orderBy(desc(senderRules.createdAt))
      .limit(GATEKEPT_LIMIT),
    db
      .select({ total: count() })
      .from(senderRules)
      .where(eq(senderRules.userId, userId)),
  ]);

  const locale = await getLocale();

  const rules: SerializedSenderRule[] = rows.map((row) => ({
    id: row.id,
    fromAddress: row.fromAddress,
    fromDomain: row.fromDomain,
    displayName: row.displayName,
    decision: row.decision,
    appliesTo: row.appliesTo,
    createdAt: row.createdAt.toISOString(),
  }));

  return <GatekeptList rules={rules} total={total} locale={locale} />;
}
