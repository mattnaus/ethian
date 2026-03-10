"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

const ACCOUNT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#10b981", // emerald
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

function randomColor() {
  return ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)];
}

const initialState: AccountFormState = {};

export function AccountForm({ open, onOpenChange, account }: AccountFormProps) {
  const isEdit = !!account;

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

  // Sync color when switching edit targets
  useEffect(() => {
    if (account?.color) {
      setSelectedColor(account.color);
    }
  }, [account?.color]);

  function field(name: string) {
    return state.fieldErrors?.[name]?.[0];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {isEdit ? "Edit mail account" : "Add mail account"}
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Hidden color input submitted with the form */}
          <input type="hidden" name="color" value={selectedColor} />

          {/* General */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-zinc-300">Display name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Personal Gmail"
                defaultValue={account?.name}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
              />
              {field("name") && <p className="text-xs text-red-400">{field("name")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                defaultValue={account?.email}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
              />
              {field("email") && <p className="text-xs text-red-400">{field("email")}</p>}
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Account color</Label>
              <div className="flex items-center gap-2">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select color ${color}`}
                    onClick={() => setSelectedColor(color)}
                    className="h-6 w-6 rounded-full shrink-0 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                    style={{
                      backgroundColor: color,
                      boxShadow: selectedColor === color
                        ? `0 0 0 2px #18181b, 0 0 0 4px ${color}`
                        : undefined,
                      transform: selectedColor === color ? "scale(1.15)" : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* IMAP */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">IMAP (incoming)</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="imapHost" className="text-zinc-300">Host</Label>
                <Input
                  id="imapHost"
                  name="imapHost"
                  placeholder="imap.gmail.com"
                  defaultValue={account?.imapHost}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
                />
                {field("imapHost") && <p className="text-xs text-red-400">{field("imapHost")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imapPort" className="text-zinc-300">Port</Label>
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
              <Label htmlFor="imapSecure" className="text-zinc-300 font-normal">Use TLS/SSL</Label>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* SMTP */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">SMTP (outgoing)</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="smtpHost" className="text-zinc-300">Host</Label>
                <Input
                  id="smtpHost"
                  name="smtpHost"
                  placeholder="smtp.gmail.com"
                  defaultValue={account?.smtpHost}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
                />
                {field("smtpHost") && <p className="text-xs text-red-400">{field("smtpHost")}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtpPort" className="text-zinc-300">Port</Label>
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
              <Label htmlFor="smtpSecure" className="text-zinc-300 font-normal">Use TLS/SSL</Label>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Credentials */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Credentials</p>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-zinc-300">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="you@example.com"
                defaultValue={account?.username}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-orange-500"
              />
              {field("username") && <p className="text-xs text-red-400">{field("username")}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-zinc-300">
                {isEdit ? "Password (leave blank to keep current)" : "Password"}
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
