"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveDraftAction } from "../_actions/draft";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface EmailDetail {
  id: string;
  mailAccountId: string;
}

interface ReplyBoxProps {
  email: EmailDetail;
  signatures: Signature[];
  onSend: (text: string) => Promise<void>;
  editingDraft: { id: string; bodyText: string } | null;
  onDraftSaved: (draftId: string) => void;
  onEditingDraftClear: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplyBox({
  email,
  signatures,
  onSend,
  editingDraft,
  onDraftSaved,
  onEditingDraftClear,
}: ReplyBoxProps) {
  const t = useTranslations("pages.emailDetail");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);

  const [reply, setReply] = useState("");
  const [replyHeight, setReplyHeight] = useState(80);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sigPickerOpen, setSigPickerOpen] = useState(false);
  const [signatureDismissed, setSignatureDismissed] = useState(false);

  const defaultSig = signatures.find((s) => s.isDefault) ?? signatures[0] ?? null;
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(
    defaultSig?.id ?? null
  );

  const activeSignature = signatures.find((s) => s.id === activeSignatureId) ?? null;

  // Load editing draft into textarea
  useEffect(() => {
    if (editingDraft) {
      setReply(editingDraft.bodyText);
      setCurrentDraftId(editingDraft.id);
      onEditingDraftClear();
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [editingDraft, onEditingDraftClear]);

  // Keyboard shortcut: Cmd/Ctrl+Enter to send
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend() {
    const text = buildBodyWithSignature(reply.trim());
    if (!reply.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(text);
      setReply("");
      setCurrentDraftId(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch {
      toast.error(t("sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveDraft() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveDraftAction({
        mailAccountId: email.mailAccountId,
        emailId: email.id,
        bodyText: reply,
        draftId: currentDraftId ?? undefined,
      });
      if (result.success) {
        setCurrentDraftId(result.draftId);
        onDraftSaved(result.draftId);
        toast.success(t("draftSaved"));
      } else {
        toast.error(t("draftSaveFailed"));
      }
    } catch {
      toast.error(t("draftSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  function buildBodyWithSignature(text: string): string {
    if (!activeSignature || signatureDismissed) return text;
    return `${text}\n\n--\n${activeSignature.content}`;
  }

  // ---------------------------------------------------------------------------
  // Drag resize
  // ---------------------------------------------------------------------------

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    dragStartH.current = replyHeight;

    function onMove(ev: PointerEvent) {
      setReplyHeight(
        Math.min(400, Math.max(72, dragStartH.current + (dragStartY.current - ev.clientY)))
      );
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="border-t border-border shrink-0">
      <div className="mx-auto w-full max-w-5xl px-[10px] md:px-6">
        {/* Drag handle */}
        <div
          onPointerDown={handleDragStart}
          className="h-5 flex items-center justify-center cursor-ns-resize select-none touch-none"
          aria-hidden
        >
          <span className="w-8 h-1 rounded-full bg-zinc-700" />
        </div>

      <div className="border border-border rounded-2xl mb-4 bg-zinc-900/40 overflow-hidden">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("replyPlaceholder")}
          aria-label={t("replyPlaceholder")}
          style={{ height: `${replyHeight}px` }}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-relaxed px-4 pt-3 pb-1"
        />

        {/* Signature strip */}
        {activeSignature && !signatureDismissed && (
          <div className="border-t border-zinc-800 px-4 py-2.5 flex items-start gap-2">
            <p className="flex-1 text-xs text-zinc-500 whitespace-pre-wrap line-clamp-3">
              {activeSignature.content}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {signatures.length > 0 && (
                <Popover open={sigPickerOpen} onOpenChange={setSigPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("changeSignature")}
                      className="flex items-center justify-center min-w-9 min-h-9 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    className="w-48 p-1 bg-zinc-900 border-zinc-800"
                  >
                    <div className="flex flex-col">
                      {signatures.map((sig) => (
                        <button
                          key={sig.id}
                          type="button"
                          onClick={() => {
                            setActiveSignatureId(sig.id);
                            setSignatureDismissed(false);
                            setSigPickerOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-left rounded hover:bg-zinc-800 transition-colors"
                        >
                          <span
                            className={
                              sig.id === activeSignatureId
                                ? "text-zinc-100 font-medium"
                                : "text-zinc-400"
                            }
                          >
                            {sig.name}
                          </span>
                        </button>
                      ))}
                      <div className="h-px bg-zinc-800 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSignatureId(null);
                          setSignatureDismissed(true);
                          setSigPickerOpen(false);
                        }}
                        className="px-3 py-1.5 text-sm text-left text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
                      >
                        {t("removeSignature")}
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <button
                type="button"
                aria-label={t("removeSignature")}
                onClick={() => setSignatureDismissed(true)}
                className="flex items-center justify-center min-w-9 min-h-9 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="border-t border-zinc-800 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t("attachFile")}
              className="flex items-center justify-center min-w-9 min-h-9 rounded text-muted-foreground hover:text-foreground hover:bg-zinc-800 transition-colors"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={isSaving}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? t("saving") : t("saveDraft")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!reply.trim() || isSending}
            aria-label={isSending ? t("sending") : t("sendButton")}
            className="flex items-center justify-center min-w-9 min-h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
