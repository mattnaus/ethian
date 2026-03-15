"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getInitials, formatRelativeDate } from "@/lib/email-display";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { SerializedSenderRule } from "../page";

interface GatekeptCardProps {
  rule: SerializedSenderRule;
  locale: string;
  onChangeDecision: (newDecision: string) => void;
  onDelete: () => void;
}

type DecisionKey = "approved" | "blocked" | "feed" | "paper_trail";

const DECISION_STYLES: Record<DecisionKey, string> = {
  approved: "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30",
  feed: "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30",
  paper_trail: "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30",
  blocked: "bg-red-600/20 text-red-400 hover:bg-red-600/30",
};

const DECISION_OPTIONS: DecisionKey[] = ["approved", "feed", "paper_trail", "blocked"];

export function GatekeptCard({
  rule,
  locale,
  onChangeDecision,
  onDelete,
}: GatekeptCardProps) {
  const t = useTranslations("pages.gatekept");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const senderIdentifier = rule.appliesTo === "domain"
    ? `@${rule.fromDomain}`
    : rule.fromAddress ?? "";
  const displayName = rule.displayName?.trim() || senderIdentifier;
  const initials = getInitials(rule.displayName, senderIdentifier);

  function decisionLabel(decision: DecisionKey): string {
    switch (decision) {
      case "approved": return t("decisionApproved");
      case "feed": return t("decisionFeed");
      case "paper_trail": return t("decisionPaperTrail");
      case "blocked": return t("decisionBlocked");
    }
  }

  // Deferred to client-only to avoid SSR/browser Intl mismatch
  const [formattedDate, setFormattedDate] = useState("");
  useEffect(() => {
    setFormattedDate(formatRelativeDate(rule.createdAt, locale));
  }, [rule.createdAt, locale]);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 transition-all",
        "bg-muted/70",
        "md:flex-row md:items-center md:gap-4",
      )}
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none bg-zinc-700">
          {initials}
        </div>
        {/* Sender — mobile only */}
        <div className="flex flex-col min-w-0 md:hidden">
          <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
          {rule.displayName && (
            <span className="text-xs text-muted-foreground truncate">{senderIdentifier}</span>
          )}
        </div>
      </div>

      {/* Sender — desktop */}
      <div className="hidden md:flex md:flex-col md:min-w-0 md:w-48 lg:w-56 shrink-0">
        <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
        {rule.displayName && (
          <span className="text-xs text-muted-foreground truncate">{senderIdentifier}</span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Decision badge + actions */}
      <div className="flex items-center gap-2 md:shrink-0">
        {/* Decision badge (clickable → Popover) */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] md:min-h-0",
                DECISION_STYLES[rule.decision as DecisionKey] ?? "bg-zinc-800 text-zinc-400",
              )}
              aria-label={t("changeDecision")}
            >
              {decisionLabel(rule.decision as DecisionKey)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end">
            <div className="flex flex-col">
              {DECISION_OPTIONS.filter((d) => d !== rule.decision).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setPopoverOpen(false);
                    onChangeDecision(d);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors min-h-[44px] md:min-h-0",
                    "hover:bg-zinc-800",
                    DECISION_STYLES[d].split(" ").find((c) => c.startsWith("text-")),
                  )}
                >
                  {decisionLabel(d)}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date */}
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto md:ml-0 md:w-16 md:text-right">
          {formattedDate}
        </span>

        {/* Delete button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-600/10 transition-colors"
              aria-label={t("deleteRule")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("deleteCancelButton")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {t("deleteConfirmButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
