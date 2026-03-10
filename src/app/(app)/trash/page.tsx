import { getTranslations } from "next-intl/server";

export default async function TrashPage() {
  const t = await getTranslations("pages.trash");
  return <main className="p-8 text-zinc-400">{t("comingSoon")}</main>;
}
