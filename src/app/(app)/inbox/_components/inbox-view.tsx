"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PenLine,
  ShieldCheck,
  ChevronDown,
  Inbox,
  Newspaper,
  FileText,
  ShieldAlert,
  Clock,
  Reply,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmailCard, type InboxEmail } from "./email-card";
import { SearchCommand } from "./search-command";
import { useTranslations } from "next-intl";
import { safeColor } from "@/lib/email-display";

interface MailAccountFilter {
  id: string;
  name: string;
  color: string;
}

interface InboxViewProps {
  emails: InboxEmail[];
  accounts: MailAccountFilter[];
  screenerCount: number;
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

function groupEmails(emails: InboxEmail[]): { key: string; emails: InboxEmail[] }[] {
  const groups = new Map<string, InboxEmail[]>();
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
// Folder config
// ---------------------------------------------------------------------------

const FOLDERS = [
  { id: "inbox", href: "/inbox", icon: Inbox },
  { id: "feed", href: "/feed", icon: Newspaper },
  { id: "paperTrail", href: "/paper-trail", icon: FileText },
  { id: "gatekeeper", href: "/gatekeeper", icon: ShieldAlert },
  { id: "setAside", href: "/saved", icon: Clock },
  { id: "replyLater", href: "/snoozed", icon: Reply },
] as const;

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
// Folder switcher content
// ---------------------------------------------------------------------------

interface FolderSwitcherContentProps {
  onNavigate: (href: string) => void;
  getLabel: (id: string) => string;
}

function FolderSwitcherContent({ onNavigate, getLabel }: FolderSwitcherContentProps) {
  return (
    <>
      {FOLDERS.map(({ id, href, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(href)}
          className={cn(
            "w-full flex items-center gap-3 px-4 md:px-3 py-3.5 md:py-2.5 rounded-lg transition-colors text-base md:text-sm",
            id === "inbox"
              ? "bg-secondary text-foreground font-semibold"
              : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground",
          )}
        >
          <Icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
          {getLabel(id)}
        </button>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InboxView({
  emails,
  accounts,
  screenerCount,
  locale,
  total,
}: InboxViewProps) {
  const t = useTranslations("pages.inbox");
  const router = useRouter();

  const [activeAccounts, setActiveAccounts] = useState<Set<string>>(
    new Set(accounts.map((a) => a.id)),
  );
  const [filterOpenDesktop, setFilterOpenDesktop] = useState(false);
  const [filterOpenMobile, setFilterOpenMobile] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
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

  // Email counts per account (from full emails list, not filtered)
  const emailCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const email of emails) {
      map.set(email.mailAccountId, (map.get(email.mailAccountId) ?? 0) + 1);
    }
    return map;
  }, [emails]);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
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
  }, [emails, activeAccounts, allSelected, searchQuery]);

  const grouped = useMemo(() => groupEmails(filtered), [filtered]);

  // Dots shown in the filter button (up to 3)
  const visibleDots = accounts
    .filter((a) => activeAccounts.has(a.id))
    .slice(0, 3);

  function getGroupDisplayLabel(key: string): string {
    if (key === "today") return t("groupToday");
    if (key === "thisWeek") return t("groupThisWeek");
    if (key === "thisMonth") return t("groupThisMonth");
    return key; // month/year string from toLocaleString
  }

  function handleFolderNavigate(href: string) {
    setFolderOpen(false);
    router.push(href);
  }

  function getFolderLabel(id: string) {
    return t(`folders.${id as "inbox" | "feed" | "paperTrail" | "gatekeeper" | "setAside" | "replyLater"}`);
  }

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* ── Desktop top bar ── */}
        <div className="hidden md:block mb-4">
          <div className="relative flex items-center justify-between">
            {/* Left: Gatekeeper */}
            {screenerCount > 0 && (
              <button
                onClick={() => router.push("/gatekeeper")}
                className="flex items-center gap-1.5 px-4 py-1.5 h-9 rounded-full bg-slate-600 text-white hover:bg-slate-500 transition-colors text-sm font-medium"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t("gatekeeperLabel")}</span>
                <span className="bg-white/20 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {screenerCount}
                </span>
                <span>{t("gatekeeperSuffix", { count: screenerCount })}</span>
              </button>
            )}
            {screenerCount === 0 && <div />}

            {/* Center: Mailbox filter + Search */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              {accounts.length > 0 && (
                <Popover open={filterOpenDesktop} onOpenChange={setFilterOpenDesktop}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm">
                      {!searchExpanded && (
                        <span className="text-xs">{t("mailboxFilter")}</span>
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
                      heading={t("mailboxAccountsHeading")}
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
            <Button className="gap-2 rounded-full px-4 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
              <PenLine className="h-4 w-4" />
              {t("newButton")}
            </Button>
          </div>
        </div>

        {/* ── Mobile top bar ── */}
        <div className="md:hidden mb-4 flex flex-col gap-2">
          {screenerCount > 0 && (
            <button
              onClick={() => router.push("/gatekeeper")}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 h-11 rounded-full bg-slate-600 text-white hover:bg-slate-500 transition-colors text-sm font-medium"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{t("gatekeeperLabel")}</span>
              <span className="bg-white/20 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                {screenerCount}
              </span>
              <span>{t("gatekeeperButton", { count: screenerCount })}</span>
            </button>
          )}
          <div className="flex items-center justify-center gap-2">
            {accounts.length > 0 && (
              <Popover open={filterOpenMobile} onOpenChange={setFilterOpenMobile}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 h-11 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                    {!searchExpanded && (
                      <span className="text-sm">{t("mailboxFilter")}</span>
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
                    heading={t("mailboxAccountsHeading")}
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

        {/* ── Email list container ── */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">

          {/* Container header */}
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <Popover open={folderOpen} onOpenChange={setFolderOpen}>
              <PopoverTrigger asChild>
                <button className="group flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {t("title")}
                  </h2>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-200",
                      folderOpen && "rotate-180",
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-20px)] md:w-52 p-2 md:p-1.5"
                align="start"
              >
                <FolderSwitcherContent
                  onNavigate={handleFolderNavigate}
                  getLabel={getFolderLabel}
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">
              {t("messageCount", { count: filtered.length })}
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
                    <EmailCard key={email.id} email={email} locale={locale} />
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

        {/* Mobile FAB — Compose */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg flex items-center justify-center p-0">
            <PenLine className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </div>
  );
}
