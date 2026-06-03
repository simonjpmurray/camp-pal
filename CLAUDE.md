# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**CampFire** — a group camping trip planner. Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict) + Tailwind 4. Backed by Supabase (Postgres + Auth). Installable as a PWA. Repo and `package.json` still use the legacy `camp-pal` / `camp-pal-scaffold` name; only the user-facing brand is "CampFire".

## Commands

```bash
npm run dev      # Next.js dev server (Turbopack) on :3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint (no tests configured)
```

No test runner is set up. Type-checking happens via `tsc` implicitly through `next build`; for a faster check run `npx tsc --noEmit`.

Path alias `@/*` resolves to the repo root (e.g. `@/lib/supabase/server`).

## Architecture

### Anonymous-first auth

The app is **friction-free by default**: there is no login wall. `components/auth/AnonymousAuth.tsx` (mounted in `app/layout.tsx`) calls `supabase.auth.signInAnonymously()` on first load for any visitor without a session, then `router.refresh()` so server components re-render with the new session. Every visitor gets a real `auth.uid()` with an `is_anonymous: true` JWT claim, so all RLS policies keyed on `auth.uid()` keep working unchanged.

Consequences to keep in mind:
- **`public.users.email` is nullable.** Anonymous users have no email. `handle_new_user()` mirrors a null email and an empty name; `DisplayNamePrompt.tsx` (also in the layout) then asks anonymous users what to call them and writes via the `update_my_profile` RPC. Don't reintroduce a NOT NULL on `email` — it would make `signInAnonymously()` fail at the trigger.
- **`/login` is repurposed as "Save your access".** It detects three states client-side: anonymous → upgrade form (`updateUser({email,password})` or `linkIdentity({provider:'google'})`, same UUID, no data loss); non-anonymous → "you're all set"; signed-out → the original email/Google login form.
- **Sign-out is hidden for anonymous users** in `AppNav` (it would orphan their trips) — replaced with a "Save your access" link.
- Requires the **Anonymous Sign-ins** provider toggled on in the Supabase dashboard (Authentication → Providers). Without it, `signInAnonymously()` errors — `AnonymousAuth` logs this to the console.

### Middleware lives in `proxy.ts`, not `middleware.ts`

Next 16 renamed the convention from `middleware.ts` to `proxy.ts`. `middleware.ts` still works but emits a deprecation warning at build time. The file at the repo root refreshes Supabase auth cookies on every request via `@supabase/ssr`. It **no longer redirects unauthenticated users** (anonymous sign-in covers that); its only redirect now sends *non-anonymous* users away from `/login` to `/dashboard`. Edit this file when changing cookie behaviour or `/login` steering.

### Two Supabase clients, three keys

- `lib/supabase/client.ts` → `createClient()` for **client components** (browser, anon key).
- `lib/supabase/server.ts` → `createClient()` for **server components / route handlers** (cookie-aware anon key). Also exports `createAdminClient()` which uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS — only call from server code that has already authorised the user.

RLS policies are defined in `supabase/schema.sql` (single-file schema, no migrations dir). Treat that file as the source of truth for tables and access rules.

### Packing list is a templated engine, not free-form

`lib/packing.ts` declares ~80 `PackingItemTemplate` records grouped by `category`. Each template has:
- `itemType: 'group' | 'personal' | 'scaled'` — drives claim semantics in the UI. `scaled` items also carry a `scaledMultiplier` (`per_person` / `per_night` / `per_person_per_night`).
- `highlight(forecast)` — pure function returning `{ level: 'red'|'yellow'|'grey', reason }` based on the Open-Meteo `Forecast` for the trip dates. This is how rain jackets get flagged red when rain is forecast.

`POST /api/trips/[id]/generate-packing` (route handler) materialises templates into the `packing_items` table for a trip, calling `lib/weather.ts` to fetch and `scaleQuantity` to expand scaled items. `item_claims` is the join table tracking who's bringing what.

### Weather

`lib/weather.ts` calls Open-Meteo directly (no API key required). Forecasts are cached per-trip in the `weather_cache` table. `GET /api/trips/[id]/weather` reads cache-or-fetch and returns a `Forecast`. Both the trip detail page (`WeatherWidget`) and the sidebar (`SidebarWeatherCompact` — only renders when pathname matches `/trips/<uuid>`) consume that endpoint.

### PWA + service worker

`public/sw.js` is hand-written; it's registered by `components/ui/PushSetup.tsx` on mount and handles web-push notifications (VAPID). Web push uses `lib/push.ts` and `web-push` server-side via `/api/push/{subscribe,send,notify-join}`.

**Gotcha:** the service worker caches JS chunks. After renaming exports/imports, browser sessions can hit `module factory not available` errors. Fix is browser-side: DevTools → Application → Storage → Clear site data, then reload. Consider this before assuming a code bug.

### Theming

All colours live as CSS variables in `app/globals.css` (`:root` + `.dark`). The primary accent uses the variable name `--forest` for historical reasons but the actual value is now an ember/rust palette (`#c0532a` light, `#e07a45` dark) post-rebrand — don't be misled by the name. Component code references `var(--forest)` directly, so global palette shifts only need this one file. There are also global overrides forcing all Tailwind `text-stone-{400..900}` to near-black in light mode.

### Auth provider setup

Google OAuth is wired in the login UI but requires the provider to be enabled in the Supabase dashboard (Authentication → Providers → Google) with a Google Cloud OAuth Client ID + Secret. The redirect URI must be added to the Google client. There is no code change needed to enable it.

## Security pipeline

`.github/workflows/security-pipeline.yml` runs Snyk + CodeQL + Gitleaks + OWASP ZAP on push, PR, and a weekly cron. Setup is documented in `security-pipeline-readme.md`. Required: `SNYK_TOKEN` secret and `STAGING_URL` repo variable.

## Reference docs in the repo

- `features-roadmap.md` — prioritised feature backlog (budget tracking, offline access, etc.).
- `item-categories-task.md` — design history for the `itemType` system.
- `TASKS.md` — older free-form task list.
- `supabase/schema.sql` — schema + RLS policies, source of truth.
