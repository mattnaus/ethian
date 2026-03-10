import { getTranslations } from "next-intl/server";

export default async function ScreenerPage() {
  const t = await getTranslations("pages.screener");
  return <main className="p-8 text-zinc-400">{t("comingSoon")}</main>;
}
