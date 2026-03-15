"use client";

import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SnoozedCard, type SnoozedEmail } from "./snoozed-card";
import { SearchCommand } from "@/app/(app)/inbox/_components/search-command";
import { useTranslations } from "next-intl";
import { safeColor } from "@/lib/email-display";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";

interface MailAccountFilter {
  id: string;
  name: string;
  color: string;
}

interface SnoozedViewProps {
  emails: SnoozedEmail[];
  accounts: MailAccountFilter[];
  locale: string;
  total: number;
}

function MailboxFilterContent({
  accounts,
  activeAccounts,
  emailCounts,
  onToggle,
  heading,
}: {
  accounts: MailAccountFilter[];
  activeAccounts: Set<string>;
  emailCounts: Map<string, number>;
  onToggle: (id: string) => void;
  heading: string;
}) {
  return (
    <div className="space-y-1 p-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
        {heading}
      </h3>
      {accounts.map((account) => {
        const active = activeAccounts.has(account.id);
        const color = safeColor(account.color);
        const ct = emailCounts.get(account.id) ?? 0;
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
            {ct > 0 && (
              <span className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded">
                {ct}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SnoozedView({
  emails: initialEmails,
  accounts,
  locale,
  total,
}: SnoozedViewProps) {
  const t = useTranslations("pages.snoozed");
  const tInbox = useTranslations("pages.inbox");

  const [entries, setEntries] = useState(initialEmails);
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

  const emailCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const email of entries) {
      map.set(email.mailAccountId, (map.get(email.mailAccountId) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!allSelected && !activeAccounts.has(e.mailAccountId)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (e.fromName ?? "").toLowerCase().includes(q) ||
        e.fromAddress.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q)
      );
    });
  }, [entries, activeAccounts, allSelected, searchQuery]);

  const visibleDots = accounts
    .filter((a) => activeAccounts.has(a.id))
    .slice(0, 3);

  function handleUnsnoozed(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* -- Desktop top bar -- */}
        <div className="hidden md:block mb-4">
          <div className="relative flex items-center justify-between h-9">
            <div />
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
                      emailCounts={emailCounts}
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
            <div />
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
                    emailCounts={emailCounts}
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

        {/* -- Snoozed list container -- */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <h2 className="text-2xl font-semibold text-foreground">
              {t("title")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("messageCount", { count: filtered.length })}
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 px-4">
              <p className="text-sm text-muted-foreground text-center">{t("empty")}</p>
            </div>
          )}

          <div className="flex flex-col gap-[4px] px-[10px] md:px-4">
            {filtered.map((email) => (
              <SnoozedCard
                key={email.id}
                email={email}
                locale={locale}
                noSubjectLabel={t("noSubject")}
                noSenderLabel={t("noSender")}
                onUnsnoozed={handleUnsnoozed}
              />
            ))}
          </div>

          {total > initialEmails.length && (
            <p className="text-xs text-muted-foreground text-center py-3 mt-1">
              {t("showingOf", { shown: initialEmails.length, total })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
