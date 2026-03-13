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
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm">
      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-foreground/80 truncate max-w-[200px]">{attachment.filename}</span>
      <span className="text-muted-foreground shrink-0">{formatFileSize(attachment.size)}</span>
    </div>
  );
}

function EmailBody({ bodyText, bodyHtml }: { bodyText: string | null; bodyHtml: string | null }) {
  if (bodyText) {
    return (
      <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
        {bodyText}
      </pre>
    );
  }

  if (bodyHtml) {
    // Strip tags for a safe plaintext fallback — no dangerouslySetInnerHTML
    const stripped = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
    return (
      <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
        {stripped}
      </pre>
    );
  }

  return <p className="text-sm text-muted-foreground italic">No message body.</p>;
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

  const toAddresses = Array.isArray(email.toAddresses) ? email.toAddresses : [];
  const toList = toAddresses.map((r) => r.name?.trim() || r.address).join(", ");

  return (
    // pb-16 md:pb-0 accounts for the fixed mobile bottom tab bar (h-16)
    <div className="flex flex-col h-full pb-16 md:pb-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 h-12 px-4 border-b border-border shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center min-h-11 min-w-11 p-3 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
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
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {senderDisplay}
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {email.fromAddress}
          </p>
        </div>

        {/* Date */}
        <span className="text-xs text-muted-foreground shrink-0">{formattedDate}</span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 md:px-8 py-6 space-y-6">
          {/* Subject */}
          <h1 className="text-xl font-semibold text-foreground leading-snug">
            {email.subject}
          </h1>

          {/* Recipients */}
          {toList && (
            <p className="text-xs text-muted-foreground">
              <span className="text-muted-foreground/70">{t("to")}</span> {toList}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Body */}
          <EmailBody bodyText={email.bodyText} bodyHtml={email.bodyHtml} />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
      <div className="shrink-0 border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-4 md:px-8 py-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <textarea
              rows={3}
              placeholder={t("replyPlaceholder")}
              aria-label={t("replyPlaceholder")}
              className={cn(
                "w-full bg-transparent text-sm text-foreground/80 placeholder:text-muted-foreground/50",
                "resize-none outline-none leading-relaxed",
              )}
            />
            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                type="button"
                disabled
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed"
              >
                {t("sendButton")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
