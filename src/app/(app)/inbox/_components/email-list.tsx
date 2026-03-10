import { EmailRow, type InboxEmail } from "./email-row";

interface EmailListProps {
  emails: InboxEmail[];
  emptyMessage: string;
}

export function EmailList({ emails, emptyMessage }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {emails.map((email) => (
        <EmailRow key={email.id} email={email} />
      ))}
    </div>
  );
}
