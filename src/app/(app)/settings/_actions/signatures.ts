"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { signatures } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const signatureSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(10_000),
  isDefault: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignatureFormState = {
  error?: string;
  success?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

async function verifyOwnership(signatureId: string, userId: string) {
  const [sig] = await db
    .select()
    .from(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.userId, userId)))
    .limit(1);
  if (!sig) throw new Error("Signature not found");
  return sig;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createSignatureAction(payload: unknown): Promise<SignatureFormState> {
  const userId = await requireSession();

  const parsed = signatureSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid input." };

  const { name, content, isDefault } = parsed.data;

  await db.transaction(async (tx) => {
    if (isDefault) {
      await tx.update(signatures).set({ isDefault: false }).where(eq(signatures.userId, userId));
    }
    await tx.insert(signatures).values({ userId, name, content, isDefault });
  });

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateSignatureAction(
  signatureId: string,
  payload: unknown
): Promise<SignatureFormState> {
  const userId = await requireSession();
  await verifyOwnership(signatureId, userId);

  const parsed = signatureSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid input." };

  const { name, content, isDefault } = parsed.data;

  await db.transaction(async (tx) => {
    if (isDefault) {
      await tx.update(signatures).set({ isDefault: false }).where(eq(signatures.userId, userId));
    }
    await tx
      .update(signatures)
      .set({ name, content, isDefault })
      .where(and(eq(signatures.id, signatureId), eq(signatures.userId, userId)));
  });

  revalidatePath("/settings");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteSignatureAction(signatureId: string): Promise<void> {
  const userId = await requireSession();
  await verifyOwnership(signatureId, userId);

  await db
    .delete(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.userId, userId)));

  revalidatePath("/settings");
}
