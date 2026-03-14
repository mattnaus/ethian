"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createSignatureAction, updateSignatureAction } from "../_actions/signatures";
import type { Signature } from "@/db/schema";

interface SignatureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature?: Signature;
}

export function SignatureForm({ open, onOpenChange, signature }: SignatureFormProps) {
  const isEdit = !!signature;
  const t = useTranslations("settings.signatureForm");

  const [name, setName] = useState(signature?.name ?? "");
  const [content, setContent] = useState(signature?.content ?? "");
  const [isDefault, setIsDefault] = useState(signature?.isDefault ?? false);
  const [isPending, setIsPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(signature?.name ?? "");
      setContent(signature?.content ?? "");
      setIsDefault(signature?.isDefault ?? false);
    }
  }, [open, signature]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      const payload = { name: name.trim(), content: content.trim(), isDefault };
      const result = isEdit
        ? await updateSignatureAction(signature.id, payload)
        : await createSignatureAction(payload);

      if (result.success) {
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsPending(false);
    }
  }

  const inputClass =
    "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90dvh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-zinc-100">
            {isEdit ? t("editTitle") : t("addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="sig-name" className="text-zinc-300">
                {t("nameLabel")}
              </Label>
              <Input
                id="sig-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sig-content" className="text-zinc-300">
                {t("contentLabel")}
              </Label>
              <textarea
                id="sig-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("contentPlaceholder")}
                required
                rows={6}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sig-isDefault"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="accent-primary"
              />
              <Label htmlFor="sig-isDefault" className="text-zinc-300 font-normal">
                {t("isDefaultLabel")}
              </Label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-zinc-800 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              {t("cancelButton")}
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || !content.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isEdit ? t("saveButton") : t("addButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
