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

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: React.ElementType;
  dividerBefore?: boolean;
}> = [
  { href: "/imbox", label: "Inbox", icon: Inbox },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/snoozed", label: "Snoozed", icon: Clock },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/trash", label: "Trash", icon: Trash2 },
  { href: "/screener", label: "Screener", icon: ShieldQuestion, dividerBefore: true },
];

// Items shown in the mobile bottom tab bar (subset — most important ones)
const MOBILE_TAB_ITEMS = NAV_ITEMS.filter(({ href }) =>
  ["/imbox", "/screener", "/sent", "/settings"].includes(href)
).concat([{ href: "/settings", label: "Settings", icon: Settings }]);

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

// ---------------------------------------------------------------------------
// Desktop rail nav item
// ---------------------------------------------------------------------------

function RailNavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  const active = useIsActive(href);

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

// ---------------------------------------------------------------------------
// Mobile bottom tab item
// ---------------------------------------------------------------------------

function TabItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  const active = useIsActive(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 min-h-11 transition-colors",
        active ? "text-orange-500" : "text-zinc-500"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-[10px] leading-none">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar (desktop rail + mobile bottom tab bar)
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  // Mobile tab items: Inbox, Screener, Sent, Settings
  const mobileItems = [
    { href: "/imbox", label: "Inbox", icon: Inbox },
    { href: "/screener", label: "Screener", icon: ShieldQuestion },
    { href: "/sent", label: "Sent", icon: Send },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      {/* ── Desktop: icon-only rail (hidden on mobile) ── */}
      <aside className="hidden md:flex h-screen w-14 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Logo mark */}
        <div className="flex h-12 items-center justify-center border-b border-zinc-800">
          <span className="text-sm font-bold text-orange-500">E</span>
        </div>

        {/* Main nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
          {NAV_ITEMS.map(({ href, label, icon, dividerBefore }) => (
            <div key={href}>
              {dividerBefore && <Separator className="my-2 bg-zinc-800" />}
              <RailNavItem href={href} label={label} icon={icon} />
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

      {/* ── Mobile: bottom tab bar (hidden on desktop) ── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex md:hidden border-t border-zinc-800 bg-zinc-950"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileItems.map(({ href, label, icon }) => (
          <TabItem key={href} href={href} label={label} icon={icon} />
        ))}
      </nav>
    </TooltipProvider>
  );
}
