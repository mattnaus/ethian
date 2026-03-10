# Review: Collapsible Sidebar with Thin/Wide Toggle — `e921f38`

**Date:** 2026-03-10
**Commits reviewed:** `e921f38`
**Files reviewed:** `src/app/(app)/_components/sidebar.tsx`

---

## Summary

The implementation is clean and well-structured. The `DesktopNavItem` component correctly handles both thin and wide modes, `localStorage` persistence works, the mobile bottom tab bar is unchanged, and `safe-area-inset-bottom` is applied. There are no security, TypeScript, or critical correctness issues. Two meaningful concerns exist: a layout flash on first render from deferred localStorage hydration, and a duplicate toggle control (one in the header, one in the nav body) that adds visual noise without added value. Several minor issues are noted below, none blocking.

---

## Critical Issues

None.

---

## Warnings

### Layout flash on initial render (hydration mismatch risk)
**File:** `src/app/(app)/_components/sidebar.tsx:128–133`
**Problem:** `expanded` initialises to `false` synchronously, then the `useEffect` reads from `localStorage` and potentially sets it to `true`. On first paint the sidebar renders at `w-14`, then jumps to `w-56` after mount — even with the CSS transition, this is a perceptible flash. Worse, if the user had the sidebar expanded, the main content layout shifts on every page load. Because `Sidebar` is a Client Component inside a Server-rendered layout, this discrepancy cannot be eliminated by SSR, but it can be mitigated.
**Fix:** Use a lazy state initialiser instead of `useEffect`. Replace:
```ts
const [expanded, setExpanded] = useState(false);
useEffect(() => {
  const stored = localStorage.getItem("sidebar-expanded");
  if (stored !== null) setExpanded(stored === "true");
}, []);
```
with:
```ts
const [expanded, setExpanded] = useState<boolean>(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sidebar-expanded") === "true";
});
```
This reads localStorage synchronously during the first client render and eliminates the flash.

### Duplicate collapse control increases cognitive noise
**File:** `src/app/(app)/_components/sidebar.tsx:181–189, 208–231`
**Problem:** When expanded, there are two separate controls to collapse the sidebar: the `PanelLeftClose` button in the header (top-right) and the `PanelLeftClose` button in the nav body below the Screener divider. No other application in the design inspiration set (Linear, Superlist) duplicates toggle controls this way. The nav-body toggle is useful in thin mode (where there is no visible button at all in the header), but in wide mode the header button is sufficient. The nav-body expanded branch (`PanelLeftClose` + "Collapse" label) is redundant.
**Fix:** In wide mode, remove the nav-body "Collapse" button row and keep only the header `PanelLeftClose` button. The nav-body Tooltip-wrapped `PanelLeftOpen` button in thin mode remains as-is — that is necessary since the header only shows the "E" monogram in thin mode with no collapse affordance.

---

## Suggestions

### NAV_ITEMS uses non-canonical route names
**File:** `src/app/(app)/_components/sidebar.tsx:32–38`
**Note:** `href: "/saved"` maps to `/saved` but the CLAUDE.md schema calls this section "Set Aside". Similarly, `/snoozed` does not appear in the CLAUDE.md planned routes (which lists `set-aside` and `reply-later`). These may be intentional renames or placeholders, but they diverge from the canonical route plan. Align when the route pages are built to avoid dead links.

### Settings link duplicates `settingsLinkClass` pattern from `DesktopNavItem`
**File:** `src/app/(app)/_components/sidebar.tsx:143–152, 236–253`
**Note:** The Settings link at the bottom of the sidebar is rendered manually (duplicating the class logic from `DesktopNavItem`) rather than reusing `DesktopNavItem`. This means future style changes to nav items must be made in two places. Consider passing `{ href: "/settings", label: "Settings", icon: Settings }` through `DesktopNavItem` and rendering it in the bottom slot.

### `pathname` read twice at component top level
**File:** `src/app/(app)/_components/sidebar.tsx:127, 143`
**Note:** `pathname` is called at the `Sidebar` level (line 127) to compute `settingsActive`, and also implicitly inside each `DesktopNavItem` via `useIsActive`. This is fine at runtime but slightly inconsistent — `useIsActive` already calls `usePathname()` internally, so the top-level `usePathname()` in `Sidebar` only exists to serve `settingsActive`. If Settings were moved into `DesktopNavItem`, this top-level call could be removed.

### Toggle buttons lack `type="button"` attribute
**File:** `src/app/(app)/_components/sidebar.tsx:182, 209, 219`
**Note:** The three `<button>` elements for toggling the sidebar do not specify `type="button"`. While they are outside any `<form>`, making this a non-issue in practice today, explicit `type="button"` is a defensive convention that prevents accidental form submission if the component is ever placed inside a form context.

---

## README

No. This change is a purely visual UI enhancement with no new setup steps, environment variables, or architectural changes. README does not need updating.

---

## E2E tests to add

The collapsible sidebar introduces a new user-visible interaction flow that should have coverage.

Creating spec file at `.claude/e2e_tests_to_make/collapsible-sidebar.md`.
