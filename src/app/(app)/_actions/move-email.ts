"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts, senderRules } from "@/db/schema";
import type { EmailCategory, SenderDecision } from "@/types";

const categoryToDecision: Record<string, SenderDecision> = {
  inbox: "approved",
  feed: "feed",
  paper_trail: "paper_trail",
  trash: "blocked",
};

export async function moveEmailAction({
  emailId,
  targetCategory,
  createRule,
}: {
  emailId: string;
  targetCategory: "inbox" | "feed" | "paper_trail" | "trash";
  createRule?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  // Fetch the email + verify ownership
  const [row] = await db
    .select({
      id: emails.id,
      fromAddress: emails.fromAddress,
      category: emails.category,
      mailAccountId: emails.mailAccountId,
    })
    .from(emails)
    .innerJoin(mailAccounts, eq(emails.mailAccountId, mailAccounts.id))
    .where(
      and(
        eq(emails.id, emailId),
        eq(mailAccounts.userId, userId),
      ),
    )
    .limit(1);

  if (!row) return { success: false, error: "Not found" };

  // Don't move if already in the target category
  if (row.category === targetCategory) {
    return { success: true };
  }

  try {
    await db.transaction(async (tx) => {
      // Update email category
      await tx
        .update(emails)
        .set({ category: targetCategory as EmailCategory })
        .where(eq(emails.id, emailId));

      // Optionally create/update sender rule
      if (createRule && row.fromAddress) {
        const decision = categoryToDecision[targetCategory];
        if (decision) {
          await tx
            .insert(senderRules)
            .values({
              userId,
              fromAddress: row.fromAddress.toLowerCase(),
              decision,
              appliesTo: "address",
            })
            .onConflictDoUpdate({
              target: [senderRules.userId, senderRules.fromAddress],
              set: { decision },
            });
        }
      }
    });
  } catch {
    return { success: false, error: "Failed to move email" };
  }

  revalidatePath("/inbox");
  revalidatePath("/feed");
  revalidatePath("/saved");
  revalidatePath("/trash");

  return { success: true };
}
