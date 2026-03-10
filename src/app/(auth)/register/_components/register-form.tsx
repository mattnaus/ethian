"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { registerAction } from "../../_actions/auth";

const inputClass =
  "w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const [state, action, isPending] = useActionState(registerAction, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.error}
        </p>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {t("nameLabel")}{" "}
          <span className="text-muted-foreground font-normal">{t("nameOptional")}</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className={inputClass}
          placeholder={t("namePlaceholder")}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder={t("emailPlaceholder")}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          placeholder={t("passwordPlaceholder")}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
      >
        {isPending ? t("submittingButton") : t("submitButton")}
      </button>
    </form>
  );
}
