"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DraftCard, type DraftEmail } from "./draft-card";
import { SearchCommand } from "@/app/(app)/inbox/_components/search-command";
import { useTranslations } from "next-intl";
import { safeColor } from "@/lib/email-display";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";

interface MailAccountFilter {
  id: string;
  name: string;
  color: string;
}

interface DraftsViewProps {
  drafts: DraftEmail[];
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

function groupDrafts(drafts: DraftEmail[]): { key: string; drafts: DraftEmail[] }[] {
  const groups = new Map<string, DraftEmail[]>();
  const order: string[] = [];
  for (const draft of drafts) {
    const key = getGroupLabel(new Date(draft.updatedAt));
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(draft);
  }
  return order.map((key) => ({ key, drafts: groups.get(key)! }));
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
  draftCounts: Map<string, number>;
  onToggle: (id: string) => void;
  heading: string;
}

function MailboxFilterContent({
  accounts,
  activeAccounts,
  draftCounts,
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
        const count = draftCounts.get(account.id) ?? 0;
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

export function DraftsView({
  drafts,
  accounts,
  locale,
  total,
}: DraftsViewProps) {
  const t = useTranslations("pages.drafts");
  const tInbox = useTranslations("pages.inbox");
  const router = useRouter();

  const [activeAccounts, setActiveAccounts] = useState<Set<string>>(
    new Set(accounts.map((a) => a.id)),
  );
  const [filterOpenDesktop, setFilterOpenDesktop] = useState(false);
  const [filterOpenMobile, setFilterOpenMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);

  function toggleAccount(id: string) {
    setActiveAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = activeAccounts.size === accounts.length;

  // Draft counts per account
  const draftCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const draft of drafts) {
      map.set(draft.mailAccountId, (map.get(draft.mailAccountId) ?? 0) + 1);
    }
    return map;
  }, [drafts]);

  const filtered = useMemo(() => {
    return drafts.filter((d) => {
      if (!allSelected && !activeAccounts.has(d.mailAccountId)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const recipients = d.toAddresses
        .map((r) => `${r.name ?? ""} ${r.address}`)
        .join(" ")
        .toLowerCase();
      return (
        recipients.includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.snippet.toLowerCase().includes(q)
      );
    });
  }, [drafts, activeAccounts, allSelected, searchQuery]);

  const grouped = useMemo(() => groupDrafts(filtered), [filtered]);

  // Dots shown in the filter button (up to 3)
  const visibleDots = accounts
    .filter((a) => activeAccounts.has(a.id))
    .slice(0, 3);

  function getGroupDisplayLabel(key: string): string {
    if (key === "today") return tInbox("groupToday");
    if (key === "thisWeek") return tInbox("groupThisWeek");
    if (key === "thisMonth") return tInbox("groupThisMonth");
    return key;
  }

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* -- Desktop top bar -- */}
        <div className="hidden md:block mb-4">
          <div className="relative flex items-center justify-between">
            {/* Left: spacer */}
            <div />

            {/* Center: Mailbox filter + Search */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {accounts.length > 0 && (
                <Popover open={filterOpenDesktop} onOpenChange={setFilterOpenDesktop}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm">
                      {!searchExpanded && (
                        <span className="text-foreground/70">{tInbox("mailboxFilter")}</span>
                      )}
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
                      draftCounts={draftCounts}
                      onToggle={toggleAccount}
                      heading={tInbox("mailboxAccountsHeading")}
                    />
                  </PopoverContent>
                </Popover>
              )}
              <SearchCommand
                value={searchQuery}
                onChange={setSearchQuery}
                onExpandChange={setSearchExpanded}
                placeholder={t("searchPlaceholder")}
              />
            </div>

            {/* Right: New */}
            <Button
              onClick={() => router.push("/compose")}
              className="gap-2 rounded-full px-4 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <PenLine className="h-4 w-4" />
              {tInbox("newButton")}
            </Button>
          </div>
        </div>

        {/* -- Mobile top bar -- */}
        <div className="md:hidden mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <MobileMenuButton className="-ml-1 mr-auto" />
            {accounts.length > 0 && (
              <Popover open={filterOpenMobile} onOpenChange={setFilterOpenMobile}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 h-11 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    {!searchExpanded && (
                      <span className="text-sm text-foreground/70">{tInbox("mailboxFilter")}</span>
                    )}
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
                    draftCounts={draftCounts}
                    onToggle={toggleAccount}
                    heading={tInbox("mailboxAccountsHeading")}
                  />
                </PopoverContent>
              </Popover>
            )}
            <SearchCommand
              value={searchQuery}
              onChange={setSearchQuery}
              onExpandChange={setSearchExpanded}
              placeholder={t("searchPlaceholder")}
            />
          </div>
        </div>

        {/* -- Draft list container -- */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">

          {/* Container header */}
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <h2 className="text-2xl font-semibold text-foreground">
              {t("title")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("draftCount", { count: filtered.length })}
            </span>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 px-4">
              <p className="text-sm text-muted-foreground text-center">{t("empty")}</p>
            </div>
          )}

          {/* Date-grouped draft list */}
          <div className="flex flex-col px-[10px] md:px-4">
            {grouped.map(({ key, drafts: groupDrafts }) => (
              <div key={key}>
                <GroupDivider label={getGroupDisplayLabel(key)} />
                <div className="flex flex-col gap-[4px] mb-2">
                  {groupDrafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      locale={locale}
                      noSubjectLabel={t("noSubject")}
                      noRecipientLabel={t("noRecipient")}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Showing X of Y footer */}
          {total > drafts.length && (
            <p className="text-xs text-muted-foreground text-center py-3 mt-1">
              {t("showingOf", { shown: drafts.length, total })}
            </p>
          )}
        </div>

        {/* Mobile FAB — Compose */}
        <div className="md:hidden fixed bottom-6 right-4 z-50">
          <Button
            onClick={() => router.push("/compose")}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg flex items-center justify-center p-0"
          >
            <PenLine className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </div>
  );
}
