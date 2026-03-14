"use client";

import { useState, useMemo, useTransition } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GatekeeperCard, type GatekeeperEmail } from "./gatekeeper-card";
import { useTranslations } from "next-intl";
import { safeColor } from "@/lib/email-display";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";
import { makeGatekeeperDecision } from "../_actions/decisions";

interface MailAccountFilter {
  id: string;
  name: string;
  color: string;
}

interface GatekeeperListProps {
  emails: GatekeeperEmail[];
  accounts: MailAccountFilter[];
  locale: string;
  total: number;
}

// ---------------------------------------------------------------------------
// Date grouping
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

function groupEmails(emails: GatekeeperEmail[]): { key: string; emails: GatekeeperEmail[] }[] {
  const groups = new Map<string, GatekeeperEmail[]>();
  const order: string[] = [];
  for (const email of emails) {
    const key = getGroupLabel(new Date(email.sentAt));
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(email);
  }
  return order.map((key) => ({ key, emails: groups.get(key)! }));
}

// ---------------------------------------------------------------------------
// GroupDivider
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
// Mailbox filter popover content
// ---------------------------------------------------------------------------

interface MailboxFilterContentProps {
  accounts: MailAccountFilter[];
  activeAccounts: Set<string>;
  emailCounts: Map<string, number>;
  onToggle: (id: string) => void;
  heading: string;
}

function MailboxFilterContent({
  accounts,
  activeAccounts,
  emailCounts,
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
        const count = emailCounts.get(account.id) ?? 0;
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
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
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
  emails,
  accounts,
  locale,
  total,
}: GatekeeperListProps) {
  const t = useTranslations("pages.gatekeeper");
  const tInbox = useTranslations("pages.inbox");

  const [entries, setEntries] = useState(emails);
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

  // Entry counts per account (from full entries list, not filtered)
  const emailCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const email of entries) {
      map.set(email.mailAccountId, (map.get(email.mailAccountId) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => allSelected || activeAccounts.has(e.mailAccountId));
  }, [entries, activeAccounts, allSelected]);

  const grouped = useMemo(() => groupEmails(filtered), [filtered]);

  // Dots shown in the filter button (up to 3)
  const visibleDots = accounts
    .filter((a) => activeAccounts.has(a.id))
    .slice(0, 3);

  function getGroupDisplayLabel(key: string): string {
    if (key === "today") return tInbox("groupToday");
    if (key === "thisWeek") return tInbox("groupThisWeek");
    if (key === "thisMonth") return tInbox("groupThisMonth");
    return key; // month/year string from toLocaleString
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

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* ── Desktop top bar ── */}
        <div className="hidden md:block mb-4">
          <div className="relative flex items-center justify-between">
            <div />

            {/* Center: Mailbox filter */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {accounts.length > 0 && (
                <Popover open={filterOpenDesktop} onOpenChange={setFilterOpenDesktop}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm">
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
                  <PopoverContent className="w-64 p-0">
                    <MailboxFilterContent
                      accounts={accounts}
                      activeAccounts={activeAccounts}
                      emailCounts={emailCounts}
                      onToggle={toggleAccount}
                      heading={tInbox("mailboxAccountsHeading")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div />
          </div>
        </div>

        {/* ── Mobile top bar ── */}
        <div className="md:hidden mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <MobileMenuButton className="-ml-1 mr-auto" />
            {accounts.length > 0 && (
              <Popover open={filterOpenMobile} onOpenChange={setFilterOpenMobile}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 h-11 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    <span className="text-sm text-foreground/70">{tInbox("mailboxFilter")}</span>
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
                <PopoverContent className="w-[calc(100vw-20px)] p-0">
                  <MailboxFilterContent
                    accounts={accounts}
                    activeAccounts={activeAccounts}
                    emailCounts={emailCounts}
                    onToggle={toggleAccount}
                    heading={tInbox("mailboxAccountsHeading")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* ── Email list container ── */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">

          {/* Container header */}
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <h2 className="text-2xl font-semibold text-foreground">
              {t("title")}
            </h2>
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

          {/* Date-grouped email list */}
          <div className="flex flex-col px-[10px] md:px-4">
            {grouped.map(({ key, emails: groupEmails }) => (
              <div key={key}>
                <GroupDivider label={getGroupDisplayLabel(key)} />
                <div className="flex flex-col gap-[4px] mb-2">
                  {groupEmails.map((email) => (
                    <div
                      key={email.id}
                      className={cn(
                        "flex items-stretch gap-2",
                        pendingIds.has(email.id) && "opacity-40 pointer-events-none",
                      )}
                    >
                      <GatekeeperCard email={email} locale={locale} />
                      <button
                        onClick={() => handleDecision(email.id, "approved")}
                        className="rounded-xl px-5 flex items-center justify-center bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/35 transition-colors text-sm font-medium"
                      >
                        {t("approve")}
                      </button>
                      <button
                        onClick={() => handleDecision(email.id, "blocked")}
                        className="rounded-xl px-5 flex items-center justify-center bg-red-600/20 text-red-400 hover:bg-red-600/35 transition-colors text-sm font-medium"
                      >
                        {t("block")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Showing X of Y footer */}
          {total > emails.length && (
            <p className="text-xs text-muted-foreground text-center py-3 mt-1">
              {t("showingOf", { shown: emails.length, total })}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
