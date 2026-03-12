"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { safeColor, getInitials, formatDate } from "@/lib/email-display";

type Attachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
};

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
  accountColor: string;
  accountName: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
      <Paperclip className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
      <span className="text-zinc-200 truncate max-w-[200px]">{attachment.filename}</span>
      <span className="text-zinc-500 shrink-0">{formatFileSize(attachment.size)}</span>
    </div>
  );
}

function EmailBody({ bodyText, bodyHtml }: { bodyText: string | null; bodyHtml: string | null }) {
  if (bodyText) {
    return (
      <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
        {bodyText}
      </pre>
    );
  }

  if (bodyHtml) {
    // Strip tags for a safe plaintext fallback — no dangerouslySetInnerHTML
    const stripped = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
    return (
      <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
        {stripped}
      </pre>
    );
  }

  return <p className="text-sm text-zinc-500 italic">No message body.</p>;
}

export function EmailDetailView({
  email,
  attachments,
  locale,
}: {
  email: EmailDetail;
  attachments: Attachment[];
  locale: string;
}) {
  const router = useRouter();
  const t = useTranslations("pages.emailDetail");

  const initials = getInitials(email.fromName, email.fromAddress);
  const ringColor = safeColor(email.accountColor);
  const senderDisplay = email.fromName?.trim() || email.fromAddress;
  const formattedDate = formatDate(email.sentAt, locale);

  const toList = email.toAddresses
    .map((r) => r.name?.trim() || r.address)
    .join(", ");

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 h-12 px-4 border-b border-zinc-800 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-50"
          aria-label={t("back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Avatar */}
        <div
          className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white select-none"
          style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
        >
          {initials}
        </div>

        {/* Sender info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-50 truncate leading-tight">
            {senderDisplay}
          </p>
          <p className="text-xs text-zinc-500 truncate leading-tight">
            {email.fromAddress}
          </p>
        </div>

        {/* Date */}
        <span className="text-xs text-zinc-500 shrink-0">{formattedDate}</span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 md:px-8 py-6 space-y-6">
          {/* Subject */}
          <h1 className="text-xl font-semibold text-zinc-50 leading-snug">
            {email.subject}
          </h1>

          {/* Recipients */}
          {toList && (
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400">{t("to")}</span> {toList}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-zinc-800" />

          {/* Body */}
          <EmailBody bodyText={email.bodyText} bodyHtml={email.bodyHtml} />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                {t("attachments", { count: attachments.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <AttachmentChip key={a.id} attachment={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply compose bar */}
      <div className={cn(
        "shrink-0 border-t border-zinc-800",
        "px-4 md:px-8 py-4",
        "mx-auto w-full max-w-3xl",
      )}>
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
          <textarea
            rows={3}
            placeholder={t("replyPlaceholder")}
            className={cn(
              "w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600",
              "resize-none outline-none leading-relaxed",
            )}
          />
          <div className="flex items-center justify-end pt-2 border-t border-zinc-800">
            <button
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t("sendButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
