import { redirect } from "next/navigation";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts, signatures } from "@/db/schema";
import { ComposeView } from "./_components/compose-view";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const { draft: draftId } = await searchParams;

  // Fetch all user's mail accounts
  const userAccounts = await db
    .select({
      id: mailAccounts.id,
      name: mailAccounts.name,
      email: mailAccounts.email,
      color: mailAccounts.color,
    })
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId))
    .orderBy(mailAccounts.createdAt);

  if (userAccounts.length === 0) redirect("/settings");

  // Fetch signatures
  const userSignatures = await db
    .select({
      id: signatures.id,
      name: signatures.name,
      content: signatures.content,
      isDefault: signatures.isDefault,
    })
    .from(signatures)
    .where(eq(signatures.userId, userId))
    .orderBy(signatures.createdAt);

  // Fetch known addresses (distinct senders from received emails)
  const knownRows = await db
    .selectDistinct({
      address: emails.fromAddress,
      name: emails.fromName,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(mailAccounts.userId, userId),
        eq(emails.isDraft, false),
        eq(emails.isSent, false),
        isNotNull(emails.fromAddress),
      ),
    )
    .limit(500);

  const knownAddresses = knownRows.map((r) => ({
    address: r.address,
    name: r.name,
  }));

  // Load draft if editing
  let draft = null;
  if (draftId) {
    const [draftRow] = await db
      .select({
        id: emails.id,
        mailAccountId: emails.mailAccountId,
        toAddresses: emails.toAddresses,
        subject: emails.subject,
        bodyText: emails.bodyText,
      })
      .from(emails)
      .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
      .where(
        and(
          eq(emails.id, draftId),
          eq(emails.isDraft, true),
          isNull(emails.inReplyTo),
          eq(mailAccounts.userId, userId),
        ),
      )
      .limit(1);

    if (draftRow) {
      draft = {
        id: draftRow.id,
        mailAccountId: draftRow.mailAccountId,
        toAddresses: Array.isArray(draftRow.toAddresses) ? draftRow.toAddresses as Array<{ address: string; name?: string }> : [],
        subject: draftRow.subject ?? "",
        bodyText: draftRow.bodyText,
      };
    }
  }

  return (
    <ComposeView
      mailAccounts={userAccounts}
      signatures={userSignatures}
      knownAddresses={knownAddresses}
      draft={draft}
    />
  );
}
