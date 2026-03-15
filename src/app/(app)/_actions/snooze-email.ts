"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
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

  // Verify ownership
  const [row] = await db
    .select({ id: emails.id })
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
    await db
      .update(emails)
      .set({ snoozedUntil: new Date(until) })
      .where(eq(emails.id, emailId));
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

  // Verify ownership
  const [row] = await db
    .select({ id: emails.id })
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
    await db
      .update(emails)
      .set({ snoozedUntil: null })
      .where(eq(emails.id, emailId));
  } catch {
    return { success: false, error: "Failed to unsnooze email" };
  }

  revalidatePath("/inbox");
  revalidatePath("/feed");
  revalidatePath("/saved");
  revalidatePath("/snoozed");

  return { success: true };
}
