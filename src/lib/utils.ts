import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names intelligently.
 *
 * Combines clsx (for conditional classes) with tailwind-merge (to resolve
 * conflicting Tailwind utilities, e.g. `p-2` and `p-4` → keeps `p-4`).
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normalize an RFC 2822 Message-ID to bare format by stripping angle brackets.
 *
 * imapflow's IMAP ENVELOPE and nodemailer both return message IDs with angle
 * brackets ("<abc@domain>"), but mailparser's parsed.references strips them.
 * Storing bare IDs everywhere keeps threadId matching consistent.
 *
 * Re-add brackets at the SMTP wire level: `<${normalizeMessageId(id)}>`
 */
export function normalizeMessageId(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return id.replace(/^<+|>+$/g, "").trim() || undefined;
}
