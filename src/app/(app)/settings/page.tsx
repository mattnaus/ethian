import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db, mailAccounts, signatures } from "@/db";
import { eq } from "drizzle-orm";
import { AccountsList } from "./_components/accounts-list";
import { SignaturesList } from "./_components/signatures-list";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const t = await getTranslations("settings");

  const [accounts, sigs] = await Promise.all([
    db
      .select()
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId))
      .orderBy(mailAccounts.createdAt),
    db
      .select()
      .from(signatures)
      .where(eq(signatures.userId, userId))
      .orderBy(signatures.createdAt),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">{t("heading")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("subheading")}</p>
      </div>

      <AccountsList accounts={accounts} />

      <div className="mt-10">
        <SignaturesList signatures={sigs} />
      </div>
    </div>
  );
}
