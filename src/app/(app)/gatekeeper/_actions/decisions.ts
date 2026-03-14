"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts, screenerQueue, senderRules } from "@/db/schema";
import type { EmailCategory } from "@/types";

export type GatekeeperDecision = "approved" | "blocked" | "feed" | "paper_trail";

const decisionToCategory: Record<GatekeeperDecision, EmailCategory> = {
  approved: "inbox",
  blocked: "trash",
  feed: "feed",
  paper_trail: "paper_trail",
};

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

  // Upsert a sender rule for this address
  await db
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
  const userAccounts = await db
    .select({ id: mailAccounts.id })
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId));

  const accountIds = userAccounts.map((a) => a.id);

  if (accountIds.length > 0) {
    await db
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
  await db.delete(screenerQueue).where(eq(screenerQueue.id, screenerQueueId));

  revalidatePath("/gatekeeper");
  revalidatePath("/inbox");

  return { success: true };
}
