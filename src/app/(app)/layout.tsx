import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "./_components/sidebar";
import { MobileNavProvider } from "./_components/mobile-nav-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </MobileNavProvider>
  );
}
