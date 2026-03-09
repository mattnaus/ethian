import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db, mailAccounts } from "@/db";
import { eq } from "drizzle-orm";
import { AccountsList } from "./_components/accounts-list";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const accounts = await db
    .select()
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId))
    .orderBy(mailAccounts.createdAt);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your Ethian configuration.</p>
      </div>

      <AccountsList accounts={accounts} />
    </div>
  );
}
