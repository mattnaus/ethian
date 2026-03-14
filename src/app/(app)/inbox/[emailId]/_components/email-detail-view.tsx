"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { sendReplyAction } from "../_actions/reply";
import { deleteDraftAction, sendDraftAction } from "../_actions/draft";
import { useRouter } from "next/navigation";
import { ArrowLeft, Paperclip, MoreHorizontal, Trash2, Pencil, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { safeColor, getInitials, formatTime, formatFullDate } from "@/lib/email-display";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReplyBox } from "./reply-box";

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
  isDraft?: boolean;
};

type Signature = {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}


function stripHtmlQuotes(html: string): string {
  // Use DOMParser when available (browser) — correctly handles nested blockquotes
  // and removes Gmail (.gmail_quote) and Yahoo (.yahoo_quoted) quote wrappers.
  if (typeof window !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("blockquote, .gmail_quote, .yahoo_quoted").forEach((el) => el.remove());
    return (doc.body.textContent ?? "").replace(/\s{2,}/g, " ").trim();
  }
  // SSR fallback: best-effort regex (no nesting support, but sufficient for server render)
  return html
    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Patterns hoisted to avoid recompilation on each line.
// Attribution must contain a 4-digit year to avoid false positives.
const ATTRIBUTION_RE = /^On\s.+\d{4}.+wrote:$/;
const ATTRIBUTION_START_RE = /^On\s.+\d{4}/;

// Strip quoted reply text from plain-text bodies.
// Handles the three most common patterns:
//   1. Lines starting with "> " (RFC 3676 quote marker)
//   2. "On <date> ... wrote:" attribution lines (Gmail/Outlook/Apple Mail)
//   3. "-- " signature separator (RFC 3676)
function stripPlainTextQuotes(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Stop at RFC 3676 quoted blocks ("> " with trailing space, or lone ">")
    if (line === ">" || line.startsWith("> ")) break;
    // Stop at "On <date> ... wrote:" attribution (single-line or split across two lines)
    if (ATTRIBUTION_RE.test(line)) break;
    if (i + 1 < lines.length && ATTRIBUTION_START_RE.test(line) && /wrote:$/.test(lines[i + 1])) break;
    // Stop at standard signature separator
    if (line === "-- ") break;
    result.push(line);
  }
  return result.join("\n").trim();
}

function getMessageBody(bodyText: string | null, bodyHtml: string | null): string {
  if (bodyText) {
    const visible = stripPlainTextQuotes(bodyText);
    return visible || bodyText.trim();
  }
  if (bodyHtml) return stripHtmlQuotes(bodyHtml);
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
  // Deferred to client-only to avoid Intl.DateTimeFormat SSR/browser ICU mismatch
  const [time, setTime] = useState("");
  const [fullDate, setFullDate] = useState("");
  useEffect(() => {
    setTime(formatTime(message.sentAt, locale));
    setFullDate(formatFullDate(message.sentAt, locale));
  }, [message.sentAt, locale]);

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
// DraftBubble
// ---------------------------------------------------------------------------

function DraftBubble({
  message,
  onEdit,
  onDiscard,
  onSend,
}: {
  message: ThreadMessage;
  onEdit: () => void;
  onDiscard: () => Promise<void>;
  onSend: () => Promise<void>;
}) {
  const t = useTranslations("pages.emailDetail");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const body = message.bodyText ?? "";

  return (
    <div className="flex flex-row-reverse items-end gap-2.5">
      <div className="flex flex-col gap-1 max-w-[90%] md:max-w-[72%] items-end">
        <div className="border border-dashed border-zinc-700 rounded-2xl px-4 py-3 bg-zinc-900/50">
          <span className="text-xs border border-zinc-700 text-zinc-500 rounded-full px-2 py-0.5 inline-block mb-2">
            {t("draftLabel")}
          </span>
          <p className="text-sm whitespace-pre-wrap text-foreground">{body}</p>
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-dashed border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setIsDiscarding(true);
                void onDiscard().finally(() => setIsDiscarding(false));
              }}
              disabled={isDiscarding}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("discardDraft")}
            </button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-7 px-2.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {t("editDraft")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsSending(true);
                void onSend().finally(() => setIsSending(false));
              }}
              disabled={isSending}
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {t("sendDraft")}
            </Button>
          </div>
        </div>
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
  signatures,
}: {
  email: EmailDetail;
  threadMessages: ThreadMessage[];
  locale: string;
  signatures: Signature[];
}) {
  const router = useRouter();
  const t = useTranslations("pages.emailDetail");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ThreadMessage[]>(threadMessages);
  const [editingDraft, setEditingDraft] = useState<{ id: string; bodyText: string } | null>(null);
  const isFirstRender = useRef(true);

  // Re-sync optimistic state when the server re-renders with fresh data
  useEffect(() => {
    setOptimisticMessages(threadMessages);
  }, [threadMessages]);

  // Scroll to bottom on load; smooth-scroll when new messages are appended
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isFirstRender.current ? "instant" : "smooth",
    });
    isFirstRender.current = false;
  }, [optimisticMessages.length]);

  async function handleSend(text: string) {
    const optimistic: ThreadMessage = {
      id: crypto.randomUUID(),
      fromName: email.accountName,
      fromAddress: email.mailAccountEmail,
      toAddresses: [{ address: email.fromAddress, name: email.fromName ?? undefined }],
      bodyHtml: null,
      bodyText: text,
      sentAt: new Date().toISOString(),
      isRead: true,
      accountColor: email.accountColor,
      attachments: [],
    };
    setOptimisticMessages((prev) => [...prev, optimistic]);
    setFeedback(null);

    const result = await sendReplyAction({
      mailAccountId: email.mailAccountId,
      emailId: email.id,
      bodyText: text,
    });

    if (result.success === false) {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setFeedback({ text: t("sendFailed"), isError: true });
      throw new Error("smtp_error");
    } else if (result.success === "partial") {
      setFeedback({ text: t("sendPartialWarning"), isError: false });
    }
  }

  const handleDraftSaved = useCallback((_draftId: string) => {
    // revalidatePath in the action will trigger a server re-render
    // which syncs optimisticMessages via the useEffect above
  }, []);

  const handleEditingDraftClear = useCallback(() => {
    setEditingDraft(null);
  }, []);

  async function handleDiscardDraft(message: ThreadMessage) {
    const result = await deleteDraftAction({ draftId: message.id, emailId: email.id });
    if (result.success) {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== message.id));
    } else {
      toast.error("Failed to discard draft.");
    }
  }

  async function handleSendDraft(message: ThreadMessage) {
    const result = await sendDraftAction({
      draftId: message.id,
      mailAccountId: email.mailAccountId,
      emailId: email.id,
    });

    if (result.success === true) {
      // Remove draft + append sent message optimistically
      setOptimisticMessages((prev) => {
        const withoutDraft = prev.filter((m) => m.id !== message.id);
        const sent: ThreadMessage = {
          id: result.sentEmailId,
          fromName: email.accountName,
          fromAddress: email.mailAccountEmail,
          toAddresses: [{ address: email.fromAddress, name: email.fromName ?? undefined }],
          bodyHtml: null,
          bodyText: message.bodyText,
          sentAt: result.sentAt,
          isRead: true,
          accountColor: email.accountColor,
          attachments: [],
        };
        return [...withoutDraft, sent];
      });
    } else if (result.success === "partial") {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== message.id));
      setFeedback({ text: t("sendPartialWarning"), isError: false });
    } else {
      toast.error(t("sendFailed"));
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
  const firstUnreadIndex = optimisticMessages.findIndex((m) => !m.isRead && !m.isDraft);

  return (
    <div className="flex flex-col h-full">
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
              className="hidden sm:inline-block text-xs font-medium px-2.5 py-1 rounded-full border"
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
              className="hidden md:flex items-center justify-center min-w-11 min-h-11 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <MobileMenuButton />
          </div>
        </header>

        {/* Subject */}
        <div className="py-4 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground text-balance">{email.subject}</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-4 min-h-0">
          {optimisticMessages.map((message, index) => {
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
                {message.isDraft ? (
                  <DraftBubble
                    message={message}
                    onEdit={() =>
                      setEditingDraft({ id: message.id, bodyText: message.bodyText ?? "" })
                    }
                    onDiscard={() => handleDiscardDraft(message)}
                    onSend={() => handleSendDraft(message)}
                  />
                ) : (
                  <MessageBubble message={message} isSelf={isSelf} locale={locale} />
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {feedback && (
          <p className={cn("text-xs text-center pb-2 shrink-0", feedback.isError ? "text-destructive" : "text-muted-foreground")}>
            {feedback.text}
          </p>
        )}
      </div>

      {/* Reply box — outside the max-w container so it spans full width */}
      <ReplyBox
        email={email}
        signatures={signatures}
        onSend={handleSend}
        editingDraft={editingDraft}
        onDraftSaved={handleDraftSaved}
        onEditingDraftClear={handleEditingDraftClear}
      />
    </div>
  );
}
