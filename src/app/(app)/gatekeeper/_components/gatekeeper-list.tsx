"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { GatekeeperRow, type GatekeeperEntry } from "./gatekeeper-row";
import { makeGatekeeperDecision, type GatekeeperDecision } from "../_actions/decisions";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";

interface GatekeeperListProps {
  entries: GatekeeperEntry[];
  emptyMessage: string;
  showingMessage: string | null;
  locale: string;
}

export function GatekeeperList({
  entries: initialEntries,
  emptyMessage,
  showingMessage,
  locale,
}: GatekeeperListProps) {
  const t = useTranslations("pages.gatekeeper");
  const [entries, setEntries] = useState(initialEntries);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handleDecision(id: string, decision: GatekeeperDecision) {
    setPendingIds((prev) => new Set([...prev, id]));
    startTransition(async () => {
      const result = await makeGatekeeperDecision(id, decision);
      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* Mobile top bar */}
        <div className="md:hidden mb-4 flex items-center">
          <MobileMenuButton className="-ml-1" />
        </div>

        {/* Container */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">

          {/* Header */}
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <h2 className="text-2xl font-semibold text-foreground">{t("title")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("senderCount", { count: entries.length })}
            </span>
          </div>

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="flex items-center justify-center py-16 px-4">
              <p className="text-sm text-muted-foreground text-center">{emptyMessage}</p>
            </div>
          )}

          {/* Entry list */}
          <div className="flex flex-col px-[10px] md:px-4 gap-[4px] mb-2">
            {entries.map((entry) => (
              <GatekeeperRow
                key={entry.id}
                entry={entry}
                locale={locale}
                onDecision={handleDecision}
                isPending={pendingIds.has(entry.id)}
              />
            ))}
          </div>

          {/* Showing X of Y footer */}
          {showingMessage && (
            <p className="text-xs text-muted-foreground text-center py-3 mt-1">
              {showingMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
