"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
      ? "bg-zinc-900 text-primary"
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
// Sidebar (desktop rail only — mobile uses the MobileNavProvider drawer)
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-expanded") === "true";
  });

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-expanded", String(next));
      return next;
    });
  }

  const navItems = [
    { href: "/inbox", label: t("inbox"), icon: Inbox },
    { href: "/saved", label: t("saved"), icon: Bookmark },
    { href: "/snoozed", label: t("snoozed"), icon: Clock },
    { href: "/sent", label: t("sent"), icon: Send },
    { href: "/trash", label: t("trash"), icon: Trash2 },
    { href: "/gatekeeper", label: t("gatekeeper"), icon: ShieldQuestion, dividerBefore: true },
  ];

  const settingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  const settingsLinkClass = cn(
    "flex items-center rounded-md px-3 py-2 transition-colors w-full",
    expanded ? "gap-3" : "justify-center",
    settingsActive
      ? "bg-zinc-900 text-primary"
      : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
  );

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
          <span className="text-sm font-bold text-primary">
            {expanded ? t("brandName") : t("brandName").charAt(0)}
          </span>
          {expanded && (
            <button
              type="button"
              onClick={toggle}
              aria-label={t("collapseSidebar")}
              className="flex items-center justify-center rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3 overflow-hidden">
          {navItems.map(({ href, label, icon, dividerBefore }) => (
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

          {/* Expand toggle — only shown in thin mode */}
          {!expanded && (
            <>
              <Separator className="my-2 bg-zinc-800" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={t("expandSidebar")}
                    className="flex items-center justify-center rounded-md px-3 py-2 w-full transition-colors text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                  >
                    <PanelLeftOpen className="h-5 w-5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {t("expand")}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </nav>

        {/* Bottom: Settings */}
        <div className="border-t border-zinc-800 p-2 shrink-0">
          {expanded ? (
            <Link href="/settings" className={settingsLinkClass}>
              <Settings className="h-5 w-5 shrink-0" />
              <span className="text-sm truncate">{t("settings")}</span>
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings" className={settingsLinkClass}>
                  <Settings className="h-5 w-5 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {t("settings")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
