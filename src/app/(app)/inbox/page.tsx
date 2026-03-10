import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 items-center border-b border-zinc-800 px-6 shrink-0">
        <h1 className="text-base font-semibold text-zinc-100">Inbox</h1>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">
          Your inbox is empty. Add a mail account in Settings to get started.
        </p>
      </div>
    </div>
  );
}
