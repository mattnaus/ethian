import { getTranslations } from "next-intl/server";

export default async function SentPage() {
  const t = await getTranslations("pages.sent");
  return <main className="p-8 text-zinc-400">{t("comingSoon")}</main>;
}
