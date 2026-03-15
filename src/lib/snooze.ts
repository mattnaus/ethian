/**
 * Shared snooze helpers used by snooze menus across the app.
 */

export type SnoozePresetKey = "laterToday" | "tomorrowMorning" | "nextWeek";

export interface SnoozePreset {
  labelKey: SnoozePresetKey;
  date: Date;
}

/**
 * Compute snooze presets relative to the current time.
 * Call this when the popover opens (not on mount) to avoid stale dates.
 */
export function getSnoozePresets(): SnoozePreset[] {
  const now = new Date();
  const laterToday = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);

  return [
    { labelKey: "laterToday", date: laterToday },
    { labelKey: "tomorrowMorning", date: tomorrow },
    { labelKey: "nextWeek", date: nextMonday },
  ];
}

/** Format a snooze date for display in toasts (e.g. "Mon, Mar 16, 9:00 AM"). */
export function formatSnoozeDate(date: Date): string {
  return new Intl.DateTimeFormat("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
