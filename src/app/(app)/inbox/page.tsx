import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.inbox");
  return { title: t("title") };
}

export default async function InboxPage() {
  const t = await getTranslations("pages.inbox");

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 items-center border-b border-zinc-800 px-6 shrink-0">
        <h1 className="text-base font-semibold text-zinc-100">{t("title")}</h1>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">{t("empty")}</p>
      </div>
    </div>
  );
}
