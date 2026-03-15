"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  safeColor,
  getInitials,
  formatRelativeDate,
} from "@/lib/email-display";
import { useTranslations } from "next-intl";
import { unsnoozeEmailAction } from "@/app/(app)/_actions/snooze-email";

export type SnoozedEmail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  snippet: string;
  sentAt: string;
  snoozedUntil: string;
  category: string;
  accountColor: string;
  mailAccountId: string;
  mailAccountName: string;
  hasAttachments: boolean;
};

export function SnoozedCard({
  email,
  locale,
  noSubjectLabel,
  noSenderLabel,
  onUnsnoozed,
}: {
  email: SnoozedEmail;
  locale: string;
  noSubjectLabel: string;
  noSenderLabel: string;
  onUnsnoozed?: (id: string) => void;
}) {
  const t = useTranslations("pages.snoozed");
  const displayName = email.fromName?.trim() || email.fromAddress || noSenderLabel;
  const initials = getInitials(email.fromName, email.fromAddress);
  const ringColor = safeColor(email.accountColor);

  const [formattedDate, setFormattedDate] = useState("");
  const [wakeDate, setWakeDate] = useState("");
  useEffect(() => {
    setFormattedDate(formatRelativeDate(email.sentAt, locale));
    const wake = new Date(email.snoozedUntil);
    setWakeDate(
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(wake),
    );
  }, [email.sentAt, email.snoozedUntil, locale]);

  const [isPending, startTransition] = useTransition();

  function handleUnsnooze(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        const result = await unsnoozeEmailAction({ emailId: email.id });
        if (result.success) {
          onUnsnoozed?.(email.id);
        } else {
          toast.error(t("unsnoozeFailed"));
        }
      } catch {
        toast.error(t("unsnoozeFailed"));
      }
    });
  }

  // Link to the original section based on category
  const detailHref = email.category === "feed"
    ? `/feed/${email.id}`
    : email.category === "paper_trail"
      ? `/saved/${email.id}`
      : `/inbox/${email.id}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-stretch",
        isPending && "opacity-40 pointer-events-none",
      )}
    >
      <Link
        href={detailHref}
        tabIndex={0}
        className={cn(
          "group relative flex-1 flex flex-col gap-3 rounded-xl p-4 transition-all cursor-pointer",
          "bg-muted/70 border-2 border-transparent",
          "hover:border-primary/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "md:flex-row md:items-center md:gap-4",
        )}
      >
        {/* Avatar + sender name inline (mobile) */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
            style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
          >
            {initials}
          </div>
          <span className="text-sm md:hidden text-muted-foreground">
            {displayName}
          </span>
        </div>

        {/* Sender — desktop only */}
        <div className="hidden md:block w-36 lg:w-40 shrink-0">
          <span className="text-sm truncate block text-muted-foreground">
            {displayName}
          </span>
        </div>

        {/* Subject + snippet */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0 text-sm">
            <span className="shrink min-w-0 truncate max-w-full md:max-w-[66%] text-foreground/80">
              {email.subject || noSubjectLabel}
            </span>
            {email.snippet && (
              <span className="hidden md:inline flex-1 min-w-0 truncate text-muted-foreground">
                - {email.snippet}
              </span>
            )}
          </div>
          {email.snippet && (
            <p className="text-sm text-muted-foreground truncate mt-0.5 md:hidden">
              {email.snippet}
            </p>
          )}
        </div>

        {/* Wake time + attachments + date */}
        <div className="flex items-center gap-3 md:shrink-0">
          {wakeDate && (
            <span className="text-xs text-primary/80 whitespace-nowrap">
              {wakeDate}
            </span>
          )}
          {email.hasAttachments && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border">
              <Paperclip className="h-3 w-3 text-foreground/70" />
            </div>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto md:ml-0 md:w-16 md:text-right">
            {formattedDate}
          </span>
        </div>
      </Link>

      {/* Unsnooze button */}
      <button
        onClick={handleUnsnooze}
        className="rounded-xl px-4 min-h-[44px] md:min-h-0 flex items-center justify-center gap-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors text-sm font-medium"
      >
        <X className="h-4 w-4 shrink-0" />
        {t("unsnooze")}
      </button>
    </div>
  );
}
