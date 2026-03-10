import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("brandName")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("brandTagline")}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
