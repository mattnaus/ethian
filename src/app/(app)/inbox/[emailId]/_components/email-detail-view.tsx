"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Paperclip, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { safeColor, getInitials } from "@/lib/email-display";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmailDetail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  toAddresses: Array<{ address: string; name?: string }>;
  bodyHtml: string | null;
  bodyText: string | null;
  sentAt: string;
  isRead: boolean;
  mailAccountId: string;
  mailAccountEmail: string;
  accountColor: string;
  accountName: string;
};

export type ThreadMessage = {
  id: string;
  fromName: string | null;
  fromAddress: string;
  toAddresses: Array<{ address: string; name?: string }>;
  bodyHtml: string | null;
  bodyText: string | null;
  sentAt: string;
  isRead: boolean;
  accountColor: string;
  attachments: Array<{ id: string; filename: string; contentType: string; size: number }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatFullDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function getMessageBody(bodyText: string | null, bodyHtml: string | null): string {
  if (bodyText) return bodyText;
  if (bodyHtml) return bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
  return "";
}

// ---------------------------------------------------------------------------
// AttachmentChip
// ---------------------------------------------------------------------------

function AttachmentChip({
  attachment,
}: {
  attachment: { id: string; filename: string; contentType: string; size: number };
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border hover:bg-secondary transition-colors cursor-pointer max-w-[220px]">
      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  isSelf,
  locale,
}: {
  message: ThreadMessage;
  isSelf: boolean;
  locale: string;
}) {
  const body = getMessageBody(message.bodyText, message.bodyHtml);
  const time = formatTime(message.sentAt, locale);
  const fullDate = formatFullDate(message.sentAt, locale);

  return (
    <div className={cn("flex items-end gap-2.5", isSelf ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[90%] md:max-w-[72%]",
          isSelf ? "items-end" : "items-start",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
            isSelf
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-secondary text-foreground rounded-bl-sm",
          )}
        >
          {body || <span className="italic opacity-60">No message body.</span>}
        </div>

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="w-full overflow-x-auto scrollbar-none">
            <div className="flex gap-2 pb-1">
              {message.attachments.map((att) => (
                <AttachmentChip key={att.id} attachment={att} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-1" title={fullDate}>
          {time}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmailDetailView
// ---------------------------------------------------------------------------

export function EmailDetailView({
  email,
  threadMessages,
  locale,
}: {
  email: EmailDetail;
  threadMessages: ThreadMessage[];
  locale: string;
}) {
  const router = useRouter();
  const t = useTranslations("pages.emailDetail");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reply, setReply] = useState("");
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }, []);

  // Scroll to bottom on load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReply(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      // TODO: wire to SMTP send
    }
  }

  // Original sender (oldest message) for the top bar
  const topMsg = threadMessages[0];
  const topInitials = getInitials(
    topMsg?.fromName ?? email.fromName,
    topMsg?.fromAddress ?? email.fromAddress,
  );
  const topRingColor = safeColor(topMsg?.accountColor ?? email.accountColor);
  const ringColor = safeColor(email.accountColor);

  // "New" divider before the first unread message (only if it's not the very first)
  const firstUnreadIndex = threadMessages.findIndex((m) => !m.isRead);

  return (
    // pb-16 md:pb-0 reserves space for the mobile bottom tab bar
    <div className="flex flex-col h-full pb-16 md:pb-0">
      <div className="flex-1 flex flex-col mx-auto w-full max-w-5xl px-[10px] md:px-6 min-h-0">

        {/* Header */}
        <header className="flex items-center gap-3 py-4 border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("back")}
            className="flex items-center justify-center w-11 h-11 -ml-1 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div
            className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-medium text-white select-none"
            style={{ boxShadow: `0 0 0 2px ${topRingColor}` }}
          >
            {topInitials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {topMsg?.fromName?.trim() || topMsg?.fromAddress || email.fromName?.trim() || email.fromAddress}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {topMsg?.fromAddress || email.fromAddress}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{
                color: ringColor,
                borderColor: ringColor + "40",
                backgroundColor: ringColor + "1a",
              }}
            >
              {email.accountName}
            </span>
            <button
              type="button"
              aria-label={t("moreOptions")}
              className="flex items-center justify-center min-w-11 min-h-11 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Subject */}
        <div className="py-4 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground text-balance">{email.subject}</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-4 min-h-0">
          {threadMessages.map((message, index) => {
            const isSelf =
              message.fromAddress.toLowerCase() === email.mailAccountEmail.toLowerCase();
            const isFirstUnread = index === firstUnreadIndex && firstUnreadIndex > 0;
            return (
              <div key={message.id}>
                {isFirstUnread && (
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-primary/40" />
                    <span className="text-xs font-medium text-primary shrink-0">{t("newDivider")}</span>
                    <div className="flex-1 h-px bg-primary/40" />
                  </div>
                )}
                <MessageBubble message={message} isSelf={isSelf} locale={locale} />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Compose bar */}
        <div className="shrink-0 py-4 border-t border-border">
          <div className="flex items-end gap-2 bg-secondary/40 border border-border rounded-2xl px-4 py-3">
            <button
              type="button"
              aria-label={t("attachFile")}
              className="flex items-center justify-center min-w-11 min-h-11 -my-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={reply}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={t("replyPlaceholder")}
              aria-label={t("replyPlaceholder")}
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-relaxed min-h-[24px]"
            />
            <button
              type="button"
              disabled={!reply.trim()}
              aria-label={t("sendButton")}
              className="flex items-center justify-center min-w-11 min-h-11 -my-1.5 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 shrink-0 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {isMac ? t("cmdEnterToSend") : t("ctrlEnterToSend")}
          </p>
        </div>

      </div>
    </div>
  );
}
