import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "./_components/sidebar";

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
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      {/* pb-16 on mobile reserves space for the fixed bottom tab bar */}
      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
