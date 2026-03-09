import type { Metadata } from "next";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = { title: "Imbox" };

export default async function ImboxPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Imbox</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          Your Imbox is empty. Add a mail account in Settings to get started.
        </p>
      </main>
    </div>
  );
}
