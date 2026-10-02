# Phase 2 — UX Architecture

## Navigation maps

**Public** (`PublicLayout`: sticky blurred header · footer)

```
Header:  Logo · Courses · About · Contact   |  EN|FR · Log in · [Contact us]
/                 Hero → Trust strip (live counts) → Why us → Programs (dynamic) → How it works → FAQ → Final CTA
/courses          Search + category chips → categories → (academic-year groups) → cards
/courses/:id      Hero → What you will learn → Program (accordion) → Who it's for → Project → Skills → FAQ → CTA   (sticky CTA card / mobile bar)
/about  /contact  /login (student)   /admin/login
```

**Admin** (`/admin`, sidebar 264 px, breadcrumbs, page header with primary action)

```
Dashboard
Courses    ├ All courses  /admin/courses        ├ Add course  /admin/courses/new (wizard)     └ Categories  /admin/categories (tabs: Categories · Academic years)
Students   ├ All students /admin/students       ├ Add student /admin/students/new            └ Enrollments /admin/enrollments
Messages   └ Contact requests /admin/messages
Settings   /admin/settings
Detail routes: /admin/courses/:id (Overview · Curriculum · Students) · /admin/courses/:id/edit (wizard) · /admin/students/:id
```

**Student** (`/student`, sidebar / bottom tab bar on mobile)

```
Dashboard  /student            Welcome back, {name} 👋 → continue learning → my courses with real progress
My courses /student/courses    /student/courses/:id (modules accordion, progress)  /student/courses/:id/lessons/:lessonId (player)
My profile /student/profile
```

## Responsive behaviour (375 → 1920 px)

| Element | ≥ 1024 | 768–1023 | < 768 |
|---|---|---|---|
| Public nav | inline links | inline links | hamburger → full-height sheet, CTA inside |
| Admin sidebar | fixed rail | off-canvas drawer (top bar) | off-canvas drawer (top bar) |
| Student nav | sidebar | sidebar collapses to top bar | **bottom tab bar** |
| Tables | real tables | real tables, secondary columns hidden | each row becomes a stacked **card** (same column definitions) |
| Course cards | 3–4 columns | 2 | 1 (full-width, thumbnail on top) |
| Forms | 2-column grids | 2 | 1, 44 px min touch targets |
| Modals | centered dialog | centered | **bottom sheet**, scrollable body, sticky footer |
| Detail drawers | 480–560 px right drawer | same | full-screen |
| Lesson player | content + outline column | content + outline drawer | content, outline in drawer, sticky "mark complete" bar |

Global rules: no horizontal page scroll at any width, `min-w-0` on flex children, long titles truncate/wrap, minimum body text 14 px (16 px on public), tap targets ≥ 40 px.

## Key flows

**Course creation wizard** (5 steps, progress bar, *Save draft* on every step). The draft is created on step 1 (`POST /courses`, `DRAFT`); later steps `PUT` the course; step 3 uses the modules/lessons endpoints with instant persistence; step 5 shows a **readiness checklist** and an EN/FR live preview rendered by the same component as the public course page, then *Publish*. The same wizard edits an existing course, so work is never lost and can be resumed.

**Enrollment** — from *Enrollments* ("New enrollment": student + course + date) or from a student/course page; already-enrolled pairs are rejected with a friendly message.

**Contact → student** — Messages list (status tabs, search) → detail drawer → *Create student* (pre-filled, optional enroll in the interested course, temporary password shown once) or *Add to existing student* (search; suggested match by e-mail).

**Learning** — Dashboard "Continue learning" resumes at the first incomplete lesson; lesson page → *Mark as complete* → progress ring/bar updates optimistically and is re-validated from the server.

## Language (EN | FR)

- Switcher in every header (public, admin, student); choice persisted (`localStorage`), initial value from the browser, `<html lang>` updated.
- Typed dictionaries (`en.ts` is the source of truth; `fr.ts` is type-checked against it, so a missing French key is a compile error). Plurals via `Intl.PluralRules`. Dates/numbers/currency via `Intl` with the active locale.
- Database content is bilingual per field (`title_en` / `title_fr`); when one side is empty the other is used as fallback.
- Server validation errors return stable codes (`required`, `invalid_email`, `too_short` …) that the UI maps to natural French/English messages.

## States

Every data view has: **loading** (skeletons that match the layout), **empty** (icon + explanation + primary action), **error** (message + retry). Destructive actions use a confirmation dialog that names the object; success/failure is announced with toasts (`aria-live`).
