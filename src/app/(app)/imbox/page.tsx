import type { Metadata } from "next";

export const metadata: Metadata = { title: "Imbox" };

export default function ImboxPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-base font-semibold text-zinc-100">Imbox</h1>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-zinc-500">
          Your Imbox is empty. Add a mail account in Settings to get started.
        </p>
      </div>
    </div>
  );
}
