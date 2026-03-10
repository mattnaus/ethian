import { EmailRow, type InboxEmail } from "./email-row";

interface EmailListProps {
  emails: InboxEmail[];
  emptyMessage: string;
  showingMessage: string | null; // "Showing 100 of 347" — null when all shown
  locale: string;
}

export function EmailList({ emails, emptyMessage, showingMessage, locale }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div>
        {emails.map((email) => (
          <EmailRow key={email.id} email={email} locale={locale} />
        ))}
      </div>
      {showingMessage && (
        <p className="text-xs text-zinc-600 text-center py-3 border-t border-zinc-800/50 shrink-0">
          {showingMessage}
        </p>
      )}
    </div>
  );
}
