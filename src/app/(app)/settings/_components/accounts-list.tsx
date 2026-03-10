"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { deleteMailAccountAction } from "../_actions/accounts";
import { AccountForm } from "./account-form";
import type { MailAccount } from "@/db/schema";

interface AccountsListProps {
  accounts: MailAccount[];
}

export function AccountsList({ accounts }: AccountsListProps) {
  const t = useTranslations("settings.accounts");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MailAccount | undefined>();
  // Track which account ID is being deleted to scope the pending state per-row
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openAdd() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(account: MailAccount) {
    setEditTarget(account);
    setFormOpen(true);
  }

  function handleDelete(account: MailAccount) {
    if (!confirm(t("deleteConfirm", { name: account.name }))) return;
    setDeletingId(account.id);
    startTransition(async () => {
      await deleteMailAccountAction(account.id);
      setDeletingId(null);
    });
  }

  const syncBadgeVariant = (status: MailAccount["syncStatus"]) => {
    if (status === "syncing") return "secondary";
    if (status === "error") return "destructive";
    return "outline";
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{t("heading")}</h2>
          <p className="text-sm text-zinc-400">{t("subheading")}</p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-orange-500 hover:bg-orange-600 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addAccount")}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">{t("noAccounts")}</p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0 flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: account.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100 truncate">
                      {account.name}
                    </span>
                    <Badge
                      variant={syncBadgeVariant(account.syncStatus)}
                      className="text-xs capitalize"
                    >
                      {account.syncStatus}
                    </Badge>
                    {!account.isActive && (
                      <Badge variant="outline" className="text-xs text-zinc-500">
                        {t("disabled")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{account.email}</p>
                  {account.syncError && (
                    <p className="text-xs text-red-400 truncate mt-0.5">
                      {account.syncError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-4 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("editAriaLabel", { name: account.name })}
                  onClick={() => openEdit(account)}
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("deleteAriaLabel", { name: account.name })}
                  onClick={() => handleDelete(account)}
                  disabled={deletingId === account.id}
                  className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* key forces remount when switching between add/edit so useActionState resets */}
      <AccountForm
        key={editTarget?.id ?? "add"}
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editTarget}
      />
    </>
  );
}
