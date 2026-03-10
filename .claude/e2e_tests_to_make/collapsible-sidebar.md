# E2E Tests: Collapsible Sidebar

Feature introduced in commit `e921f38`.

---

## Test 1 — Sidebar expands and collapses via nav-body toggle

**Scenario:** User clicks the expand/collapse toggle button inside the sidebar nav area.

**Steps:**
1. Log in and navigate to `/inbox`.
2. Assert the sidebar is in thin mode: `aside` has class `w-14` and nav item labels are not visible.
3. Click the `PanelLeftOpen` toggle button (aria-label "Expand sidebar").
4. Assert the sidebar transitions to wide mode: `aside` has class `w-56` and nav item labels (e.g. "Inbox") are visible.
5. Click the `PanelLeftClose` toggle button (aria-label "Collapse sidebar") in the header.
6. Assert the sidebar returns to thin mode: `aside` has class `w-14`.

**Expected outcome:** Sidebar width animates between `w-14` and `w-56`; labels appear and disappear accordingly.

---

## Test 2 — Sidebar state persists across page navigation

**Scenario:** Expanded state is saved to `localStorage` and restored on reload.

**Steps:**
1. Log in and navigate to `/inbox`.
2. Expand the sidebar using the toggle button.
3. Reload the page (hard refresh).
4. Assert the sidebar is still in wide mode (`w-56`) immediately on load.
5. Navigate to `/settings` using the sidebar Settings link.
6. Assert the sidebar is still in wide mode on the new page.

**Expected outcome:** `localStorage` key `sidebar-expanded` persists state across reloads and navigations.

---

## Test 3 — Tooltip appears for nav items in thin mode

**Scenario:** Hovering a nav item in thin mode shows a tooltip with the item label.

**Steps:**
1. Log in and navigate to `/inbox`.
2. Ensure sidebar is in thin mode (collapse it if needed).
3. Hover over the Screener nav icon.
4. Assert a tooltip with text "Screener" appears to the right of the icon.

**Expected outcome:** Radix Tooltip renders with `side="right"` and shows the correct label.

---

## Test 4 — Mobile bottom tab bar is visible and functional

**Scenario:** On a mobile viewport, the bottom tab bar replaces the sidebar.

**Steps:**
1. Set viewport to 375×812 (iPhone-size).
2. Log in and navigate to `/inbox`.
3. Assert the desktop `aside` sidebar is not visible (`hidden md:flex` means it should be hidden).
4. Assert the mobile `nav` bottom tab bar is visible and contains four items: Inbox, Screener, Sent, Settings.
5. Tap "Screener" in the bottom tab bar.
6. Assert navigation goes to `/screener` and the Screener tab icon is highlighted in `text-orange-500`.

**Expected outcome:** Bottom tab bar renders correctly on mobile, navigation works, active item is highlighted.

---

## Test 5 — Wide sidebar does not push content off-screen

**Scenario:** When expanded to `w-56`, the main content area remains fully visible without horizontal overflow.

**Steps:**
1. Log in at a 1024px-wide viewport.
2. Expand the sidebar.
3. Assert `document.body.scrollWidth` equals `window.innerWidth` (no horizontal scroll).
4. Assert the main content area is visible and not clipped.

**Expected outcome:** The CSS `transition-[width]` animation and `flex` layout correctly redistribute space; no horizontal scrollbar appears.
