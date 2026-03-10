import { GatekeeperRow, type GatekeeperEntry } from "./gatekeeper-row";

export type GatekeeperEntryWithLabel = GatekeeperEntry & { countLabel: string };

interface GatekeeperListProps {
  entries: GatekeeperEntryWithLabel[];
  emptyMessage: string;
  showingMessage: string | null;
  locale: string;
}

export function GatekeeperList({
  entries,
  emptyMessage,
  showingMessage,
  locale,
}: GatekeeperListProps) {
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
            countLabel={entry.countLabel}
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
