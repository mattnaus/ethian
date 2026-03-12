"use client";

import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  safeColor,
  getInitials,
  formatRelativeDate,
} from "@/lib/email-display";

export type InboxEmail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  snippet: string;
  sentAt: string; // ISO 8601
  isRead: boolean;
  accountColor: string;
  mailAccountId: string;
  mailAccountName: string;
  hasAttachments: boolean;
};

export function EmailCard({
  email,
  locale,
}: {
  email: InboxEmail;
  locale: string;
}) {
  const initials = getInitials(email.fromName, email.fromAddress);
  const ringColor = safeColor(email.accountColor);
  const senderDisplay = email.fromName?.trim() || email.fromAddress;
  const formattedDate = formatRelativeDate(email.sentAt, locale);

  return (
    <div
      tabIndex={0}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 transition-all cursor-pointer",
        "bg-muted/70 border-2",
        "hover:border-primary/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "md:flex-row md:items-center md:gap-4",
        !email.isRead
          ? "border-l-primary border-r-transparent border-t-transparent border-b-transparent"
          : "border-transparent",
      )}
    >
      {/* Avatar + sender name inline (mobile) */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
          style={{
            boxShadow: `0 0 0 2px ${ringColor}`,
          }}
        >
          {initials}
        </div>
        {/* Sender — shown inline with avatar on mobile only */}
        <span
          className={cn(
            "text-sm md:hidden",
            !email.isRead ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {senderDisplay}
        </span>
      </div>

      {/* Sender — desktop only, fixed width */}
      <div className="hidden md:block w-36 lg:w-40 shrink-0">
        <span
          className={cn(
            "text-sm truncate block",
            !email.isRead ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {senderDisplay}
        </span>
      </div>

      {/* Subject + snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={cn(
              "text-sm truncate shrink-0 max-w-[60%] md:max-w-none",
              !email.isRead ? "font-medium text-foreground" : "text-foreground/80",
            )}
          >
            {email.subject}
          </span>
          {email.snippet && (
            <span className="hidden md:inline text-sm text-muted-foreground truncate">
              - {email.snippet}
            </span>
          )}
        </div>
        {/* Snippet — mobile separate line */}
        {email.snippet && (
          <p className="text-sm text-muted-foreground truncate mt-0.5 md:hidden">
            {email.snippet}
          </p>
        )}
      </div>

      {/* Attachments + date */}
      <div className="flex items-center gap-3 md:shrink-0">
        {email.hasAttachments && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border">
            <Paperclip className="h-3 w-3 text-foreground/70" />
          </div>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto md:ml-0 md:w-16 md:text-right">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}
