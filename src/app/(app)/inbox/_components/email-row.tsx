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

export function EmailRow({ email, locale }: { email: InboxEmail; locale: string }) {
  const initials = getInitials(email.fromName, email.fromAddress);
  const bgColor = avatarBgColor(email.fromAddress);
  const senderDisplay = email.fromName ?? email.fromAddress;
  const formattedDate = formatDate(email.sentAt, locale);
  const dotColor = safeColor(email.accountColor);

  return (
    <div
      tabIndex={0}
      className={cn(
        "bg-zinc-900 rounded-lg border border-zinc-800/50",
        "flex items-center gap-3 px-4 py-3",
        "hover:bg-zinc-800/60 transition-colors cursor-default",
        "focus:outline-none focus:ring-2 focus:ring-orange-500/50",
      )}
    >
      {/* Account color dot */}
      <div
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />

      {/* Avatar */}
      <div
        className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>

      {/* Mobile: two-line content block */}
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
          <p
            className={cn(
              "text-xs truncate",
              email.isRead ? "text-zinc-500" : "text-zinc-300",
            )}
          >
            {email.subject}
          </p>
          {email.hasAttachments && (
            <Paperclip className="h-3 w-3 text-zinc-500 shrink-0" aria-label="Has attachment" />
          )}
        </div>
      </div>

      {/* Desktop: sender (fixed width) */}
      <span
        className={cn(
          "hidden md:block w-36 lg:w-40 shrink-0 text-sm truncate",
          email.isRead ? "font-normal text-zinc-400" : "font-semibold text-zinc-50",
        )}
      >
        {senderDisplay}
      </span>

      {/* Desktop: subject + snippet stacked */}
      <div className="hidden md:flex flex-1 min-w-0 flex-col gap-0.5">
        <p
          className={cn(
            "text-sm font-semibold truncate",
            email.isRead ? "text-zinc-400" : "text-zinc-100",
          )}
        >
          {email.subject}
        </p>
        {email.snippet && (
          <p className="text-xs text-zinc-500 truncate">{email.snippet}</p>
        )}
      </div>

      {/* Attachment indicator (desktop) */}
      {email.hasAttachments && (
        <Paperclip
          className="hidden md:block h-3.5 w-3.5 text-zinc-500 shrink-0"
          aria-label="Has attachment"
        />
      )}

      {/* Date (desktop) */}
      <span className="hidden md:block text-xs text-zinc-500 shrink-0 w-16 text-right">
        {formattedDate}
      </span>
    </div>
  );
}
