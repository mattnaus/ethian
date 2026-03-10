"use client";

import { useState, useEffect } from "react";
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
  PanelLeftOpen,
  PanelLeftClose,
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

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

// ---------------------------------------------------------------------------
// Desktop nav item — adapts to thin / wide mode
// ---------------------------------------------------------------------------

function DesktopNavItem({
  href,
  label,
  icon: Icon,
  expanded,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  expanded: boolean;
}) {
  const active = useIsActive(href);

  const linkClass = cn(
    "flex items-center rounded-md px-3 py-2 transition-colors w-full",
    expanded ? "gap-3" : "justify-center",
    active
      ? "bg-zinc-900 text-orange-500"
      : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
  );

  if (expanded) {
    return (
      <Link href={href} className={linkClass}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} className={linkClass}>
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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-expanded");
    if (stored !== null) setExpanded(stored === "true");
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-expanded", String(next));
      return next;
    });
  }

  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  const settingsLinkClass = cn(
    "flex items-center rounded-md px-3 py-2 transition-colors w-full",
    expanded ? "gap-3" : "justify-center",
    settingsActive
      ? "bg-zinc-900 text-orange-500"
      : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
  );

  const mobileItems = [
    { href: "/imbox", label: "Inbox", icon: Inbox },
    { href: "/screener", label: "Screener", icon: ShieldQuestion },
    { href: "/sent", label: "Sent", icon: Send },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      {/* ── Desktop: sidebar (hidden on mobile) ── */}
      <aside
        className={cn(
          "hidden md:flex h-screen shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden",
          "transition-[width] duration-200 ease-in-out",
          expanded ? "w-56" : "w-14"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-12 shrink-0 items-center border-b border-zinc-800",
            expanded ? "px-3 justify-between" : "justify-center"
          )}
        >
          <span className="text-sm font-bold text-orange-500">
            {expanded ? "Ethian" : "E"}
          </span>
          {expanded && (
            <button
              onClick={toggle}
              aria-label="Collapse sidebar"
              className="flex items-center justify-center rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3 overflow-hidden">
          {NAV_ITEMS.map(({ href, label, icon, dividerBefore }) => (
            <div key={href}>
              {dividerBefore && <Separator className="my-2 bg-zinc-800" />}
              <DesktopNavItem
                href={href}
                label={label}
                icon={icon}
                expanded={expanded}
              />
            </div>
          ))}

          {/* Sidebar toggle — below Screener */}
          <Separator className="my-2 bg-zinc-800" />
          {expanded ? (
            <button
              onClick={toggle}
              className="flex items-center gap-3 rounded-md px-3 py-2 w-full transition-colors text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
            >
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="text-sm whitespace-nowrap">Collapse</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  aria-label="Expand sidebar"
                  className="flex items-center justify-center rounded-md px-3 py-2 w-full transition-colors text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                >
                  <PanelLeftOpen className="h-5 w-5 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand
              </TooltipContent>
            </Tooltip>
          )}
        </nav>

        {/* Bottom: Settings */}
        <div className="border-t border-zinc-800 p-2 shrink-0">
          {expanded ? (
            <Link href="/settings" className={settingsLinkClass}>
              <Settings className="h-5 w-5 shrink-0" />
              <span className="text-sm truncate">Settings</span>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings" className={settingsLinkClass}>
                  <Settings className="h-5 w-5 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Settings
              </TooltipContent>
            </Tooltip>
          )}
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
