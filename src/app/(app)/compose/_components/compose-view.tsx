"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X, ChevronDown, Paperclip, Send, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";
import { saveComposeDraftAction, sendNewEmailAction } from "../_actions/compose";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MailAccount {
  id: string;
  name: string;
  email: string;
  color: string;
}

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface KnownAddress {
  address: string;
  name: string | null;
}

interface DraftData {
  id: string;
  mailAccountId: string;
  toAddresses: Array<{ address: string; name?: string }>;
  subject: string;
  bodyText: string | null;
  signatureId: string | null;
}

interface ComposeViewProps {
  mailAccounts: MailAccount[];
  signatures: Signature[];
  knownAddresses: KnownAddress[];
  draft?: DraftData | null;
}

// ---------------------------------------------------------------------------
// ComposeView
// ---------------------------------------------------------------------------

export function ComposeView({
  mailAccounts,
  signatures,
  knownAddresses,
  draft,
}: ComposeViewProps) {
  const t = useTranslations("pages.compose");
  const router = useRouter();

  const defaultAccount = draft
    ? (mailAccounts.find((a) => a.id === draft.mailAccountId) ?? mailAccounts[0])
    : mailAccounts[0];

  const defaultSig = signatures.find((s) => s.isDefault) ?? signatures[0] ?? null;

  // Core state
  const [fromAccountId, setFromAccountId] = useState(defaultAccount?.id ?? "");
  const [toRecipients, setToRecipients] = useState<string[]>(
    draft?.toAddresses.map((a) => a.address) ?? [],
  );
  const [toInput, setToInput] = useState("");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.bodyText ?? "");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draft?.id ?? null);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(
    draft?.signatureId ?? defaultSig?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [fromPickerOpenDesktop, setFromPickerOpenDesktop] = useState(false);
  const [fromPickerOpenMobile, setFromPickerOpenMobile] = useState(false);
  const [sigPickerOpen, setSigPickerOpen] = useState(false);

  // To: autocomplete
  const [suggestions, setSuggestions] = useState<KnownAddress[]>([]);
  const toInputRef = useRef<HTMLInputElement>(null);

  const fromAccount = mailAccounts.find((a) => a.id === fromAccountId) ?? mailAccounts[0];
  const activeSignature = signatures.find((s) => s.id === activeSignatureId) ?? null;

  // Filter suggestions as user types
  useEffect(() => {
    const q = toInput.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    setSuggestions(
      knownAddresses
        .filter(
          (a) =>
            !toRecipients.includes(a.address) &&
            (a.address.toLowerCase().includes(q) ||
              (a.name ?? "").toLowerCase().includes(q)),
        )
        .slice(0, 8),
    );
  }, [toInput, knownAddresses, toRecipients]);

  function addRecipient(address: string) {
    const clean = address.trim().replace(/,$/, "");
    if (clean && !toRecipients.includes(clean)) {
      setToRecipients((prev) => [...prev, clean]);
    }
    setToInput("");
    setSuggestions([]);
    toInputRef.current?.focus();
  }

  function removeRecipient(address: string) {
    setToRecipients((prev) => prev.filter((r) => r !== address));
  }

  function handleToKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && toInput.trim()) {
      e.preventDefault();
      addRecipient(toInput);
    }
    if (e.key === "Backspace" && !toInput && toRecipients.length > 0) {
      setToRecipients((prev) => prev.slice(0, -1));
    }
    if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  function buildBodyWithSignature(text: string): string {
    if (!activeSignature) return text;
    return `${text}\n\n--\n${activeSignature.content}`;
  }

  async function handleSaveDraft() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveComposeDraftAction({
        mailAccountId: fromAccountId,
        toAddresses: toRecipients,
        subject,
        bodyText: body,
        draftId: currentDraftId ?? undefined,
        signatureId: activeSignatureId,
      });
      if (result.success) {
        toast.success(t("draftSaved"));
        router.push(`/drafts/${result.draftId}`);
      } else {
        toast.error(t("draftSaveFailed"));
      }
    } catch {
      toast.error(t("draftSaveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSend() {
    if (!body.trim() || toRecipients.length === 0 || isSending) return;
    const text = buildBodyWithSignature(body.trim());
    setIsSending(true);
    try {
      const result = await sendNewEmailAction({
        mailAccountId: fromAccountId,
        toAddresses: toRecipients,
        subject,
        bodyText: text,
        draftId: currentDraftId ?? undefined,
      });
      if (result.success === true) {
        router.push(result.sentEmailId ? `/inbox/${result.sentEmailId}` : "/inbox");
      } else if (result.success === "partial") {
        toast.success(t("sendPartialWarning"));
        router.back();
      } else {
        toast.error(t("sendFailed"));
      }
    } catch {
      toast.error(t("sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  const canSend = body.trim().length > 0 && toRecipients.length > 0;

  function AccountPickerContent({ onClose }: { onClose: () => void }) {
    return (
      <>
        {mailAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => {
              setFromAccountId(account.id);
              onClose();
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded hover:bg-zinc-800 transition-colors"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: account.color }}
            />
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm text-zinc-200 font-medium truncate w-full">
                {account.name}
              </span>
              <span className="text-xs text-zinc-500 truncate w-full">
                {account.email}
              </span>
            </div>
            {account.id === fromAccountId && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </button>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-5xl flex flex-col flex-1 min-h-0">

        {/* ── Desktop top bar ── */}
        <div className="hidden md:block mb-4">
          <div className="relative flex items-center justify-between h-9">
            <div />

            {/* Center: Mailbox selector */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              <Popover open={fromPickerOpenDesktop} onOpenChange={setFromPickerOpenDesktop}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm"
                  >
                    <span className="text-foreground/70">{t("mailboxLabel")}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: fromAccount?.color ?? "#888" }}
                    />
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="center"
                  className="w-64 p-1 bg-zinc-900 border-zinc-800"
                >
                  <AccountPickerContent onClose={() => setFromPickerOpenDesktop(false)} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Close */}
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => router.back()}
              className="flex items-center justify-center min-w-9 min-h-9 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Mobile top bar ── */}
        <div className="md:hidden mb-4">
          <div className="flex items-center gap-2">
            <MobileMenuButton className="-ml-1 mr-auto" />
            <Popover open={fromPickerOpenMobile} onOpenChange={setFromPickerOpenMobile}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 h-11 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <span className="text-sm text-foreground/70">{t("mailboxLabel")}</span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: fromAccount?.color ?? "#888" }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-[calc(100vw-20px)] p-1 bg-zinc-900 border-zinc-800"
              >
                <AccountPickerContent onClose={() => setFromPickerOpenMobile(false)} />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => router.back()}
              className="flex items-center justify-center min-w-11 min-h-11 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Card container ── */}
        <div className="flex flex-col flex-1 min-h-0 border border-border rounded-2xl bg-zinc-900/40 overflow-hidden">

          {/* Container header */}
          <div className="flex items-center px-[10px] md:px-4 py-3 mb-1 shrink-0">
            <h2 className="text-2xl font-semibold text-foreground">{t("title")}</h2>
          </div>

          {/* To: field */}
          <div className="relative flex items-start gap-3 px-4 py-3 border-t border-zinc-800 min-h-[48px] shrink-0">
            <span className="text-sm font-medium text-muted-foreground shrink-0 pt-0.5">
              {t("toLabel")}
            </span>
            <div className="flex-1 flex flex-wrap gap-1.5 items-center min-w-0">
              {toRecipients.map((r) => (
                <span
                  key={r}
                  className="flex items-center gap-1 bg-zinc-800 text-zinc-200 text-xs px-2 py-0.5 rounded-full"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => removeRecipient(r)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                ref={toInputRef}
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={handleToKeyDown}
                placeholder={toRecipients.length === 0 ? t("toPlaceholder") : ""}
                className="flex-1 min-w-32 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>

            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.address}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addRecipient(s.address);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      {s.name && (
                        <span className="text-sm text-foreground truncate">{s.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">{s.address}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3 px-4 border-t border-zinc-800 shrink-0">
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              {t("subjectLabel")}
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subjectPlaceholder")}
              className="flex-1 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleBodyKeyDown}
            placeholder={t("bodyPlaceholder")}
            className="flex-1 min-h-0 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none px-4 py-4 border-t border-zinc-800 leading-relaxed"
          />

          {/* Signature strip */}
          {signatures.length > 0 && (
            <div className="border-t border-zinc-800 px-4 py-2.5 flex items-start gap-2 shrink-0">
              <p className="flex-1 text-xs text-zinc-500 whitespace-pre-wrap line-clamp-3">
                {activeSignature?.content ?? ""}
              </p>
              <div className="flex items-center gap-1 shrink-0">
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
                      {activeSignatureId && (
                        <>
                          <div className="h-px bg-zinc-800 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSignatureId(null);
                              setSigPickerOpen(false);
                            }}
                            className="px-3 py-1.5 text-sm text-left text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
                          >
                            {t("removeSignature")}
                          </button>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {activeSignatureId && (
                  <button
                    type="button"
                    aria-label={t("removeSignature")}
                    onClick={() => setActiveSignatureId(null)}
                    className="flex items-center justify-center min-w-9 min-h-9 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div
            className="border-t border-zinc-800 px-3 py-2 flex items-center justify-between shrink-0"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
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
              disabled={!canSend || isSending}
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
