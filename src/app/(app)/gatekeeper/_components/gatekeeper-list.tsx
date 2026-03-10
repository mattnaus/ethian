import { GatekeeperRow, type GatekeeperEntry } from "./gatekeeper-row";

interface GatekeeperListProps {
  entries: GatekeeperEntry[];
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
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 md:px-10 py-4">
        <div className="flex flex-col gap-0.5">
          {entries.map((entry) => (
            <GatekeeperRow key={entry.id} entry={entry} locale={locale} />
          ))}
        </div>
        {showingMessage && (
          <p className="text-xs text-zinc-600 text-center pt-3 mt-0.5">
            {showingMessage}
          </p>
        )}
      </div>
    </div>
  );
}
