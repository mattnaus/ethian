"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Menu,
  X,
  Inbox,
  Bookmark,
  Clock,
  Send,
  Trash2,
  ShieldCheck,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type MobileNavContextValue = {
  open: () => void;
  close: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue>({
  open: () => {},
  close: () => {},
});

function useMobileNav() {
  return useContext(MobileNavContext);
}

// ---------------------------------------------------------------------------
// Drawer nav item
// ---------------------------------------------------------------------------

function DrawerNavItem({
  href,
  label,
  icon: Icon,
  onClose,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors w-full",
        active
          ? "bg-zinc-900 text-primary"
          : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Provider (renders the drawer overlay as a sibling to children)
// ---------------------------------------------------------------------------

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");
  const pathname = usePathname();

  // Close drawer on any route change (e.g. browser back/forward)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/inbox", label: t("inbox"), icon: Inbox },
    { href: "/drafts", label: t("drafts"), icon: FileText },
    { href: "/saved", label: t("saved"), icon: Bookmark },
    { href: "/snoozed", label: t("snoozed"), icon: Clock },
    { href: "/sent", label: t("sent"), icon: Send },
    { href: "/trash", label: t("trash"), icon: Trash2 },
    { href: "/gatekept", label: t("gatekept"), icon: ShieldCheck, dividerBefore: true },
  ];

  function open() {
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
  }

  // Pages that render their own MobileMenuButton inside the page header.
  // All other pages get the universal fixed button below.
  const hasOwnButton =
    pathname === "/inbox" ||
    pathname.startsWith("/inbox/") ||
    pathname === "/drafts" ||
    pathname.startsWith("/drafts/") ||
    pathname === "/gatekeeper" ||
    pathname.startsWith("/gatekeeper/") ||
    pathname === "/gatekept" ||
    pathname.startsWith("/gatekept/") ||
    pathname === "/sent" ||
    pathname.startsWith("/sent/") ||
    pathname === "/compose" ||
    pathname.startsWith("/compose/");

  return (
    <MobileNavContext.Provider value={{ open, close }}>
      {children}

      {/* Universal fixed hamburger — shown on pages without a built-in button */}
      {!hasOwnButton && (
        <button
          type="button"
          onClick={open}
          aria-label={t("openMenu")}
          className="fixed top-1.5 right-1.5 z-30 flex items-center justify-center min-w-11 min-h-11 rounded-full text-foreground hover:bg-secondary transition-colors md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-zinc-950 border-r border-zinc-800 transition-transform duration-200 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between px-3 border-b border-zinc-800">
          <span className="text-sm font-bold text-primary">{t("brandName")}</span>
          <button
            type="button"
            onClick={close}
            aria-label={t("closeMenu")}
            className="flex items-center justify-center min-w-11 min-h-11 rounded-md text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3 overflow-y-auto">
          {navItems.map(({ href, label, icon, dividerBefore }) => (
            <div key={href}>
              {dividerBefore && <Separator className="my-2 bg-zinc-800" />}
              <DrawerNavItem href={href} label={label} icon={icon} onClose={close} />
            </div>
          ))}
        </nav>

        {/* Footer: Settings */}
        <div
          className="border-t border-zinc-800 p-2 shrink-0"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <DrawerNavItem href="/settings" label={t("settings")} icon={Settings} onClose={close} />
        </div>
      </aside>
    </MobileNavContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hamburger button — import this into page headers
// ---------------------------------------------------------------------------

export function MobileMenuButton({ className }: { className?: string }) {
  const { open } = useMobileNav();
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t("openMenu")}
      className={cn(
        "flex items-center justify-center min-w-11 min-h-11 rounded-full text-foreground hover:bg-secondary transition-colors md:hidden shrink-0",
        className,
      )}
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
