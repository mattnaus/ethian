import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "./_components/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("pageTitle") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth.register");

  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-1">{t("heading")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("subheading")}</p>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4 hover:opacity-75"
        >
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
