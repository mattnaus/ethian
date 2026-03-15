"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { SectionListView, type MailAccountFilter } from "@/app/(app)/_components/section-list-view";
import { TrashCard, type TrashEmail } from "./trash-card";

interface TrashViewProps {
  emails: TrashEmail[];
  accounts: MailAccountFilter[];
  locale: string;
  total: number;
}

export function TrashView({ emails: initialEmails, accounts, locale, total }: TrashViewProps) {
  const t = useTranslations("pages.trash");
  const [entries, setEntries] = useState(initialEmails);

  const noSubject = t("noSubject");
  const noSender = t("noSender");

  function handleRestored(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const renderCard = useCallback(
    (email: TrashEmail, loc: string) => (
      <TrashCard
        email={email}
        locale={loc}
        noSubjectLabel={noSubject}
        noSenderLabel={noSender}
        onRestored={handleRestored}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noSubject, noSender],
  );

  const searchFilter = useCallback((e: TrashEmail, q: string) => {
    return (
      (e.fromName ?? "").toLowerCase().includes(q) ||
      e.fromAddress.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q)
    );
  }, []);

  return (
    <SectionListView
      emails={entries}
      accounts={accounts}
      locale={locale}
      total={total}
      labels={{
        title: t("title"),
        empty: t("empty"),
        searchPlaceholder: t("searchPlaceholder"),
        showingOf: t("showingOf", { shown: entries.length, total }),
        count: t("messageCount", { count: entries.length }),
      }}
      renderCard={renderCard}
      searchFilter={searchFilter}
      showCompose={false}
    />
  );
}
