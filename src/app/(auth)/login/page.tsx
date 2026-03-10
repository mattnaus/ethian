import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./_components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("pageTitle") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth.login");

  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-1">{t("heading")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("subheading")}</p>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-4 hover:opacity-75"
        >
          {t("createOne")}
        </Link>
      </p>
    </>
  );
}
