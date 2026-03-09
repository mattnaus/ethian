"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Rss,
  Receipt,
  ShieldQuestion,
  BookmarkCheck,
  Reply,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/imbox", label: "Imbox", icon: Inbox },
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/paper-trail", label: "Paper Trail", icon: Receipt },
  { href: "/screener", label: "Screener", icon: ShieldQuestion },
  { href: "/set-aside", label: "Set Aside", icon: BookmarkCheck },
  { href: "/reply-later", label: "Reply Later", icon: Reply },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-12 items-center px-4 border-b border-zinc-800">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">
          Ethian
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-orange-500/10 text-orange-500"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-orange-500" : "text-zinc-500"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings */}
      <div className="border-t border-zinc-800 p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            pathname === "/settings" || pathname.startsWith("/settings/")
              ? "bg-orange-500/10 text-orange-500"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
          )}
        >
          <Settings
            className={cn(
              "h-4 w-4 shrink-0",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "text-orange-500"
                : "text-zinc-500"
            )}
          />
          Settings
        </Link>
      </div>
    </aside>
  );
}
