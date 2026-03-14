import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";
import { formatDistanceToNowStrict } from "date-fns";

export default async function DraftsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const t = await getTranslations("pages.drafts");

  const drafts = await db
    .select({
      id: emails.id,
      subject: emails.subject,
      toAddresses: emails.toAddresses,
      snippet: emails.snippet,
      updatedAt: emails.updatedAt,
      accountColor: mailAccounts.color,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(emails.isDraft, true),
        isNull(emails.inReplyTo),
        eq(mailAccounts.userId, userId),
      ),
    )
    .orderBy(desc(emails.updatedAt));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center px-4 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">{t("title")}</h1>
      </div>

      {/* List */}
      {drafts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {drafts.map((draft) => {
            const recipients = Array.isArray(draft.toAddresses)
              ? (draft.toAddresses as Array<{ address: string; name?: string }>)
                  .map((r) => r.name ?? r.address)
                  .join(", ")
              : "";

            const age = formatDistanceToNowStrict(draft.updatedAt, { addSuffix: true });

            return (
              <li key={draft.id}>
                <Link
                  href={`/compose?draft=${draft.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-900/60 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: draft.accountColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {recipients || <span className="text-muted-foreground">{t("to")}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{age}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {draft.subject || t("noSubject")}
                    </p>
                    {draft.snippet && (
                      <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                        {draft.snippet}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
