"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";
import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type AuthActionResult = { error: string } | undefined;

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const t = await getTranslations("auth.errors");
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: t("emailPasswordRequired") };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/inbox" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: t("invalidCredentials") };
    }
    // NextAuth throws a redirect — re-throw so Next.js can handle it
    throw error;
  }
}

export async function registerAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const t = await getTranslations("auth.errors");
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const name = (formData.get("name") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: t("emailPasswordRequired") };
  }

  if (password.length < 8) {
    return { error: t("passwordTooShort") };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { error: t("emailAlreadyExists") };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    name: name || null,
    passwordHash,
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/inbox" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: t("accountCreatedSignInFailed") };
    }
    throw error;
  }
}
