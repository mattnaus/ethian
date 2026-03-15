"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Paperclip } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import {
  safeColor,
  getInitials,
  formatRelativeDate,
} from "@/lib/email-display";
import { useTranslations } from "next-intl";

export type GatekeeperEmail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  snippet: string;
  sentAt: string; // ISO 8601 (mapped from lastSeenAt)
  isRead: boolean;
  accountColor: string;
  mailAccountId: string;
  mailAccountName: string;
  hasAttachments: boolean;
  threadId: string | null;
  threadCount: number; // mapped from messageCount
};

export type PreviewData = {
  bodyHtml: string | null;
  bodyText: string | null;
};

export function GatekeeperCard({
  email,
  locale,
  expanded,
  preview,
  previewLoading,
  previewError,
  onToggleExpand,
}: {
  email: GatekeeperEmail;
  locale: string;
  expanded: boolean;
  preview: PreviewData | null;
  previewLoading: boolean;
  previewError: boolean;
  onToggleExpand: () => void;
}) {
  const t = useTranslations("pages.gatekeeper");
  const initials = getInitials(email.fromName, email.fromAddress);
  const ringColor = safeColor(email.accountColor);
  const senderDisplay = email.fromName?.trim() || email.fromAddress;
  // Deferred to client-only to avoid Intl.DateTimeFormat SSR/browser ICU mismatch
  const [formattedDate, setFormattedDate] = useState("");
  useEffect(() => {
    setFormattedDate(formatRelativeDate(email.sentAt, locale));
  }, [email.sentAt, locale]);

  const bodyContent = preview?.bodyHtml || preview?.bodyText || "";
  const isHtml = !!preview?.bodyHtml;

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={onToggleExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleExpand();
        }
      }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl p-4 transition-all cursor-pointer",
        "flex-1 min-w-0 bg-muted/70 border-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "md:flex-row md:flex-wrap md:items-center md:gap-4",
        expanded ? "border-border" : "border-transparent hover:border-border/50",
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
        <div className="flex items-baseline gap-2 min-w-0 text-sm">
          <span className={cn(
            "shrink min-w-0 truncate max-w-full md:max-w-[66%]",
            !email.isRead ? "font-medium text-foreground" : "text-foreground/80",
          )}>
            {email.subject}
          </span>
          {email.threadCount > 1 && (
            <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums bg-secondary px-1.5 py-0.5 rounded-full">
              {email.threadCount}
            </span>
          )}
          {email.snippet && (
            <span className="hidden md:inline flex-1 min-w-0 truncate text-muted-foreground">
              - {email.snippet}
            </span>
          )}
        </div>
        {/* Snippet — mobile separate line */}
        {email.snippet && !expanded && (
          <p className="text-sm text-muted-foreground truncate mt-0.5 md:hidden">
            {email.snippet}
          </p>
        )}
      </div>

      {/* Attachments + date + chevron */}
      <div className="flex items-center gap-3 md:shrink-0">
        {email.hasAttachments && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border">
            <Paperclip className="h-3 w-3 text-foreground/70" />
          </div>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto md:ml-0 md:w-16 md:text-right">
          {formattedDate}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div
          className="w-full border-t border-border pt-3 mt-1 md:basis-full"
          onClick={(e) => e.stopPropagation()}
        >
          {previewLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {t("previewLoading")}
            </p>
          )}
          {previewError && (
            <p className="text-sm text-muted-foreground">{t("previewError")}</p>
          )}
          {!previewLoading && !previewError && preview && (
            bodyContent ? (
              isHtml ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-foreground/90 [&_a]:text-primary max-h-80 overflow-y-auto scrollbar-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyContent) }}
                />
              ) : (
                <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto scrollbar-none">
                  {bodyContent}
                </pre>
              )
            ) : (
              <p className="text-sm text-muted-foreground italic">{t("previewNoBody")}</p>
            )
          )}
        </div>
      )}
    </div>
  );
}
