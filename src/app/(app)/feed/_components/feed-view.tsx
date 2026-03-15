"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { SectionListView, type MailAccountFilter } from "@/app/(app)/_components/section-list-view";
import { FeedCard, type FeedEmail } from "./feed-card";

interface FeedViewProps {
  emails: FeedEmail[];
  accounts: MailAccountFilter[];
  locale: string;
  total: number;
}

export function FeedView({ emails, accounts, locale, total }: FeedViewProps) {
  const t = useTranslations("pages.feed");

  const noSubject = t("noSubject");
  const noSender = t("noSender");

  const renderCard = useCallback(
    (email: FeedEmail, loc: string) => (
      <FeedCard
        email={email}
        locale={loc}
        noSubjectLabel={noSubject}
        noSenderLabel={noSender}
      />
    ),
    [noSubject, noSender],
  );

  const searchFilter = useCallback((e: FeedEmail, q: string) => {
    return (
      (e.fromName ?? "").toLowerCase().includes(q) ||
      e.fromAddress.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q)
    );
  }, []);

  return (
    <SectionListView
      emails={emails}
      accounts={accounts}
      locale={locale}
      total={total}
      labels={{
        title: t("title"),
        empty: t("empty"),
        searchPlaceholder: t("searchPlaceholder"),
        showingOf: t("showingOf", { shown: emails.length, total }),
        count: t("messageCount", { count: emails.length }),
      }}
      renderCard={renderCard}
      searchFilter={searchFilter}
    />
  );
}
