import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeColor, avatarBgColor, getInitials, formatDate } from "@/lib/email-display";

export type GatekeeperEntry = {
  id: string;
  fromAddress: string;
  fromName: string | null;
  fromDomain: string;
  subject: string;
  snippet: string;
  lastSeenAt: string; // ISO 8601
  accountColor: string;
  hasAttachments: boolean;
};

export function GatekeeperRow({
  entry,
  locale,
}: {
  entry: GatekeeperEntry;
  locale: string;
}) {
  const initials = getInitials(entry.fromName, entry.fromAddress);
  const bgColor = avatarBgColor(entry.fromAddress);
  const dotColor = safeColor(entry.accountColor);
  const nameDisplay = entry.fromName?.trim() || entry.fromAddress;
  const formattedDate = formatDate(entry.lastSeenAt, locale);

  return (
    <div
      className={cn(
        "bg-zinc-900 rounded-lg border border-zinc-800/50",
        "flex items-center gap-3 px-4 py-3",
        "hover:bg-zinc-800/60 transition-colors cursor-default",
      )}
    >
      {/* Account color dot */}
      <div
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />

      {/* Avatar */}
      <div
        className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>

      {/* Mobile: two-line content block */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-zinc-50 truncate">
            {nameDisplay}
          </span>
          <span className="text-xs text-zinc-500 shrink-0">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-zinc-300 truncate">{entry.subject}</p>
          {entry.hasAttachments && (
            <Paperclip className="h-3 w-3 text-zinc-500 shrink-0" aria-label="Has attachment" />
          )}
        </div>
      </div>

      {/* Desktop: sender (fixed width) */}
      <span className="hidden md:block w-36 lg:w-40 shrink-0 text-sm font-semibold text-zinc-50 truncate">
        {nameDisplay}
      </span>

      {/* Desktop: subject + snippet stacked */}
      <div className="hidden md:flex flex-1 min-w-0 flex-col gap-0.5">
        <p className="text-sm font-semibold text-zinc-100 truncate">{entry.subject}</p>
        {entry.snippet && (
          <p className="text-xs text-zinc-500 truncate">{entry.snippet}</p>
        )}
      </div>

      {/* Attachment indicator (desktop) */}
      {entry.hasAttachments && (
        <Paperclip
          className="hidden md:block h-3.5 w-3.5 text-zinc-500 shrink-0"
          aria-label="Has attachment"
        />
      )}

      {/* Date (desktop) */}
      <span className="hidden md:block text-xs text-zinc-500 shrink-0 w-16 text-right">
        {formattedDate}
      </span>
    </div>
  );
}
