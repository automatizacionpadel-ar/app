# Médico Slug URLs — Implementation Spec

## Goal

Replace UUID-based PWA URLs (`/app?m=UUID`) with human-readable slug URLs (`/app/garcia-lopez`), making it easier for doctors to share their link with patients.

## Architecture

Auto-generate a unique `slug` from `nombre_completo` at doctor creation time. Store it in the `medicos` table. Use it as the URL path segment for all patient-facing routes.

**Tech Stack:** Next.js App Router dynamic routes, Supabase Postgres, TypeScript

---

## Database

**Migration:** Add `slug TEXT UNIQUE NOT NULL` column to `medicos`.

- Backfill existing rows using the same slugify logic.
- Add a `UNIQUE` index on `slug`.

**Slug generation rules (applied in order):**
1. Lowercase
2. NFD normalize → strip combining accents (`̀–ͯ`)
3. Remove non-alphanumeric characters except spaces and hyphens
4. Trim, collapse whitespace to single hyphens
5. Collapse consecutive hyphens

Example: `"Dra. Sofía García López"` → `sofia-garcia-lopez`

**Collision handling:** If `garcia-lopez` already exists, try `garcia-lopez-2`, `garcia-lopez-3`, etc. Checked via a query before insert.

---

## API Changes

### `/api/medicos/publico`

- **Before:** `GET /api/medicos/publico?id=UUID`
- **After:** `GET /api/medicos/publico?slug=garcia-lopez`
- Lookup changes from `.eq('id', id)` to `.eq('slug', slug)`
- Response shape unchanged

### `/api/medicos/crear`

- Generate slug from `nombre_completo` before inserting
- Check for collision, append suffix if needed
- Insert `slug` alongside other fields

---

## Frontend Routing

| Before | After |
|---|---|
| `src/app/app/page.tsx` | `src/app/app/[slug]/page.tsx` |
| `src/app/app/chat/page.tsx` | `src/app/app/[slug]/chat/page.tsx` |

**Parameter source changes:**
- Before: `useSearchParams().get('m')` returns UUID
- After: `use(params).slug` from Next.js dynamic route params

**Internal navigation** (`irAlChat`) changes from:
```
/app/chat?m=${medicoId}
```
to:
```
/app/${slug}/chat
```

The page fetches `/api/medicos/publico?slug=${slug}` and gets back `id` + other fields. The `medicoId` (UUID) is still used internally for Supabase queries and push subscriptions — only the URL-facing identifier changes.

---

## Slug Utility

Shared `slugify(text: string): string` function in `src/lib/slugify.ts`, used by both the API route and the migration backfill script.

---

## Error Handling

- `/app/[slug]` with unknown slug → show "Link inválido" (same as current missing `m` param behavior)
- Slug generation always produces a non-empty result; edge case of all-special-char names falls back to `medico` with collision suffix

---

## Files Affected

| Action | File |
|---|---|
| Create | `supabase/migrations/20260522_medicos_slug.sql` |
| Create | `src/lib/slugify.ts` |
| Modify | `src/app/api/medicos/crear/route.ts` |
| Modify | `src/app/api/medicos/publico/route.ts` |
| Create | `src/app/app/[slug]/page.tsx` |
| Create | `src/app/app/[slug]/chat/page.tsx` |
| Delete | `src/app/app/page.tsx` |
| Delete | `src/app/app/chat/page.tsx` |
