"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts, screenerQueue, senderRules } from "@/db/schema";
import type { EmailCategory } from "@/types";

export type GatekeeperDecision = "approved" | "blocked";

const decisionToCategory: Record<GatekeeperDecision, EmailCategory> = {
  approved: "inbox",
  blocked: "trash",
};

export async function fetchGatekeeperPreview(
  screenerQueueId: string,
): Promise<{ success: boolean; bodyHtml?: string | null; bodyText?: string | null; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const [row] = await db
    .select({
      bodyHtml: emails.bodyHtml,
      bodyText: emails.bodyText,
    })
    .from(screenerQueue)
    .innerJoin(emails, eq(screenerQueue.emailId, emails.id))
    .where(
      and(
        eq(screenerQueue.id, screenerQueueId),
        eq(screenerQueue.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row) return { success: false, error: "Not found" };

  return { success: true, bodyHtml: row.bodyHtml, bodyText: row.bodyText };
}

export async function makeGatekeeperDecision(
  screenerQueueId: string,
  decision: GatekeeperDecision,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  // Verify ownership and get sender info
  const [entry] = await db
    .select()
    .from(screenerQueue)
    .where(
      and(
        eq(screenerQueue.id, screenerQueueId),
        eq(screenerQueue.userId, userId),
      ),
    )
    .limit(1);

  if (!entry) return { success: false, error: "Not found" };

  const category = decisionToCategory[decision];

  await db.transaction(async (tx) => {
    // Upsert a sender rule for this address
    await tx
      .insert(senderRules)
      .values({
        userId,
        fromAddress: entry.fromAddress.toLowerCase(),
        displayName: entry.fromName ?? null,
        decision,
        appliesTo: "address",
      })
      .onConflictDoUpdate({
        target: [senderRules.userId, senderRules.fromAddress],
        set: { decision },
      });

    // Re-categorize all screener emails from this sender across user's accounts
    const userAccounts = await tx
      .select({ id: mailAccounts.id })
      .from(mailAccounts)
      .where(eq(mailAccounts.userId, userId));

    const accountIds = userAccounts.map((a) => a.id);

    if (accountIds.length > 0) {
      await tx
        .update(emails)
        .set({ category })
        .where(
          and(
            eq(emails.fromAddress, entry.fromAddress),
            eq(emails.category, "screener"),
            inArray(emails.mailAccountId, accountIds),
          ),
        );
    }

    // Remove from screener queue
    await tx.delete(screenerQueue).where(eq(screenerQueue.id, screenerQueueId));
  });

  revalidatePath("/gatekeeper");
  revalidatePath("/inbox");

  return { success: true };
}
