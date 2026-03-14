"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { safeColor } from "@/lib/email-display";
import { GatekeeperRow, type GatekeeperEntry } from "./gatekeeper-row";
import { makeGatekeeperDecision } from "../_actions/decisions";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";

interface MailAccountFilter {
  id: string;
  name: string;
  color: string;
}

interface GatekeeperListProps {
  entries: GatekeeperEntry[];
  accounts: MailAccountFilter[];
  showingMessage: string | null;
  locale: string;
}

// ---------------------------------------------------------------------------
// Date grouping (same logic as inbox)
// ---------------------------------------------------------------------------

function getGroupLabel(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfWeek) return "thisWeek";
  if (date >= startOfMonth) return "thisMonth";
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function groupEntries(
  entries: GatekeeperEntry[],
): { key: string; entries: GatekeeperEntry[] }[] {
  const groups = new Map<string, GatekeeperEntry[]>();
  const order: string[] = [];
  for (const entry of entries) {
    const key = getGroupLabel(new Date(entry.lastSeenAt));
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(entry);
  }
  return order.map((key) => ({ key, entries: groups.get(key)! }));
}

// ---------------------------------------------------------------------------
// GroupDivider (same as inbox)
// ---------------------------------------------------------------------------

function GroupDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2.5 -mx-[2px]">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-3 py-1 rounded-full border border-border shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mailbox filter (same pattern as inbox)
// ---------------------------------------------------------------------------

interface MailboxFilterContentProps {
  accounts: MailAccountFilter[];
  activeAccounts: Set<string>;
  entryCounts: Map<string, number>;
  onToggle: (id: string) => void;
  heading: string;
}

function MailboxFilterContent({
  accounts,
  activeAccounts,
  entryCounts,
  onToggle,
  heading,
}: MailboxFilterContentProps) {
  return (
    <div className="space-y-1 p-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
        {heading}
      </h3>
      {accounts.map((account) => {
        const active = activeAccounts.has(account.id);
        const color = safeColor(account.color);
        const count = entryCounts.get(account.id) ?? 0;
        return (
          <button
            key={account.id}
            onClick={() => onToggle(account.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
              active
                ? "text-foreground"
                : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
            style={active ? { backgroundColor: color + "1a" } : undefined}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="flex-1 text-left font-medium truncate">{account.name}</span>
            {count > 0 && (
              <span className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GatekeeperList({
  entries: initialEntries,
  accounts,
  showingMessage,
  locale,
}: GatekeeperListProps) {
  const t = useTranslations("pages.gatekeeper");
  const tInbox = useTranslations("pages.inbox");

  const [entries, setEntries] = useState(initialEntries);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [activeAccounts, setActiveAccounts] = useState<Set<string>>(
    new Set(accounts.map((a) => a.id)),
  );
  const [filterOpenDesktop, setFilterOpenDesktop] = useState(false);
  const [filterOpenMobile, setFilterOpenMobile] = useState(false);

  function toggleAccount(id: string) {
    setActiveAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = activeAccounts.size === accounts.length;

  const entryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      map.set(entry.mailAccountId, (map.get(entry.mailAccountId) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) => allSelected || activeAccounts.has(e.mailAccountId),
      ),
    [entries, activeAccounts, allSelected],
  );

  const grouped = useMemo(() => groupEntries(filtered), [filtered]);

  const visibleDots = accounts
    .filter((a) => activeAccounts.has(a.id))
    .slice(0, 3);

  function getGroupDisplayLabel(key: string): string {
    if (key === "today") return tInbox("groupToday");
    if (key === "thisWeek") return tInbox("groupThisWeek");
    if (key === "thisMonth") return tInbox("groupThisMonth");
    return key;
  }

  function handleDecision(id: string, decision: "approved" | "blocked") {
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

  const mailboxFilter = (
    isMobile: boolean,
    open: boolean,
    setOpen: (v: boolean) => void,
  ) =>
    accounts.length > 0 ? (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 h-9 rounded-full border border-border",
              "text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm",
              isMobile && "h-11",
            )}
          >
            <span className="text-foreground/70">{tInbox("mailboxFilter")}</span>
            <div className="flex gap-1">
              {visibleDots.map((a) => (
                <div
                  key={a.id}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: safeColor(a.color) }}
                />
              ))}
              {activeAccounts.size > 3 && (
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              )}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("p-0", isMobile ? "w-[calc(100vw-20px)]" : "w-64")}
        >
          <MailboxFilterContent
            accounts={accounts}
            activeAccounts={activeAccounts}
            entryCounts={entryCounts}
            onToggle={toggleAccount}
            heading={tInbox("mailboxAccountsHeading")}
          />
        </PopoverContent>
      </Popover>
    ) : null;

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* ── Desktop top bar ── */}
        <div className="hidden md:flex mb-4 items-center justify-center">
          {mailboxFilter(false, filterOpenDesktop, setFilterOpenDesktop)}
        </div>

        {/* ── Mobile top bar ── */}
        <div className="md:hidden mb-4 flex items-center gap-2">
          <MobileMenuButton className="-ml-1 mr-auto" />
          {mailboxFilter(true, filterOpenMobile, setFilterOpenMobile)}
        </div>

        {/* ── Container ── */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">

          {/* Header */}
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <h2 className="text-2xl font-semibold text-foreground">{t("title")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("senderCount", { count: filtered.length })}
            </span>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 px-4">
              <p className="text-sm text-muted-foreground text-center">{t("empty")}</p>
            </div>
          )}

          {/* Date-grouped entry list */}
          <div className="flex flex-col px-[10px] md:px-4">
            {grouped.map(({ key, entries: groupEntries }) => (
              <div key={key}>
                <GroupDivider label={getGroupDisplayLabel(key)} />
                <div className="flex flex-col gap-[4px] mb-2">
                  {groupEntries.map((entry) => (
                    <GatekeeperRow
                      key={entry.id}
                      entry={entry}
                      locale={locale}
                      onDecision={handleDecision}
                      isPending={pendingIds.has(entry.id)}
                    />
                  ))}
                </div>
              </div>
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
