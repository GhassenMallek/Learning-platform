# Phase 3 — Design System

Direction: **premium EdTech × modern SaaS** (Linear/Stripe/Notion calm): white surfaces, precise 1 px borders, restrained colour, strong type hierarchy, generous whitespace. Implemented as Tailwind 4 `@theme` tokens in `web/src/index.css`.

## Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | Plus Jakarta Sans (variable, self-hosted) | 600–800, tight tracking (−0.02em) |
| UI / body | Inter (variable, self-hosted) | 400–600 |
| Code | JetBrains Mono (variable) | code cards, lesson code blocks |

Scale: display 56/60 (hero, 40/44 mobile) · h1 44/48 · h2 32/38 · h3 22/28 · body-lg 18/30 · body 16/26 · small 14/22 · caption 12/16. Admin UI uses 14 px base. Fonts are bundled (no third-party requests — better privacy for EU visitors, no layout jumps).

## Colour

| Token | Value | Use |
|---|---|---|
| `brand-600` | `#4258e8` | primary actions, links, active nav (contrast 5.8 : 1 on white) |
| `brand-50 … 950` | cobalt-indigo ramp | tints, focus rings, subtle backgrounds |
| `slate-900 / 600 / 500` | Tailwind slate | headings / body / muted text |
| `slate-200 / 100 / 50` | Tailwind slate | borders / dividers / page tint |
| `emerald` | success, "Accounting" tint | statuses, progress complete |
| `amber` | warning, drafts | |
| `rose` | danger, destructive | |

One brand colour only. Category badges tint from a small hue palette derived from the category slug (brand for Technology, emerald for Accounting, others cycle) — used on badges and generated covers, never for layout.

## Shape, depth, spacing, motion

- **Radius**: 6 (chips) · 10 (buttons, inputs) · 14 (cards) · 20 (hero panels, modals) · full (badges, avatars).
- **Shadow**: `xs` (inputs) · `card` (resting cards) · `elevated` (hover, popovers, modals) · `brand` (primary CTA glow). Cards rely on a 1 px border first, shadow second.
- **Spacing**: 4 px grid; section rhythm 64/96 px (mobile/desktop); container 1280 px with 16/24/32 px gutters; card padding 20–24 px.
- **Motion**: 150 ms hover, 250 ms UI, 600 ms scroll reveal, `cubic-bezier(.22,1,.36,1)`; floating hero elements drift slowly; everything respects `prefers-reduced-motion`.

## Components

| Component | Spec |
|---|---|
| **Button** | variants `primary` (brand fill + glow), `secondary` (white + border), `ghost`, `danger`, `link`; sizes `sm 36`, `md 40`, `lg 48`; loading state with spinner, disabled 50 %; focus ring 2 px brand-500 / 2 px offset |
| **Input / Select / Textarea** | 40 px, 10 px radius, 1 px slate-300 border, focus ring brand, error state rose + message with `aria-describedby`; always paired with a visible `<label>` |
| **Card** | white, 1 px slate-200 border, `card` shadow, hover lift on interactive cards |
| **Badge** | pill, tone (neutral, brand, success, warning, danger, info), dot variant for statuses |
| **Table** | sticky light header, 44 px rows, hover tint, row actions menu; **stacks into cards below 768 px** |
| **Modal / Drawer / Confirm** | focus-trapped, `Esc` closes, scroll lock, restores focus; bottom sheet on mobile; confirm dialogs name the object and use danger buttons |
| **Tabs, Accordion** | keyboard operable (arrows / Enter / Space), `aria-expanded`, animated height |
| **Toast** | top-right (bottom on mobile), `role="status"`, auto-dismiss 4 s |
| **Skeleton / Empty / Error** | layout-matching shimmer; icon + text + action; retry |
| **Progress** | linear bar + ring, `role="progressbar"` with `aria-valuenow` |
| **Icons** | Lucide, 16/20 px, 1.75 stroke, decorative icons `aria-hidden` |

## Accessibility baseline

Semantic landmarks (`header/nav/main/footer`), one `h1` per page, skip-to-content link, visible focus everywhere, form controls labelled, error text linked to fields, colour never the only signal (status badges carry text), contrast ≥ 4.5 : 1, reduced-motion support, `lang` attribute follows the switcher, dialogs use `role="dialog"` + `aria-modal`.
