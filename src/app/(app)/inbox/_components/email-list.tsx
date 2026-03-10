import { EmailRow, type InboxEmail } from "./email-row";

interface EmailListProps {
  emails: InboxEmail[];
  emptyMessage: string;
  showingMessage: string | null;
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
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 md:px-10 py-4">
        <div className="flex flex-col gap-0.5">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} locale={locale} />
          ))}
        </div>
        {showingMessage && (
          <p className="text-xs text-zinc-600 text-center pt-3 mt-0.5">
            {showingMessage}
          </p>
        )}
      </div>
    </div>
  );
}
