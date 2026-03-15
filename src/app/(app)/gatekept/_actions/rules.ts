"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, like } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts, senderRules } from "@/db/schema";
import type { EmailCategory } from "@/types";

type SenderDecision = "approved" | "blocked" | "feed" | "paper_trail";

/** Escape SQL LIKE wildcards so they match literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

const decisionToCategory: Record<SenderDecision, EmailCategory> = {
  approved: "inbox",
  blocked: "trash",
  feed: "feed",
  paper_trail: "paper_trail",
};

export async function updateSenderRuleDecision(
  ruleId: string,
  newDecision: SenderDecision,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  const [rule] = await db
    .select()
    .from(senderRules)
    .where(and(eq(senderRules.id, ruleId), eq(senderRules.userId, userId)))
    .limit(1);

  if (!rule) return { success: false, error: "Not found" };

  const oldCategory = decisionToCategory[rule.decision as SenderDecision];
  const newCategory = decisionToCategory[newDecision];

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(senderRules)
        .set({ decision: newDecision })
        .where(eq(senderRules.id, ruleId));

      // Re-categorize matching emails across all user accounts
      const userAccounts = await tx
        .select({ id: mailAccounts.id })
        .from(mailAccounts)
        .where(eq(mailAccounts.userId, userId));

      const accountIds = userAccounts.map((a) => a.id);

      if (accountIds.length > 0) {
        if (rule.appliesTo === "address" && rule.fromAddress) {
          await tx
            .update(emails)
            .set({ category: newCategory })
            .where(
              and(
                eq(emails.fromAddress, rule.fromAddress),
                eq(emails.category, oldCategory),
                inArray(emails.mailAccountId, accountIds),
              ),
            );
        } else if (rule.appliesTo === "domain" && rule.fromDomain) {
          await tx
            .update(emails)
            .set({ category: newCategory })
            .where(
              and(
                like(emails.fromAddress, `%@${escapeLike(rule.fromDomain)}`),
                eq(emails.category, oldCategory),
                inArray(emails.mailAccountId, accountIds),
              ),
            );
        }
      }
    });
  } catch {
    return { success: false, error: "Failed to update rule" };
  }

  revalidatePath("/gatekept");
  revalidatePath("/inbox");
  revalidatePath("/gatekeeper");

  return { success: true };
}

export async function deleteSenderRule(
  ruleId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  const [rule] = await db
    .select({ id: senderRules.id })
    .from(senderRules)
    .where(and(eq(senderRules.id, ruleId), eq(senderRules.userId, userId)))
    .limit(1);

  if (!rule) return { success: false, error: "Not found" };

  try {
    await db.delete(senderRules).where(eq(senderRules.id, ruleId));
  } catch {
    return { success: false, error: "Failed to delete rule" };
  }

  revalidatePath("/gatekept");

  return { success: true };
}
