# Learning Center — bilingual EdTech platform (EN / FR)

A premium public website, an **Admin dashboard**, a **Student dashboard** and a **REST API** on **MongoDB** — one system where courses, students, enrollments, lessons, progress and contact requests all live in the database and are managed from the admin. Nothing about any course is hard-coded in the front-end.

```
Public site  ──┐
Admin  /admin ─┼──▶  React 19 + Tailwind 4 (Vite)  ──/api──▶  Express 5 + TypeScript  ──▶  MongoDB (Mongoose)
Student /student ┘        EN | FR                          JWT cookie · RBAC · Zod
```

| | |
|---|---|
| **Public** | `/` · `/courses` · `/courses/:slug` · `/about` · `/contact` · `/login` (students) |
| **Admin** | `/admin/login` → dashboard, courses (5-step wizard), modules & lessons, categories & academic years, students, enrollments, contact requests, settings |
| **Student** | `/student` → dashboard, my courses, lesson player (Markdown, video, resources), progress, profile |
| **Docs** | [Product architecture](docs/01-product-architecture.md) · [UX architecture](docs/02-ux-architecture.md) · [Design system](docs/03-design-system.md) · [Deployment](docs/04-deployment.md) |

## Quick start

Requirements: **Node ≥ 20.12** and a running **MongoDB** (local `mongod`, Docker or Atlas — a standalone server is fine, no replica set needed).

```bash
npm install                      # installs both workspaces
cp server/.env.example server/.env   # then edit: JWT_SECRET, MONGODB_URI, SEED_ADMIN_PASSWORD…
npm run seed:demo                # admin account + 8 starter courses (+ a demo student and sample requests)
npm run dev                      # API on :4000, web app on :5173  →  http://localhost:5173
```

Sign in at `/admin/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `server/.env`. With `seed:demo` there is also a student: `ahmed.benali@example.com` / `Student#Learn2026`.

> `.env` tip: **quote values that contain `#`** (`SEED_ADMIN_PASSWORD="Admin#Learn2026"`) — an unquoted `#` starts a comment.

| Command | What it does |
|---|---|
| `npm run dev` | API (tsx watch) + web (Vite, proxies `/api` and `/uploads`) |
| `npm run seed` | Idempotent initial data: admin, settings, categories, academic years, 8 courses (never overwrites edits) |
| `npm run seed:demo` | …plus a demo student with real lesson progress and sample contact requests |
| `npm run seed:reset` | **Wipes the database**, then seeds everything (refused in production) |
| `npm test` | 63 integration tests against a dedicated `learning_center_test` database |
| `npm run typecheck` | TypeScript for server and web |
| `npm run build` / `npm start` | Production build; the API then also serves `web/dist` (SPA fallback) |

Databases used: `learning_center` (app) and `learning_center_test` (tests — the suite wipes it, so the name **must end in `_test`**; the code refuses to run otherwise).

## Dynamic by design

The seed inserts 8 courses (Flutter, Java, and six Accounting subjects). They are ordinary rows: the admin can create **Python for Beginners**, or any other course, in the wizard and it appears on the website the moment it is published — no code change.

* **Categories** and **academic years** are admin-managed collections. The public site builds *category → academic year → cards* purely from `course.academicYear`, so "2nd Year" / "3rd Year" (or a new "4th Year") appear automatically.
* Every translatable field exists twice (`title_en` / `title_fr`, modules, lessons, FAQ, objectives…). The UI (`en.ts` is the source of truth, `fr.ts` is type-checked against it), validation messages, empty states, dates, plurals and currency are localized; the API returns stable error codes that the UI translates.
* A course is only public when `PUBLISHED`; publishing runs a readiness check (bilingual titles/descriptions, ≥ 1 module, every module has lessons).

## Roles, security and data integrity

* **JWT (HS256) in an httpOnly, SameSite=Lax cookie**; every request re-checks the user, `tokenVersion` (password change/reset revokes all sessions) and — for students — `ACTIVE` status. State-changing requests must carry `X-Requested-With` (CSRF), Argon2id password hashing, login rate limiting, timing-safe login.
* **Authorization is enforced by the API** (role middleware + ownership checks): a student can only read their own enrollments/progress, lesson content is only served to enrolled students, and drafts are invisible to the public (even by direct URL).
* All input goes through Zod (`{"$gt": ""}` style payloads are rejected; ObjectIds are format-checked; search terms are escaped). Uploads are size-limited and verified by magic bytes (no SVG).
* MongoDB has no foreign keys, so integrity is explicit: unique/compound indexes (e.g. one enrollment per student+course), cascade-on-delete in services, deletion of a course with enrolled students is refused (archive instead), and progress is **computed** from lesson completions — never stored as a percentage.

## Project layout

```
server/  src/{config,db/models,lib,middleware,schemas,services,routes,storage,seed}   tests/
web/     src/{i18n,lib,auth,components/ui,components,layouts,pages/{public,admin,student}}
docs/    architecture · UX · design system
```

Extension points (payments, certificates, quizzes, instructors, S3/Cloudinary storage…) are listed in [docs/01-product-architecture.md](docs/01-product-architecture.md#8-extension-points-designed-for-not-built).
