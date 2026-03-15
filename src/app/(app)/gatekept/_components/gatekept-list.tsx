"use client";

import { useState, useMemo, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MobileMenuButton } from "@/app/(app)/_components/mobile-nav-context";
import { GatekeptCard } from "./gatekept-card";
import { updateSenderRuleDecision, deleteSenderRule } from "../_actions/rules";
import type { SerializedSenderRule } from "../page";

type DecisionFilter = "all" | "approved" | "feed" | "paper_trail" | "blocked";

interface GatekeptListProps {
  rules: SerializedSenderRule[];
  total: number;
  locale: string;
}

const DECISION_ORDER: DecisionFilter[] = ["approved", "feed", "paper_trail", "blocked"];

const FILTER_KEYS: DecisionFilter[] = ["all", "approved", "feed", "paper_trail", "blocked"];

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
// Main component
// ---------------------------------------------------------------------------

export function GatekeptList({ rules, total, locale }: GatekeptListProps) {
  const t = useTranslations("pages.gatekept");

  const [entries, setEntries] = useState(rules);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<DecisionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Counts per decision type
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const rule of entries) {
      map[rule.decision] = (map[rule.decision] ?? 0) + 1;
    }
    return map;
  }, [entries]);

  // Search + filter
  const filtered = useMemo(() => {
    let result = entries;
    if (activeFilter !== "all") {
      result = result.filter((r) => r.decision === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.displayName?.toLowerCase().includes(q) ||
          r.fromAddress?.toLowerCase().includes(q) ||
          r.fromDomain?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, activeFilter, searchQuery]);

  // Group by decision when showing "all"
  const grouped = useMemo(() => {
    if (activeFilter !== "all") return null;
    const groups = new Map<string, SerializedSenderRule[]>();
    for (const rule of filtered) {
      const list = groups.get(rule.decision) ?? [];
      list.push(rule);
      groups.set(rule.decision, list);
    }
    return DECISION_ORDER
      .filter((d) => groups.has(d))
      .map((d) => ({ decision: d, rules: groups.get(d)! }));
  }, [filtered, activeFilter]);

  function filterLabel(key: DecisionFilter): string {
    switch (key) {
      case "all": return t("filterAll");
      case "approved": return t("filterApproved");
      case "feed": return t("filterFeed");
      case "paper_trail": return t("filterPaperTrail");
      case "blocked": return t("filterBlocked");
    }
  }

  const groupLabel = (decision: string): string => {
    const map: Record<string, string> = {
      approved: t("groupApproved"),
      feed: t("groupFeed"),
      paper_trail: t("groupPaperTrail"),
      blocked: t("groupBlocked"),
    };
    return map[decision] ?? decision;
  };

  function handleChangeDecision(ruleId: string, newDecision: string) {
    setPendingIds((prev) => new Set([...prev, ruleId]));
    startTransition(async () => {
      try {
        const result = await updateSenderRuleDecision(
          ruleId,
          newDecision as "approved" | "blocked" | "feed" | "paper_trail",
        );
        if (result.success) {
          setEntries((prev) =>
            prev.map((r) => (r.id === ruleId ? { ...r, decision: newDecision } : r)),
          );
        } else {
          toast.error(t("actionFailed"));
        }
      } catch {
        toast.error(t("actionFailed"));
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(ruleId);
          return next;
        });
      }
    });
  }

  function handleDelete(ruleId: string) {
    setPendingIds((prev) => new Set([...prev, ruleId]));
    startTransition(async () => {
      try {
        const result = await deleteSenderRule(ruleId);
        if (result.success) {
          setEntries((prev) => prev.filter((r) => r.id !== ruleId));
        } else {
          toast.error(t("actionFailed"));
        }
      } catch {
        toast.error(t("actionFailed"));
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(ruleId);
          return next;
        });
      }
    });
  }

  function renderRuleCard(rule: SerializedSenderRule) {
    return (
      <div
        key={rule.id}
        className={cn(
          pendingIds.has(rule.id) && "opacity-40 pointer-events-none",
        )}
      >
        <GatekeptCard
          rule={rule}
          locale={locale}
          onChangeDecision={(newDecision) => handleChangeDecision(rule.id, newDecision)}
          onDelete={() => handleDelete(rule.id)}
        />
      </div>
    );
  }

  return (
    <div className="px-[10px] py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">

        {/* ── Desktop top bar ── */}
        <div className="hidden md:block mb-4">
          <div className="flex items-center justify-between h-9">
            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {FILTER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-colors",
                    activeFilter === key
                      ? "bg-zinc-800 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50",
                  )}
                >
                  {filterLabel(key)}
                  {key !== "all" && counts[key] ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">{counts[key]}</span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-9 w-48 rounded-full border border-border bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* ── Mobile top bar ── */}
        <div className="md:hidden mb-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <MobileMenuButton className="-ml-1 mr-auto" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 w-40 rounded-full border border-border bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          {/* Scrollable filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-[10px] px-[10px] scrollbar-none">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  "px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors shrink-0 min-h-[44px]",
                  activeFilter === key
                    ? "bg-zinc-800 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50",
                )}
              >
                {filterLabel(key)}
                {key !== "all" && counts[key] ? (
                  <span className="ml-1.5 text-xs text-muted-foreground">{counts[key]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* ── Rule list container ── */}
        <div className="bg-background md:border md:border-border md:rounded-2xl py-2">

          {/* Container header */}
          <div className="flex items-center justify-between px-[10px] md:px-4 py-3 mb-1">
            <h2 className="text-2xl font-semibold text-foreground">
              {t("title")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("ruleCount", { count: filtered.length })}
            </span>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 px-4">
              <p className="text-sm text-muted-foreground text-center">{t("empty")}</p>
            </div>
          )}

          {/* Rule list */}
          <div className="flex flex-col px-[10px] md:px-4">
            {grouped
              ? grouped.map(({ decision, rules: groupRules }) => (
                  <div key={decision}>
                    <GroupDivider label={groupLabel(decision)} />
                    <div className="flex flex-col gap-[4px] mb-2">
                      {groupRules.map(renderRuleCard)}
                    </div>
                  </div>
                ))
              : <div className="flex flex-col gap-[4px] mb-2">
                  {filtered.map(renderRuleCard)}
                </div>
            }
          </div>

          {/* Showing X of Y footer */}
          {total > rules.length && (
            <p className="text-xs text-muted-foreground text-center py-3 mt-1">
              Showing {rules.length} of {total}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
