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

const AVATAR_COLORS = [
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#dc2626", // red-600
  "#0891b2", // cyan-600
  "#db2777", // pink-600
  "#65a30d", // lime-600
];

export function avatarBgColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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
