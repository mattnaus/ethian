"use client";

import { useState } from "react";
import { Paperclip, Check, X, MoreHorizontal, Newspaper, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { safeColor, getInitials, formatDate } from "@/lib/email-display";
import { useTranslations } from "next-intl";
import type { GatekeeperDecision } from "../_actions/decisions";

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
};

interface GatekeeperRowProps {
  entry: GatekeeperEntry;
  locale: string;
  onDecision: (id: string, decision: GatekeeperDecision) => void;
  isPending: boolean;
}

export function GatekeeperRow({ entry, locale, onDecision, isPending }: GatekeeperRowProps) {
  const t = useTranslations("pages.gatekeeper");
  const [moreOpen, setMoreOpen] = useState(false);

  const initials = getInitials(entry.fromName, entry.fromAddress);
  const dotColor = safeColor(entry.accountColor);
  const nameDisplay = entry.fromName?.trim() || entry.fromAddress;
  const formattedDate = formatDate(entry.lastSeenAt, locale);

  function handleDecision(decision: GatekeeperDecision) {
    setMoreOpen(false);
    onDecision(entry.id, decision);
  }

  return (
    <div
      className={cn(
        "bg-muted/70 rounded-xl border-2 border-transparent",
        "flex flex-col gap-3 p-4",
        "md:flex-row md:items-center md:gap-4",
        isPending && "opacity-40 pointer-events-none",
      )}
    >
      {/* Avatar + sender name (mobile top row) */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <div
          className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
          style={{ boxShadow: `0 0 0 2px ${dotColor}` }}
        >
          {initials}
        </div>
        {/* Mobile: sender name + date inline */}
        <span className="text-sm font-semibold text-foreground md:hidden truncate flex-1">
          {nameDisplay}
        </span>
        <span className="text-xs text-muted-foreground shrink-0 md:hidden">
          {formattedDate}
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

      {/* Desktop: attachment + date */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        {entry.hasAttachments && (
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-label="Has attachment" />
        )}
        <span className="text-xs text-muted-foreground w-16 text-right">{formattedDate}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile: attachment indicator */}
        {entry.hasAttachments && (
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0 md:hidden" aria-label="Has attachment" />
        )}

        {/* Approve */}
        <button
          onClick={() => handleDecision("approved")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors",
            "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35",
            "px-4 py-2 min-h-[44px] md:min-h-[36px]",
            "flex-1 md:flex-none",
          )}
        >
          <Check className="h-4 w-4 shrink-0" />
          <span>{t("approve")}</span>
        </button>

        {/* Block */}
        <button
          onClick={() => handleDecision("blocked")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors",
            "bg-red-600/20 text-red-400 hover:bg-red-600/35",
            "px-4 py-2 min-h-[44px] md:min-h-[36px]",
            "flex-1 md:flex-none",
          )}
        >
          <X className="h-4 w-4 shrink-0" />
          <span>{t("block")}</span>
        </button>

        {/* More (Feed / Paper Trail) */}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center rounded-full text-muted-foreground transition-colors",
                "hover:bg-secondary hover:text-foreground",
                "p-2 min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]",
              )}
              aria-label={t("more")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1.5" align="end">
            <button
              onClick={() => handleDecision("feed")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t("feed")}
            </button>
            <button
              onClick={() => handleDecision("paper_trail")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t("paperTrail")}
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
