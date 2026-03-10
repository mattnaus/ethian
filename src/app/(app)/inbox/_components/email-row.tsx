import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeColor, avatarBgColor, getInitials, formatDate } from "@/lib/email-display";

export type InboxEmail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  snippet: string;
  sentAt: string; // ISO 8601 — serialization-safe for future Client Component promotion
  isRead: boolean;
  accountColor: string;
  hasAttachments: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailRow({ email, locale }: { email: InboxEmail; locale: string }) {
  const initials = getInitials(email.fromName, email.fromAddress);
  const bgColor = avatarBgColor(email.fromAddress);
  const senderDisplay = email.fromName ?? email.fromAddress;
  const formattedDate = formatDate(email.sentAt, locale);
  const dotColor = safeColor(email.accountColor);

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-zinc-800/50 px-4",
        "hover:bg-zinc-900/60 transition-colors cursor-default",
        // Mobile: padding-based height with two-line content
        "py-3 md:py-0 md:h-14",
      )}
    >
      {/* Account color dot — validated hex only */}
      <div
        className="h-1.5 w-1.5 rounded-full shrink-0 self-start mt-[7px] md:self-auto md:mt-0"
        style={{ backgroundColor: dotColor }}
      />

      {/* Avatar — color from controlled array, not user input */}
      <div
        className="h-8 w-8 rounded-full shrink-0 self-start md:self-auto flex items-center justify-center text-xs font-semibold text-white select-none"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>

      {/* Mobile: two-line layout */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              email.isRead ? "font-normal text-zinc-400" : "font-semibold text-zinc-50",
            )}
          >
            {senderDisplay}
          </span>
          <span className="text-xs text-zinc-500 shrink-0">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs truncate",
              email.isRead ? "text-zinc-500" : "text-zinc-300",
            )}
          >
            {email.subject}
          </span>
          {email.hasAttachments && (
            <Paperclip
              className="h-3 w-3 text-zinc-500 shrink-0"
              aria-label="Has attachment"
            />
          )}
        </div>
      </div>

      {/* Desktop: single-line layout */}
      <div className="hidden md:flex flex-1 min-w-0 items-center gap-3">
        {/* Sender */}
        <span
          className={cn(
            "w-36 lg:w-40 shrink-0 text-sm truncate",
            email.isRead ? "font-normal text-zinc-400" : "font-semibold text-zinc-50",
          )}
        >
          {senderDisplay}
        </span>

        {/* Subject + snippet */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          <span
            className={cn(
              "text-sm shrink-0 max-w-[40%] truncate",
              email.isRead ? "text-zinc-400" : "font-medium text-zinc-100",
            )}
          >
            {email.subject}
          </span>
          {email.snippet && (
            <>
              <span className="text-zinc-700 text-sm shrink-0">—</span>
              <span className="text-sm text-zinc-500 truncate min-w-0">
                {email.snippet}
              </span>
            </>
          )}
        </div>

        {/* Attachment indicator */}
        {email.hasAttachments && (
          <Paperclip
            className="h-3.5 w-3.5 text-zinc-500 shrink-0"
            aria-label="Has attachment"
          />
        )}

        {/* Date */}
        <span className="text-xs text-zinc-500 shrink-0 w-16 text-right">
          {formattedDate}
        </span>
      </div>
    </div>
  );
}
