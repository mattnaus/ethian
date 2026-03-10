import { getTranslations } from "next-intl/server";
import { GatekeeperRow, type GatekeeperEntry } from "./gatekeeper-row";

interface GatekeeperListProps {
  entries: GatekeeperEntry[];
  emptyMessage: string;
  showingMessage: string | null;
  locale: string;
}

export async function GatekeeperList({
  entries,
  emptyMessage,
  showingMessage,
  locale,
}: GatekeeperListProps) {
  const t = await getTranslations("pages.gatekeeper");

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div>
        {entries.map((entry) => (
          <GatekeeperRow
            key={entry.id}
            entry={entry}
            locale={locale}
            countLabel={t("messageCount", { count: entry.messageCount })}
          />
        ))}
      </div>
      {showingMessage && (
        <p className="text-xs text-zinc-600 text-center py-3 border-t border-zinc-800/50 shrink-0">
          {showingMessage}
        </p>
      )}
    </div>
  );
}
