"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  safeColor,
  getInitials,
  formatRelativeDate,
} from "@/lib/email-display";

export type DraftEmail = {
  id: string;
  subject: string;
  toAddresses: Array<{ address: string; name?: string }>;
  snippet: string;
  updatedAt: string; // ISO 8601
  accountColor: string;
  mailAccountId: string;
  mailAccountName: string;
  hasAttachments: boolean;
};

export function DraftCard({
  draft,
  locale,
  noSubjectLabel,
  noRecipientLabel,
}: {
  draft: DraftEmail;
  locale: string;
  noSubjectLabel: string;
  noRecipientLabel: string;
}) {
  const recipients = draft.toAddresses
    .map((r) => r.name?.trim() || r.address)
    .join(", ");
  const displayName = recipients || noRecipientLabel;
  const initials = getInitials(recipients ? draft.toAddresses[0]?.name ?? null : null, draft.toAddresses[0]?.address ?? "D");
  const ringColor = safeColor(draft.accountColor);

  const [formattedDate, setFormattedDate] = useState("");
  useEffect(() => {
    setFormattedDate(formatRelativeDate(draft.updatedAt, locale));
  }, [draft.updatedAt, locale]);

  return (
    <Link
      href={`/compose?draft=${draft.id}`}
      tabIndex={0}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 transition-all cursor-pointer",
        "bg-muted/70 border-2 border-transparent",
        "hover:border-primary/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "md:flex-row md:items-center md:gap-4",
      )}
    >
      {/* Avatar + recipient name inline (mobile) */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
          style={{
            boxShadow: `0 0 0 2px ${ringColor}`,
          }}
        >
          {initials}
        </div>
        {/* Recipient — shown inline with avatar on mobile only */}
        <span className="text-sm md:hidden text-muted-foreground">
          {displayName}
        </span>
      </div>

      {/* Recipient — desktop only, fixed width */}
      <div className="hidden md:block w-36 lg:w-40 shrink-0">
        <span className="text-sm truncate block text-muted-foreground">
          {displayName}
        </span>
      </div>

      {/* Subject + snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0 text-sm">
          <span className="shrink min-w-0 truncate max-w-full md:max-w-[66%] text-foreground/80">
            {draft.subject || noSubjectLabel}
          </span>
          {draft.snippet && (
            <span className="hidden md:inline flex-1 min-w-0 truncate text-muted-foreground">
              - {draft.snippet}
            </span>
          )}
        </div>
        {/* Snippet — mobile separate line */}
        {draft.snippet && (
          <p className="text-sm text-muted-foreground truncate mt-0.5 md:hidden">
            {draft.snippet}
          </p>
        )}
      </div>

      {/* Attachments + date */}
      <div className="flex items-center gap-3 md:shrink-0">
        {draft.hasAttachments && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border">
            <Paperclip className="h-3 w-3 text-foreground/70" />
          </div>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto md:ml-0 md:w-16 md:text-right">
          {formattedDate}
        </span>
      </div>
    </Link>
  );
}
