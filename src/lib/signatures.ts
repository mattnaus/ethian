import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { signatures } from "@/db/schema";

/**
 * Fetch signature content by ID (scoped to userId) and append to body text.
 * Returns the original body unchanged if signatureId is null or the signature
 * doesn't exist / doesn't belong to the user.
 */
export async function appendSignatureToBody(
  bodyText: string,
  signatureId: string | null | undefined,
  userId: string,
): Promise<string> {
  if (!signatureId) return bodyText;

  const [sig] = await db
    .select({ content: signatures.content })
    .from(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.userId, userId)))
    .limit(1);

  if (!sig) return bodyText;
  return `${bodyText}\n\n--\n${sig.content}`;
}

/**
 * Validate that a signatureId belongs to the given user.
 * Returns the signatureId if valid, or null if it doesn't belong to them.
 * Null/undefined input passes through as null.
 */
export async function validateSignatureOwnership(
  signatureId: string | null | undefined,
  userId: string,
): Promise<string | null> {
  if (!signatureId) return null;

  const [sig] = await db
    .select({ id: signatures.id })
    .from(signatures)
    .where(and(eq(signatures.id, signatureId), eq(signatures.userId, userId)))
    .limit(1);

  return sig ? signatureId : null;
}
