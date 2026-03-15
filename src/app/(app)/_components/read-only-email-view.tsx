"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Paperclip,
  Inbox,
  Newspaper,
  Bookmark,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { safeColor, getInitials, formatFullDate } from "@/lib/email-display";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { moveEmailAction } from "@/app/(app)/_actions/move-email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReadOnlyEmail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  toAddresses: Array<{ address: string; name?: string }>;
  bodyHtml: string | null;
  bodyText: string | null;
  sentAt: string;
  mailAccountId: string;
  accountColor: string;
  accountName: string;
  category: string;
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

// ---------------------------------------------------------------------------
// MoveToMenu
// ---------------------------------------------------------------------------

type TargetCategory = "inbox" | "feed" | "paper_trail" | "trash";

const MOVE_OPTIONS: { id: TargetCategory; icon: React.ElementType; labelKey: string }[] = [
  { id: "inbox", icon: Inbox, labelKey: "inbox" },
  { id: "feed", icon: Newspaper, labelKey: "feed" },
  { id: "paper_trail", icon: Bookmark, labelKey: "saved" },
  { id: "trash", icon: Trash2, labelKey: "trash" },
];

function MoveToMenu({
  emailId,
  currentCategory,
  backPath,
}: {
  emailId: string;
  currentCategory: string;
  backPath: string;
}) {
  const t = useTranslations("pages.moveTo");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TargetCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMove(target: TargetCategory, createRule: boolean) {
    setOpen(false);
    setConfirmTarget(null);
    startTransition(async () => {
      try {
        const result = await moveEmailAction({
          emailId,
          targetCategory: target,
          createRule,
        });
        if (result.success) {
          toast.success(t("moved"));
          router.push(backPath);
        } else {
          toast.error(t("moveFailed"));
        }
      } catch {
        toast.error(t("moveFailed"));
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmTarget(null); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 h-9 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
            isPending && "opacity-50 pointer-events-none",
          )}
        >
          {isPending ? "..." : t("label")}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" align="end">
        {confirmTarget ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium text-foreground">{t("applyToFuture")}</p>
            <p className="text-xs text-muted-foreground">{t("applyToFutureDescription")}</p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleMove(confirmTarget, true)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors text-foreground"
              >
                {t("alsoFuture")}
              </button>
              <button
                onClick={() => handleMove(confirmTarget, false)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors text-muted-foreground"
              >
                {t("justThisMessage")}
              </button>
            </div>
          </div>
        ) : (
          MOVE_OPTIONS.filter((opt) => opt.id !== currentCategory).map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              onClick={() => setConfirmTarget(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(labelKey as "inbox" | "feed" | "saved" | "trash")}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// ReadOnlyEmailView
// ---------------------------------------------------------------------------

export function ReadOnlyEmailView({
  email,
  locale,
  backPath,
}: {
  email: ReadOnlyEmail;
  locale: string;
  backPath: string;
}) {
  const t = useTranslations("pages.readOnlyDetail");
  const router = useRouter();

  const initials = getInitials(email.fromName, email.fromAddress);
  const ringColor = safeColor(email.accountColor);
  const senderName = email.fromName?.trim() || email.fromAddress;
  const fullDate = formatFullDate(email.sentAt, locale);

  const recipients = (email.toAddresses ?? [])
    .map((r) => r.name?.trim() || r.address)
    .join(", ");

  // Render body
  const bodyContent = email.bodyHtml || email.bodyText || "";
  const isHtml = !!email.bodyHtml;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col mx-auto w-full max-w-4xl px-[10px] md:px-6 min-h-0">

        {/* Header */}
        <header className="flex items-center gap-3 py-4 border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => router.push(backPath)}
            aria-label={t("back")}
            className="flex items-center justify-center w-11 h-11 -ml-1 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div
            className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-medium text-white select-none"
            style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {senderName}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {email.fromAddress}
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
            <MoveToMenu
              emailId={email.id}
              currentCategory={email.category}
              backPath={backPath}
            />
            <MobileMenuButton />
          </div>
        </header>

        {/* Subject + meta */}
        <div className="py-4 border-b border-border shrink-0 space-y-1">
          <h1 className="text-base font-semibold text-foreground text-balance">
            {email.subject}
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{fullDate}</span>
            {recipients && (
              <>
                <span className="text-border">|</span>
                <span>{t("to")} {recipients}</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-none py-6 min-h-0">
          {bodyContent ? (
            isHtml ? (
              <div
                className="prose prose-invert prose-sm max-w-none text-foreground/90 [&_a]:text-primary"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyContent) }}
              />
            ) : (
              <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
                {bodyContent}
              </pre>
            )
          ) : (
            <p className="text-sm text-muted-foreground italic">{t("noBody")}</p>
          )}

          {/* Attachments */}
          {email.attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">
                {t("attachments", { count: email.attachments.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border hover:bg-secondary transition-colors cursor-pointer max-w-[220px]"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{att.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
