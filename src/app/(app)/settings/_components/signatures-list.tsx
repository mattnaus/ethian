"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { deleteSignatureAction } from "../_actions/signatures";
import { SignatureForm } from "./signature-form";
import type { Signature } from "@/db/schema";

interface SignaturesListProps {
  signatures: Signature[];
}

export function SignaturesList({ signatures }: SignaturesListProps) {
  const t = useTranslations("settings.signatures");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Signature | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openAdd() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(sig: Signature) {
    setEditTarget(sig);
    setFormOpen(true);
  }

  function handleDelete(sig: Signature) {
    if (!confirm(t("deleteConfirm", { name: sig.name }))) return;
    setDeletingId(sig.id);
    startTransition(async () => {
      await deleteSignatureAction(sig.id);
      setDeletingId(null);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{t("heading")}</h2>
          <p className="text-sm text-zinc-400">{t("subheading")}</p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addSignature")}
        </Button>
      </div>

      {signatures.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">{t("noSignatures")}</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {signatures.map((sig) => (
            <li
              key={sig.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100 truncate">{sig.name}</span>
                  {sig.isDefault && (
                    <Badge variant="outline" className="text-xs text-zinc-400">
                      {t("defaultBadge")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5 max-w-xs">{sig.content}</p>
              </div>

              <div className="flex items-center gap-1 ml-4 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("editAriaLabel", { name: sig.name })}
                  onClick={() => openEdit(sig)}
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("deleteAriaLabel", { name: sig.name })}
                  onClick={() => handleDelete(sig)}
                  disabled={deletingId === sig.id}
                  className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SignatureForm
        key={editTarget?.id ?? "add"}
        open={formOpen}
        onOpenChange={setFormOpen}
        signature={editTarget}
      />
    </>
  );
}
