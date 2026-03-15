"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Trash2, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { safeColor, getInitials } from "@/lib/email-display";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";
import { Button } from "@/components/ui/button";
import {
  discardStandaloneDraftAction,
  sendStandaloneDraftAction,
} from "../_actions/draft";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DraftDetail = {
  id: string;
  subject: string;
  fromName: string | null;
  fromAddress: string;
  toAddresses: Array<{ address: string; name?: string }>;
  bodyHtml: string | null;
  bodyText: string | null;
  updatedAt: string;
  mailAccountId: string;
  accountColor: string;
  accountName: string;
  accountEmail: string;
};

// ---------------------------------------------------------------------------
// DraftDetailView
// ---------------------------------------------------------------------------

export function DraftDetailView({
  draft,
}: {
  draft: DraftDetail;
}) {
  const router = useRouter();
  const t = useTranslations("pages.draftDetail");
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const recipients = draft.toAddresses
    .map((r) => r.name?.trim() || r.address)
    .join(", ");
  const displayRecipient = recipients || t("noRecipient");
  const initials = recipients
    ? getInitials(draft.toAddresses[0]?.name ?? null, draft.toAddresses[0]?.address ?? "D")
    : "D";
  const ringColor = safeColor(draft.accountColor);
  const body = draft.bodyText ?? "";

  function handleEdit() {
    router.push(`/compose?draft=${draft.id}`);
  }

  async function handleDiscard() {
    setIsDiscarding(true);
    try {
      const result = await discardStandaloneDraftAction({ draftId: draft.id });
      if (result.success) {
        router.push("/drafts");
      } else {
        toast.error(t("discardFailed"));
      }
    } catch {
      toast.error(t("discardFailed"));
    } finally {
      setIsDiscarding(false);
    }
  }

  async function handleSend() {
    setIsSending(true);
    try {
      const result = await sendStandaloneDraftAction({
        draftId: draft.id,
        mailAccountId: draft.mailAccountId,
      });
      if (result.success === true) {
        router.push("/drafts");
      } else if (result.success === "partial") {
        toast.success(t("sendPartialWarning"));
        router.push("/drafts");
      } else {
        toast.error(t("sendFailed"));
      }
    } catch {
      toast.error(t("sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col mx-auto w-full max-w-5xl px-[10px] md:px-6 min-h-0">

        {/* Header */}
        <header className="flex items-center gap-3 py-4 border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => router.push("/drafts")}
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
              {displayRecipient}
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
              {draft.accountName}
            </span>
            <MobileMenuButton />
          </div>
        </header>

        {/* Subject */}
        <div className="py-4 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground text-balance">
            {draft.subject || t("noSubject")}
          </h1>
        </div>

        {/* To line */}
        <div className="py-3 border-b border-border shrink-0">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{t("toLabel")}</span>{" "}
            {recipients || t("noRecipient")}
          </p>
        </div>

        {/* Draft bubble */}
        <div className="flex-1 overflow-y-auto scrollbar-none py-6 flex flex-col gap-4 min-h-0">
          <div className="flex flex-row-reverse items-end gap-2.5">
            <div className="flex flex-col gap-1 w-[90%] md:w-[65%] md:max-w-3xl items-end">
              <div className="w-full border-2 border-dashed border-zinc-600 rounded-2xl px-4 py-3 bg-zinc-900/50">
                <span className="text-xs border border-zinc-700 text-zinc-500 rounded-full px-2 py-0.5 inline-block mb-2">
                  {t("draftLabel")}
                </span>
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {body || <span className="italic opacity-60">{t("noBody")}</span>}
                </p>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t-2 border-dashed border-zinc-600">
                  <button
                    type="button"
                    onClick={() => void handleDiscard()}
                    disabled={isDiscarding}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50 min-h-11 min-w-11 justify-center md:min-h-0 md:min-w-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("discardDraft")}
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    className="h-7 px-2.5 text-xs border-zinc-600 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 bg-transparent"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {t("editDraft")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSend()}
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
        </div>
      </div>
    </div>
  );
}
