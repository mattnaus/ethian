"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Bookmark,
  Clock,
  Send,
  Trash2,
  ShieldQuestion,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/imbox", label: "Inbox", icon: Inbox },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/snoozed", label: "Snoozed", icon: Clock },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/trash", label: "Trash", icon: Trash2 },
  { href: "/screener", label: "Screener", icon: ShieldQuestion, dividerBefore: true },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "flex items-center justify-center rounded-md px-3 py-2 transition-colors",
            active
              ? "bg-zinc-900 text-orange-500"
              : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-screen w-14 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Logo mark */}
        <div className="flex h-12 items-center justify-center border-b border-zinc-800">
          <span className="text-sm font-bold text-orange-500">E</span>
        </div>

        {/* Main nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
          {NAV_ITEMS.map(({ href, label, icon, dividerBefore }) => (
            <div key={href}>
              {dividerBefore && <Separator className="my-2 bg-zinc-800" />}
              <NavItem href={href} label={label} icon={icon} />
            </div>
          ))}
        </nav>

        {/* Bottom: Settings */}
        <div className="border-t border-zinc-800 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center justify-center rounded-md px-3 py-2 transition-colors",
                  settingsActive
                    ? "bg-zinc-900 text-orange-500"
                    : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
