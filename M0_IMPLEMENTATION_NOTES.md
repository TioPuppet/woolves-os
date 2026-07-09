# M0 — Implementation Notes

**Milestone:** Project setup · PWA base · design tokens · `ThiingsAsset` + registry
**Status:** ✅ Complete — typecheck clean (`tsc --noEmit`, exit 0), production build clean (`next build`, exit 0, `/` prerendered static).

> Nota M10: a fila offline de mutações foi removida por estar sem uso. O service worker atual continua GET-only e as mutações são online-first.

---

## What was built

**Project & config**
- Next.js 14.2 (App Router) · TypeScript **strict** (+ `noUncheckedIndexedAccess`) · Tailwind · TanStack Query.
- `next.config.mjs` with `Service-Worker-Allowed` header; `@/*` path alias.

**Design tokens (dark premium, mobile-first)**
- `src/app/globals.css` — CSS variables as single source of truth for color, including the 5 **day-status** semantic tokens (`ontrack / atrisk / broken / recovery / completed`). iPhone safe-area padding + `viewport-fit=cover`.
- `tailwind.config.ts` — tokens wired via `hsl(var(--x))`; `max-w-app` (~448px) single-column shell.

**App shell**
- `layout.tsx` — `lang="pt-BR"`, dark class, centered app container, PWA/Apple meta, `Providers` + `ServiceWorkerRegister`.
- `providers.tsx` — TanStack Query tuned for optimistic-first mobile UX (no refetch-on-focus).
- `page.tsx` — M0 placeholder proving the shell renders (EXP bar + all thiings placeholders). Becomes the real Today Dashboard in M2/M3.

**R1 — ThiingsAsset (ABSOLUTE rule honored)**
- `components/ThiingsAsset.tsx` — the **only** sanctioned way to render identity/gamification/module visuals. Renders `/public/assets/thiings/{key}.png`; on missing file → neutral placeholder with **reserved dimensions**, key label, and alt text (zero layout shift when real assets arrive).
- `lib/thiings-registry.ts` — 14 initial keys with path + usage context + pt-BR alt: `body, money, mission, mind, pack, ai_coach, life_exp, alpha_badge, trophy, water, sleep, workout, nutrition`.
- No icon libraries, no emoji, no custom identity SVGs, no hotlinking anywhere.

**R2 — EXP config (centralized, tunable)**
- `lib/exp-config.ts` — all baseline EXP constants, optional-habit cap (3/day), streak bonus (+10/day, cap +50), level curve `100 × N^1.6`, 8 level titles (Cub→Mythic Wolf), and derived `levelFromExp()`. No EXP is granted client-side — this file only holds constants/derivations for display; server-authoritative RPC + `exp_events` ledger arrive in M3.

**Supabase (placeholders, per your choice)**
- `lib/supabase/client.ts` — lazy browser client from `NEXT_PUBLIC_*` env; throws a clear pt-BR error if unset. No secrets in client (R4).
- `.env.local.example` — copy to `.env.local` and fill before **M1**.

**PWA base**
- `public/manifest.webmanifest` — standalone, portrait, dark theme, pt-BR, maskable icons.
- `public/sw.js` — app-shell cache, network-first navigations, cache-first assets. **GET-only** — mutações são online-first.
- Placeholder PWA icons (192/512) generated so install works today.

---

## How to test on iPhone

1. In the project folder: `npm run dev` (deps already installed).
2. Find your Mac's LAN IP (`ipconfig getifaddr en0`), then on the iPhone (same Wi-Fi) open `http://<mac-ip>:3000`.
3. Confirm: dark shell renders, EXP bar shows **Nível 2 · Rookie Wolf**, and 14 dashed placeholders appear.
4. PWA install (needs HTTPS — the SW only registers in production): run `npm run build && npm start`, expose via a tunnel (e.g. ngrok), open on iPhone → Share → **Add to Home Screen** → launch standalone.

> Note: `npm run build` inside this synced folder throws a harmless `EPERM` during the final export cleanup (a filesystem quirk of the synced location, not a code issue). Compilation and static generation succeed. On your local disk the build completes clean (verified: exit 0).

---

## Pending thiings assets to download (owner)

Drop PNGs into `/public/assets/thiings/`, named exactly by key:

`body` · `money` · `mission` · `mind` · `pack` · `ai_coach` · `life_exp` · `alpha_badge` · `trophy` · `water` · `sleep` · `workout` · `nutrition`

Also replace the placeholder PWA icons in `/public/icons/` (`icon-192.png`, `icon-512.png`) with real branded ones when ready.

---

## Decisions made

- **Custom SW instead of `next-pwa`** — avoids App Router / TS-strict friction; keeps M0 dependency-light and full control over the app-shell cache.
- **Plain `<img>` in ThiingsAsset** (not `next/image`) — makes the missing-file `onError` fallback trivial and needs no remote-loader config; assets are local, small, static.
- **EXP constants live client-side but grants do not** — display/estimates only; authority stays on the server (R2).

## Pending / next
- Before **M1**: create the real Supabase project and fill `.env.local`.
- **M1**: Auth (email/password) + onboarding with goal calc (Mifflin-St Jeor kcal, protein 1.8 g/kg, water 35 ml/kg, all overridable). First migrations + RLS land here.
