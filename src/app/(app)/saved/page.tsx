import { getTranslations } from "next-intl/server";

export default async function SavedPage() {
  const t = await getTranslations("pages.saved");
  return <main className="p-8 text-zinc-400">{t("comingSoon")}</main>;
}
