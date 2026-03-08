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
