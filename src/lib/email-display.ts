/**
 * Shared display helpers for email sender rows (inbox, gatekeeper).
 */

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function safeColor(color: string, fallback = "#3b82f6"): string {
  return HEX_COLOR_RE.test(color) ? color : fallback;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  }
  return (parts[0][0] ?? "?").toUpperCase();
}

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

export function formatDate(isoString: string, locale: string): string {
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
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}

/** Relative date — "5m ago", "3h ago", "2d ago", then falls back to "Mar 5" style. */
export function formatRelativeDate(isoString: string, locale: string): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(isoString, locale);
}
