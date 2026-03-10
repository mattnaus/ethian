"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  addMailAccountAction,
  updateMailAccountAction,
  type AccountFormState,
} from "../_actions/accounts";
import type { MailAccount } from "@/db/schema";

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: MailAccount; // undefined = add mode
}

type ColorKey = "Red" | "Orange" | "Amber" | "Emerald" | "Teal" | "Blue" | "Violet" | "Pink";

const ACCOUNT_COLORS: Array<{ hex: string; labelKey: ColorKey }> = [
  { hex: "#ef4444", labelKey: "Red" },
  { hex: "#f97316", labelKey: "Orange" },
  { hex: "#f59e0b", labelKey: "Amber" },
  { hex: "#10b981", labelKey: "Emerald" },
  { hex: "#14b8a6", labelKey: "Teal" },
  { hex: "#3b82f6", labelKey: "Blue" },
  { hex: "#8b5cf6", labelKey: "Violet" },
  { hex: "#ec4899", labelKey: "Pink" },
];

function randomColor() {
  return ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)].hex;
}

const initialState: AccountFormState = {};

export function AccountForm({ open, onOpenChange, account }: AccountFormProps) {
  const isEdit = !!account;
  const t = useTranslations("settings");
  const tColors = useTranslations("colors");

  const action = isEdit
    ? updateMailAccountAction.bind(null, account.id)
    : addMailAccountAction;

  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedColor, setSelectedColor] = useState<string>(
    account?.color ?? randomColor()
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  // Reset form and pick a new random color when the dialog opens for add mode
  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
    } else if (!isEdit) {
      setSelectedColor(randomColor());
    }
  }, [open, isEdit]);

  function field(name: string) {
    return state.fieldErrors?.[name]?.[0];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {isEdit ? t("form.editTitle") : t("form.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Hidden color input submitted with the form */}
          <input type="hidden" name="color" value={selectedColor} />

          {/* General */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-300">{t("form.displayNameLabel")}</Label>
              <Input
                id="name"
                name="name"
                placeholder={t("form.displayNamePlaceholder")}
                defaultValue={account?.name}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
              />
              {field("name") && <p className="text-xs text-red-400">{field("name")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300">{t("form.emailLabel")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("form.emailPlaceholder")}
                defaultValue={account?.email}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
              />
              {field("email") && <p className="text-xs text-red-400">{field("email")}</p>}
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">{t("form.colorLabel")}</Label>
              <div className="flex items-center gap-1 flex-wrap">
                {ACCOUNT_COLORS.map(({ hex, labelKey }) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={t("form.colorSelectAriaLabel", { color: tColors(labelKey) })}
                    onClick={() => setSelectedColor(hex)}
                    className="flex items-center justify-center h-11 w-11 rounded-md shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                  >
                    <span
                      className="h-5 w-5 rounded-full"
                      style={{
                        backgroundColor: hex,
                        boxShadow: selectedColor === hex
                          ? `0 0 0 2px #18181b, 0 0 0 4px ${hex}`
                          : undefined,
                        transform: selectedColor === hex ? "scale(1.15)" : undefined,
                        display: "block",
                        transition: "transform 0.1s",
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* IMAP */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("form.imapSection")}</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="imapHost" className="text-zinc-300">{t("form.hostLabel")}</Label>
                <Input
                  id="imapHost"
                  name="imapHost"
                  placeholder={t("form.imapHostPlaceholder")}
                  defaultValue={account?.imapHost}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
                />
                {field("imapHost") && <p className="text-xs text-red-400">{field("imapHost")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imapPort" className="text-zinc-300">{t("form.portLabel")}</Label>
                <Input
                  id="imapPort"
                  name="imapPort"
                  type="number"
                  defaultValue={account?.imapPort ?? 993}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 focus-visible:ring-orange-500"
                />
                {field("imapPort") && <p className="text-xs text-red-400">{field("imapPort")}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="imapSecure"
                name="imapSecure"
                type="checkbox"
                defaultChecked={account?.imapSecure ?? true}
                value="true"
                className="accent-orange-500"
              />
              <Label htmlFor="imapSecure" className="text-zinc-300 font-normal">{t("form.tlsLabel")}</Label>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* SMTP */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("form.smtpSection")}</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="smtpHost" className="text-zinc-300">{t("form.hostLabel")}</Label>
                <Input
                  id="smtpHost"
                  name="smtpHost"
                  placeholder={t("form.smtpHostPlaceholder")}
                  defaultValue={account?.smtpHost}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
                />
                {field("smtpHost") && <p className="text-xs text-red-400">{field("smtpHost")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPort" className="text-zinc-300">{t("form.portLabel")}</Label>
                <Input
                  id="smtpPort"
                  name="smtpPort"
                  type="number"
                  defaultValue={account?.smtpPort ?? 465}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 focus-visible:ring-orange-500"
                />
                {field("smtpPort") && <p className="text-xs text-red-400">{field("smtpPort")}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="smtpSecure"
                name="smtpSecure"
                type="checkbox"
                defaultChecked={account?.smtpSecure ?? true}
                value="true"
                className="accent-orange-500"
              />
              <Label htmlFor="smtpSecure" className="text-zinc-300 font-normal">{t("form.tlsLabel")}</Label>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Credentials */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("form.credentialsSection")}</p>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-zinc-300">{t("form.usernameLabel")}</Label>
              <Input
                id="username"
                name="username"
                placeholder={t("form.usernamePlaceholder")}
                defaultValue={account?.username}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
              />
              {field("username") && <p className="text-xs text-red-400">{field("username")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-300">
                {isEdit ? t("form.passwordEditLabel") : t("form.passwordLabel")}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus-visible:ring-orange-500"
              />
              {field("password") && <p className="text-xs text-red-400">{field("password")}</p>}
            </div>
          </div>

          {state.error && (
            <p className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              {t("form.cancelButton")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isPending
                ? isEdit ? t("form.savingButton") : t("form.addingButton")
                : isEdit ? t("form.saveButton") : t("form.addButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
