"use client";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { safeColor, getInitials, formatDate } from "@/lib/email-display";

export type GatekeeperEntry = {
  id: string;
  fromAddress: string;
  fromName: string | null;
  fromDomain: string;
  subject: string;
  snippet: string;
  lastSeenAt: string; // ISO 8601
  messageCount: number;
  accountColor: string;
  hasAttachments: boolean;
  mailAccountId: string;
};

interface GatekeeperRowProps {
  entry: GatekeeperEntry;
  locale: string;
  onDecision: (id: string, decision: "approved" | "blocked") => void;
  isPending: boolean;
}

export function GatekeeperRow({ entry, locale, onDecision, isPending }: GatekeeperRowProps) {
  const t = useTranslations("pages.gatekeeper");
  const ringColor = safeColor(entry.accountColor);
  const initials = getInitials(entry.fromName, entry.fromAddress);
  const nameDisplay = entry.fromName?.trim() || entry.fromAddress;
  const formattedDate = formatDate(entry.lastSeenAt, locale);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-stretch",
        isPending && "opacity-40 pointer-events-none",
      )}
    >
      {/* Email info card */}
      <div
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl p-4 transition-all",
          "flex-1 bg-muted/70 border-2 border-transparent",
          "md:flex-row md:items-center md:gap-4",
        )}
      >
        {/* Avatar + sender (mobile top row) */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
            style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
          >
            {initials}
          </div>
          <span className="text-sm font-semibold text-foreground md:hidden truncate flex-1">
            {nameDisplay}
          </span>
        </div>

        {/* Desktop: sender (fixed width) */}
        <div className="hidden md:block w-36 lg:w-44 shrink-0">
          <span className="text-sm font-semibold text-foreground truncate block">{nameDisplay}</span>
        </div>

        {/* Subject + snippet */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0 text-sm">
            <span className="font-medium text-foreground shrink min-w-0 truncate">
              {entry.subject}
            </span>
            {entry.messageCount > 1 && (
              <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums bg-secondary px-1.5 py-0.5 rounded-full">
                {entry.messageCount}
              </span>
            )}
            {entry.snippet && (
              <span className="hidden md:inline flex-1 min-w-0 truncate text-muted-foreground">
                — {entry.snippet}
              </span>
            )}
          </div>
          {entry.snippet && (
            <p className="text-sm text-muted-foreground truncate mt-0.5 md:hidden">
              {entry.snippet}
            </p>
          )}
        </div>

        {/* Attachment + date */}
        <div className="flex items-center gap-3 md:shrink-0">
          {entry.hasAttachments && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border">
              <Paperclip className="h-3 w-3 text-foreground/70" />
            </div>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto md:ml-0 md:w-16 md:text-right">
            {formattedDate}
          </span>
        </div>
      </div>

      {/*
        Buttons wrapper.
        Mobile: flex-row — two side-by-side buttons below the card, each flex-1.
        Desktop: `contents` — the wrapper disappears from layout; the two buttons
        become direct flex children of the outer `items-stretch` row, so they
        automatically stretch to match the card height.
      */}
      <div className="flex gap-2 md:contents">
        <button
          onClick={() => onDecision(entry.id, "approved")}
          className={cn(
            "flex-1 md:flex-none rounded-xl px-5",
            "flex items-center justify-center gap-1.5",
            "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35 transition-colors",
            "text-sm font-medium min-h-[44px] md:min-h-0",
          )}
        >
          <span>{t("approve")}</span>
        </button>
        <button
          onClick={() => onDecision(entry.id, "blocked")}
          className={cn(
            "flex-1 md:flex-none rounded-xl px-5",
            "flex items-center justify-center gap-1.5",
            "bg-red-600/20 text-red-400 hover:bg-red-600/35 transition-colors",
            "text-sm font-medium min-h-[44px] md:min-h-0",
          )}
        >
          <span>{t("block")}</span>
        </button>
      </div>
    </div>
  );
}
