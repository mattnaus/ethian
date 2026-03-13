# Ethian Design System

Reference for building visually consistent screens. Read this before writing any UI code.

**Design reference repo:** The inbox screen was rebuilt from a v0 prototype at [https://github.com/mattnaus/v0-email-client-design](https://github.com/mattnaus/v0-email-client-design). When building screens with no clear precedent in the existing Ethian code, fetch that repo for visual and structural reference.

---

## Color System

### Semantic Tokens (preferred for all new screens)

The app uses OKLCH-based CSS custom properties. Always use the semantic token classes rather than hardcoded Tailwind color classes.

| Token class | OKLCH value | Role |
|---|---|---|
| `bg-background` | `oklch(0.13 0.005 285)` | App background, page canvas |
| `bg-card` | `oklch(0.16 0.005 285)` | Slightly lifted surface (popovers, cards) |
| `bg-secondary` | `oklch(0.22 0.005 285)` | Hover backgrounds, pill badges, input fills |
| `bg-muted` | `oklch(0.20 0.005 285)` | Subtle fill — email cards use `bg-muted/70` |
| `border-border` | `oklch(0.25 0.005 285)` | All borders and dividers |
| `text-foreground` | `oklch(0.95 0 0)` | Primary text |
| `text-muted-foreground` | `oklch(0.55 0 0)` | Secondary / metadata text |
| `bg-primary` | `var(--color-orange-500)` | Orange accent — buttons, active states, unread indicators |
| `text-primary-foreground` | `oklch(0.98 0 0)` | Text on primary (white) |
| `bg-accent` | `var(--color-orange-500)` | Orange — unread borders; **not** used for focus rings |
| `bg-popover` | `oklch(0.18 0.005 285)` | Popover / dropdown backgrounds |
| `bg-destructive` | `oklch(0.55 0.22 25)` | Delete, error states |

### Hardcoded Zinc (legacy — sidebar and gatekeeper only)

The sidebar and gatekeeper list were built before the OKLCH migration and use hardcoded zinc classes. Do not introduce new zinc hardcodes in new screens; use tokens instead. For reference:

| Class | Approximate role |
|---|---|
| `bg-zinc-950` | App background / sidebar background |
| `bg-zinc-900` | Card / surface |
| `bg-zinc-800` | Border / hover fill |
| `text-zinc-50` / `text-zinc-100` | Primary text |
| `text-zinc-400` / `text-zinc-500` | Muted text |
| `text-primary` | Active nav item, brand accent |
| `border-zinc-800` | Dividers |

### Accent / Brand Color

`orange-500` (`var(--color-orange-500)`) is the single brand accent. It appears on:
- Active sidebar nav items
- Primary CTA buttons (`bg-primary`)
- Unread email left-border indicator (`border-l-primary`)
- Focus rings (`ring-ring/50` — neutral, not orange)
- The "Ethian" wordmark in the sidebar header

### Special-Purpose Colors

- **Gatekeeper button**: `bg-slate-600 hover:bg-slate-500 text-white` — intentionally distinct from the orange accent. Count badge inside uses `bg-white/20 text-white`.
- **Error / destructive**: `text-red-400`, `bg-red-500/10 border border-red-500/20` for inline error banners.
- **Avatar backgrounds**: Transparent — no background color. The account color ring provides the visual boundary.
- **Account color ring**: User-defined hex color applied as `box-shadow: 0 0 0 2px {hex}` on the avatar.

---

## Typography

Font: **Inter** (loaded via `next/font/google`, applied via `--font-sans`).

| Use | Classes |
|---|---|
| Page / section title | `text-2xl font-semibold text-foreground` |
| Panel header (sidebar brand, page `h1`) | `text-sm font-bold` or `text-base font-semibold` |
| Sender name (unread) | `text-sm font-semibold text-foreground` |
| Sender name (read) | `text-sm text-muted-foreground` |
| Subject line (unread) | `text-sm font-medium text-foreground` |
| Subject line (read) | `text-sm text-foreground/80` |
| Snippet / preview | `text-sm text-muted-foreground` (inline after `—` on desktop) |
| Metadata / dates / counts | `text-xs text-muted-foreground` |
| Section label (uppercase) | `text-xs font-medium uppercase tracking-wider text-muted-foreground` |
| Nav labels | `text-sm` |
| Mobile bottom tab labels | `text-[10px] leading-none` |
| Badge / pill text | `text-xs font-medium` |

---

## Spacing & Sizing Conventions

### Heights

| Element | Height |
|---|---|
| Sidebar header / any panel top bar | `h-12` (48px) — keep consistent across the full horizontal line |
| Button (default) | `h-9` (desktop) |
| Button (mobile touch target) | `h-11` (44px minimum) |
| Avatar (email list) | `h-9 w-9` |
| Avatar (gatekeeper) | `h-8 w-8` |
| Account color dot (gatekeeper row) | `h-1.5 w-1.5` |
| Sidebar icon | `h-5 w-5` |
| Sidebar width (thin) | `w-14` (56px) |
| Sidebar width (wide) | `w-56` (224px) |
| Mobile FAB | `h-14 w-14` |

### Content Padding

| Context | Padding |
|---|---|
| Inbox / list page outer | `px-[10px] py-5 md:px-6 md:py-8` |
| Inner email list container | `px-[10px] md:px-4` |
| Email card padding | `p-4` |
| Gatekeeper row padding | `px-4 py-3` |
| Sidebar nav padding | `p-2` |
| Dialog header | `px-6 pt-6 pb-4` |
| Dialog scrollable body | `px-6` |
| Dialog footer | `px-6 py-4` |

### Gap & Spacing

- Between email cards: `gap-[4px]` (4px)
- Between gatekeeper rows: `gap-0.5` (2px)
- Within card content columns: `gap-0.5` for stacked subject/snippet
- Top bar element gap: `gap-2`
- Inline icon + label: `gap-1.5` or `gap-3`
- Between nav items in sidebar: `gap-0.5`

### Max Width

The inbox content area is constrained to `max-w-5xl mx-auto` inside the main panel. This prevents excessively wide line lengths on large screens.

---

## Component Patterns

### Email Card (Inbox)

```
bg-muted/70  border-2  rounded-xl  p-4
```

- **Unread state**: `border-l-primary border-r-transparent border-t-transparent border-b-transparent` — orange left border, other sides transparent.
- **Read state**: `border-transparent`.
- **Hover**: `hover:border-primary/50` — faint orange full border.
- **Focus**: `focus-visible:ring-2 focus-visible:ring-ring/50`.
- **Layout (mobile `< md`)**: `flex-col gap-3` — avatar+sender in first row, subject+snippet below, attachments+date at the bottom.
- **Layout (desktop `md+`)**: `flex-row items-center gap-4` — avatar | sender (fixed `w-36 lg:w-40`) | subject+snippet (flex-1) | attachment badge | date (`w-16 text-right`).
- **Sender inline on mobile**: avatar and sender name side by side in the first row (`flex items-center gap-3`).
- **Subject + snippet (desktop)**: `flex items-baseline gap-2` — subject truncated, snippet inline after `—` separator, hidden on mobile.
- **Subject + snippet (mobile)**: subject on one line, snippet on the next (`mt-0.5 md:hidden`).

### Gatekeeper Row (legacy zinc style)

```
bg-zinc-900  rounded-lg  border border-zinc-800/50  px-4 py-3
flex items-center gap-3
```

- No unread/read distinction — all rows look the same.
- **Left**: `h-1.5 w-1.5` account color dot → `h-8 w-8` avatar (transparent bg, account color ring).
- **Mobile**: two-line block (sender + date row; subject + count badge + paperclip row).
- **Desktop**: dot | avatar | sender (`w-36 lg:w-40`) | subject+snippet stacked (`flex-1`) | count badge | paperclip | date (`w-16`).
- **Count badge**: `bg-zinc-800 text-zinc-400 rounded-full tabular-nums` — only shown when `messageCount > 1`.
- **Hover**: `hover:bg-zinc-800/60`.
- **Focus**: `focus:ring-2 focus:ring-ring/50`.

> Note: New list screens should follow the **Email Card** pattern (semantic tokens, `bg-muted/70`, `border-2`) rather than the Gatekeeper Row pattern.

### List Container (wrapping rows/cards)

For a section that contains a list of cards:
```
bg-background  md:border md:border-border  md:rounded-2xl  py-2
```
On mobile, the container has no border or rounding (cards go edge-to-edge). On `md+`, a subtle rounded bordered container wraps everything.

Container header:
```
flex items-center justify-between  px-[10px] md:px-4  py-3 mb-1
```
- Left: large `text-2xl font-semibold` title, optionally with a `ChevronDown` for a folder switcher dropdown.
- Right: `text-xs text-muted-foreground` count label.

### Date Group Divider

Between date groups ("Today", "This Week", etc.) inside a list:
```tsx
<div className="flex items-center gap-3 my-2.5">
  <div className="flex-1 h-px bg-border" />
  <span className="text-xs font-medium text-muted-foreground px-3 py-1 rounded-full border border-border shrink-0">
    {label}
  </span>
  <div className="flex-1 h-px bg-border" />
</div>
```

### Buttons

| Variant | Classes |
|---|---|
| Primary CTA | `bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 h-9` |
| Ghost / cancel | `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800` (in settings dialogs) |
| Destructive | `bg-destructive text-destructive-foreground` |
| Top bar pill | `rounded-full h-9 px-4 text-sm font-medium` — with appropriate bg |
| Gatekeeper button | `bg-slate-600 text-white hover:bg-slate-500 rounded-full h-9 px-4 text-sm font-medium` |
| Mobile FAB | `h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg` |

All top-bar interactive controls (filter, search, New button) use `rounded-full`, not `rounded-md`.

### Popover / Dropdown Items

```
px-3 py-2.5  rounded-lg  text-sm  transition-colors
```
- Active/selected: `bg-secondary text-foreground font-semibold`
- Inactive: `text-foreground/70 hover:bg-secondary/50 hover:text-foreground`

Section label inside a popover: `text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5`

### Top Bar Layout

The page-level action bar pattern (used in inbox):
- Desktop: `relative flex items-center justify-between`
  - Left slot: contextual action (Gatekeeper badge)
  - Center slot: `absolute left-1/2 -translate-x-1/2 flex items-center gap-2` — filter + search
  - Right slot: primary action (New button)
- Mobile: `flex flex-col gap-2` — full-width banner row first, then centered filter+search row.

### Expandable Search

Collapsed: circle `w-9 h-9 rounded-full border` showing only the search icon.
Expanded (on focus or when value present): grows to `w-48` with visible input. Transition: `transition-all duration-200`.
Keyboard: `Cmd/Ctrl+K` to open, `Escape` to clear and close.

### Avatars

Two sizes used:
- `h-9 w-9` — inbox email cards
- `h-8 w-8` — gatekeeper rows

Both: `rounded-full flex items-center justify-center text-xs font-semibold text-white select-none`

Background: transparent (no background color).

Account color ring: `box-shadow: 0 0 0 2px {accountColor}` — uses the mail account's user-defined hex color validated through `safeColor()`.

Initials: first letter of first + last word of sender name, or first letter of email local part, or `?`. See `src/lib/email-display.ts → getInitials`.

### Dialogs / Modals (Settings forms)

```
bg-zinc-900  border-zinc-800  text-zinc-100
max-h-[90dvh]  flex flex-col  p-0
```

Structure:
- `DialogHeader`: `px-6 pt-6 pb-4 shrink-0`
- Scrollable body: `flex-1 overflow-y-auto px-6 space-y-4 pb-4` — contains the form fields
- Sticky footer: `px-6 py-4 border-t border-zinc-800 shrink-0` — contains Cancel + Submit buttons

Inputs in dialogs: `bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-ring`

Form field error text: `text-xs text-red-400`

Server action error banner (bottom of form body):
```
rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400
```

All inputs must be **controlled** (`value` + `onChange` + `useState`) when inside a Server Action form, to prevent React re-renders from clearing values on error.

---

## Layout Patterns

### App Shell

```
<div className="flex h-screen overflow-hidden bg-zinc-950">
  <Sidebar />                            // hidden on mobile
  <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
    {children}
  </main>
</div>
```

- `pb-16` on main reserves space for the mobile fixed bottom tab bar.
- Main content scrolls via `overflow-y-auto` on the `<main>` element — pages do not need their own scroll wrapper.

### Sidebar

- **Desktop** (`md+`): left rail, `h-screen`, `border-r border-zinc-800`, `bg-zinc-950`.
  - Thin mode: `w-14` — icons only, labels in Radix `Tooltip` on hover.
  - Wide mode: `w-56` — icons + labels, brand name "Ethian" in header.
  - Collapse toggle: `PanelLeftClose` (wide) / `PanelLeftOpen` (thin), below a separator.
  - State persisted to `localStorage("sidebar-expanded")`.
  - Transition: `transition-[width] duration-200 ease-in-out`.
- **Mobile** (`< md`): replaced by a fixed bottom tab bar (`inset-x-0 bottom-0 z-50 flex border-t border-zinc-800 bg-zinc-950`), 4 items. Uses `env(safe-area-inset-bottom)` for iOS safe area.

### Nav Item Active State

```
bg-zinc-900 text-primary             // active
text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300  // inactive
```

Applied to: `rounded-md px-3 py-2 flex items-center`.

### Inbox Page Layout

```
<div className="px-[10px] py-5 md:px-6 md:py-8">
  <div className="mx-auto max-w-5xl">
    {/* Top bar */}
    {/* Email list container */}
  </div>
</div>
```

The outer padding gives breathing room from the main panel edges. `max-w-5xl` keeps the content from sprawling on very wide screens.

### Scrollbar

Globally styled (outside any `@layer`):
- 6px width, transparent track, rounded dark thumb `oklch(0.35 0.005 285)`, lightens to `oklch(0.45 0.005 285)` on hover.
- Firefox: `scrollbar-width: thin; scrollbar-color: oklch(0.35 0.005 285) transparent`.

---

## Mobile Conventions

- Breakpoint for desktop layout: `md` (768px).
- All interactive elements: minimum 44×44px touch target (`h-11 min-w-11`).
- Bottom tab bar height: `h-16` (implied by `pb-16` on main). Reserve space with `pb-16 md:pb-0`.
- Mobile FAB position: `fixed bottom-20 right-4 z-50` — above the tab bar.
- Popover widths on mobile: `w-[calc(100vw-20px)]` to fill the screen minus 10px each side.
- No hover-only interactions — every affordance must work on tap.
- Safe area: apply `env(safe-area-inset-bottom)` on the bottom tab bar.

---

## Iconography

Library: **Lucide React** exclusively. All icons `h-5 w-5` in nav, `h-4 w-4` in buttons, `h-3.5 w-3.5` for inline indicators (paperclip, etc.).

Key icon choices:
- Inbox → `Inbox`
- Gatekeeper → `ShieldQuestion` (nav) / `ShieldCheck` (button) / `ShieldAlert` (folder list)
- Settings → `Settings`
- Compose → `PenLine`
- Search → `Search`
- Attachment → `Paperclip`
- Collapse/expand sidebar → `PanelLeftClose` / `PanelLeftOpen`

---

## Email Detail View

Route: `/inbox/[emailId]`. Chat-style conversation view matching the v0 reference design.

Outer layout: `flex flex-col h-full pb-16 md:pb-0`. Inner content is constrained to `max-w-5xl` via `flex-1 flex flex-col mx-auto w-full max-w-5xl px-[10px] md:px-6 min-h-0`.

### Header

`flex items-center gap-3 py-4 border-b border-border shrink-0`

Contents (left to right):
- Back button: `w-11 h-11 -ml-1 rounded-full hover:bg-secondary active:bg-secondary/80` with `ArrowLeft h-5 w-5` — 44px touch target
- Avatar: `h-9 w-9 rounded-full`, transparent bg, account color ring (`boxShadow: 0 0 0 2px {ringColor}`) — uses `threadMessages[0]` (original sender)
- Sender name (`text-sm font-semibold text-foreground truncate`) + email address (`text-xs text-muted-foreground truncate`) stacked in `flex-1 min-w-0`
- Right slot: account name pill + `MoreHorizontal` button (`min-w-11 min-h-11 rounded-full hover:bg-secondary`)

**Account name pill:**
```
text-xs font-medium px-2.5 py-1 rounded-full border
color/borderColor/backgroundColor derived from account color hex + opacity suffixes ("40", "1a")
```

### Subject section

`py-4 border-b border-border shrink-0`

Subject text: `text-base font-semibold text-foreground text-balance`

### Message area

`flex-1 overflow-y-auto py-6 flex flex-col gap-4 min-h-0`

Auto-scrolls to bottom on load (`scrollIntoView({ behavior: "instant" })`).

**"New" divider** — shown before the first unread message when it is not the first message in the thread:
```
flex items-center gap-3 my-2
  flex-1 h-px bg-primary/40   (line)
  text-xs font-medium text-primary shrink-0   (label, i18n key: newDivider)
  flex-1 h-px bg-primary/40   (line)
```

### MessageBubble

`flex items-end gap-2.5` — `flex-row-reverse` for self, `flex-row` for others.

Inner column: `flex flex-col gap-1 max-w-[90%] md:max-w-[60%]`, aligned end (self) or start (others).

**Self bubble** (fromAddress === mailAccountEmail):
```
px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
bg-primary text-primary-foreground rounded-br-sm
```

**Other bubble:**
```
px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
bg-secondary text-foreground rounded-bl-sm
```

**Timestamp:** `text-xs text-muted-foreground px-1`, `title` attribute holds full date string.

**Attachment chips** (below bubble, horizontally scrollable):
```
flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border
hover:bg-secondary transition-colors cursor-pointer max-w-[220px]
```

### Inbox thread count badge

Shown on email cards when `threadCount > 1`, placed after the subject `<span>`:
```
shrink-0 text-xs font-medium text-muted-foreground tabular-nums bg-secondary px-1.5 py-0.5 rounded-full
```

### Compose bar

`shrink-0 py-4 border-t border-border`

Compose box: `flex items-end gap-2 bg-secondary/40 border border-border rounded-2xl px-4 py-3`

- Paperclip button: `min-w-11 min-h-11 flex items-center justify-center` — 44px touch target
- Textarea: `flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-relaxed min-h-[24px]` — auto-resizes up to 160px
- Send button: `h-8 w-8 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30` with `Send h-3.5 w-3.5` icon

Keyboard hint below box: `text-xs text-muted-foreground text-center mt-2` — "Cmd+Enter to send" on macOS, "Ctrl+Enter to send" on Windows/Linux (platform-detected at runtime via `navigator.platform`).

---

## Utility Helpers

All in `src/lib/email-display.ts`:

| Function | Purpose |
|---|---|
| `safeColor(hex, fallback)` | Validates hex against `/^#[0-9a-fA-F]{6}$/` before use in inline styles |
| `getInitials(name, email)` | `"Sarah Chen"` → `"SC"`, email fallback, `"?"` guard |
| `formatDate(iso, locale)` | Today → `"14:32"`, this year → `"Mar 5"`, older → `"Mar 5, '23"` |
| `formatRelativeDate(iso, locale)` | `"5m ago"`, `"3h ago"`, `"2d ago"`, falls back to `formatDate` after 7 days |

---

---

## Implementation Principles

When building a new screen or component not yet defined above:

1. **Reference before inventing.** Find the closest existing screen 
   in the codebase and use its layout, spacing, and component patterns 
   as the starting point. Check the v0 reference repo if no precedent 
   exists in Ethian.

2. **Every interactive element needs intentional states.** Hover, 
   focus-visible, active, and disabled must all be explicitly styled — 
   never rely on browser defaults. Use the existing patterns (orange 
   border on hover, `ring-ring/50` on focus) as the baseline.

3. **Motion budget.** Default transition: `duration-150 ease-out` for 
   micro-interactions (hover, focus). `duration-200 ease-in-out` for 
   layout shifts (sidebar, expanding search). `duration-300` with 
   staggered `animation-delay` for page entrance sequences. Prefer one 
   well-orchestrated entrance over scattered animations. CSS transitions 
   first; reach for Framer Motion only when CSS can't express it.

4. **Depth and atmosphere.** Surfaces shouldn't all feel identically 
   flat. Use the existing layering (background → card → muted → popover) 
   to create hierarchy. Subtle shadows or border treatments can 
   distinguish interactive cards from static containers. Don't introduce 
   gradients or textures that aren't already in the system, but do use 
   opacity and border variations to create visual interest.

5. **No generic fallbacks.** Don't fall back to browser-default focus 
   rings, system font stacks, or shadcn defaults that haven't been 
   themed to match Ethian's tokens. If a component doesn't have an 
   Ethian-specific style yet, define one consistent with this document 
   rather than shipping the default.