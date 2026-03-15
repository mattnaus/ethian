"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { emails, mailAccounts } from "@/db/schema";

export async function snoozeEmailAction({
  emailId,
  until,
}: {
  emailId: string;
  until: string; // ISO 8601
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  // Verify ownership and get thread info
  const [row] = await db
    .select({
      id: emails.id,
      threadId: emails.threadId,
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

  // Validate the snooze date
  const snoozedUntil = new Date(until);
  if (isNaN(snoozedUntil.getTime())) {
    return { success: false, error: "Invalid date" };
  }
  if (snoozedUntil.getTime() <= Date.now()) {
    return { success: false, error: "Snooze date must be in the future" };
  }

  try {
    // Snooze all emails in the same thread (or just the single email if no threadId)
    if (row.threadId) {
      await db
        .update(emails)
        .set({ snoozedUntil })
        .where(
          and(
            eq(emails.threadId, row.threadId),
            eq(emails.mailAccountId, row.mailAccountId),
          ),
        );
    } else {
      await db
        .update(emails)
        .set({ snoozedUntil })
        .where(eq(emails.id, emailId));
    }
  } catch {
    return { success: false, error: "Failed to snooze email" };
  }

  revalidatePath("/inbox");
  revalidatePath("/feed");
  revalidatePath("/saved");
  revalidatePath("/snoozed");

  return { success: true };
}

export async function unsnoozeEmailAction({
  emailId,
}: {
  emailId: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  // Verify ownership and get thread info
  const [row] = await db
    .select({
      id: emails.id,
      threadId: emails.threadId,
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

  try {
    // Unsnooze all emails in the same thread
    if (row.threadId) {
      await db
        .update(emails)
        .set({ snoozedUntil: null })
        .where(
          and(
            eq(emails.threadId, row.threadId),
            eq(emails.mailAccountId, row.mailAccountId),
            isNotNull(emails.snoozedUntil),
          ),
        );
    } else {
      await db
        .update(emails)
        .set({ snoozedUntil: null })
        .where(eq(emails.id, emailId));
    }
  } catch {
    return { success: false, error: "Failed to unsnooze email" };
  }

  revalidatePath("/inbox");
  revalidatePath("/feed");
  revalidatePath("/saved");
  revalidatePath("/snoozed");

  return { success: true };
}
