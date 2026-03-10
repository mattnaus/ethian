import { cn } from "@/lib/utils";

export type GatekeeperEntry = {
  id: string;
  fromAddress: string;
  fromName: string | null;
  fromDomain: string;
  subject: string;
  messageCount: number;
  lastSeenAt: string; // ISO 8601
  accountColor: string;
};

// ---------------------------------------------------------------------------
// Helpers (same logic as inbox — kept co-located to avoid premature abstraction)
// ---------------------------------------------------------------------------

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function safeColor(color: string, fallback = "#3b82f6"): string {
  return HEX_COLOR_RE.test(color) ? color : fallback;
}

const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#d97706",
  "#dc2626", "#0891b2", "#db2777", "#65a30d",
];

function avatarBgColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  }
  return (parts[0][0] ?? "?").toUpperCase();
}

function formatDate(isoString: string, locale: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isToday) {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  if (isThisYear) {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "2-digit" }).format(date);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GatekeeperRow({
  entry,
  locale,
  countLabel,
}: {
  entry: GatekeeperEntry;
  locale: string;
  countLabel: string; // pre-formatted e.g. "3 emails"
}) {
  const initials = getInitials(entry.fromName, entry.fromAddress);
  const bgColor = avatarBgColor(entry.fromAddress);
  const dotColor = safeColor(entry.accountColor);
  const nameDisplay = entry.fromName?.trim() || entry.fromAddress;
  // Show email separately only when we have a display name (otherwise it's already the name)
  const emailDisplay = entry.fromName?.trim() ? entry.fromAddress : entry.fromDomain;
  const formattedDate = formatDate(entry.lastSeenAt, locale);

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-zinc-800/50 px-4",
        "hover:bg-zinc-900/60 transition-colors cursor-default",
        "py-3 md:py-0 md:h-14",
      )}
    >
      {/* Account color dot */}
      <div
        className="h-1.5 w-1.5 rounded-full shrink-0 self-start mt-[7px] md:self-auto md:mt-0"
        style={{ backgroundColor: dotColor }}
      />

      {/* Avatar */}
      <div
        className="h-8 w-8 rounded-full shrink-0 self-start md:self-auto flex items-center justify-center text-xs font-semibold text-white select-none"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>

      {/* Mobile: two-line layout */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-zinc-50 truncate">
            {nameDisplay}
          </span>
          <span className="text-xs text-zinc-500 shrink-0">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 truncate">{entry.fromDomain}</span>
          <span className="text-xs text-zinc-600 shrink-0">·</span>
          <span className="text-xs text-zinc-500 shrink-0">{countLabel}</span>
        </div>
      </div>

      {/* Desktop: single-line layout */}
      <div className="hidden md:flex flex-1 min-w-0 items-center gap-3">
        {/* Sender name */}
        <span className="w-40 shrink-0 text-sm font-semibold text-zinc-50 truncate">
          {nameDisplay}
        </span>

        {/* Email / domain */}
        <span className="w-44 shrink-0 text-sm text-zinc-500 truncate">
          {emailDisplay}
        </span>

        {/* Most recent subject */}
        <span className="flex-1 min-w-0 text-sm text-zinc-500 truncate">
          {entry.subject}
        </span>

        {/* Message count */}
        <span className="text-xs text-zinc-500 shrink-0 whitespace-nowrap">
          {countLabel}
        </span>

        {/* Date */}
        <span className="text-xs text-zinc-500 shrink-0 w-16 text-right">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}
