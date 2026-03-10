import { getTranslations } from "next-intl/server";

export default async function SnoozedPage() {
  const t = await getTranslations("pages.snoozed");
  return <main className="p-8 text-zinc-400">{t("comingSoon")}</main>;
}
