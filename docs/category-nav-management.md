# Category NAV Management

## Current model

- **User-facing slug**: sequential numeric string stored in `category_nav_labels.slug` and used in `/category/[category]` URLs.
- **Internal category key**: original semantic category value stored in `category_nav_labels.category_key` and used for product filtering and business logic.
- **Display metadata**: admin-managed `label`, `description`, `sort_order`, and `is_visible` drive shop navigation and category page title/subtitle.
- **Global display policy**: user/admin-facing category names should prefer the admin-managed `label`; fallback category labels are only for default/offline states.

## Special deals rule

- `special-deals` remains an internal `category_key`.
- Public links should prefer its numeric `slug`.
- Product filtering still resolves to `special-deals`, preserving discount/special-deals logic.
- Legacy `/category/special-deals` continues to resolve through the fallback category key path.

## Admin behavior

- Admin category NAV tab can edit display name, description, visibility, and sort order.
- On save, numeric slugs are recalculated from sorted order and exposed as user-facing URLs.
- The internal `category_key` must not be edited or displayed from the UI.
- The internal `category_key` is still preserved in state and save payloads for product filtering and business logic.
- Product create/update uses the internal `category_key` as the stored product category value.
- Admin product filters, selects, and product tables display the admin-managed label while keeping option/filter values as `category_key`.

## Verification

- `apps/web` TypeScript check passes with `apps\web\node_modules\.bin\tsc.cmd -p apps\web\tsconfig.json --noEmit --pretty false`.
- Forbidden routing/library pattern search returned no matches.
- Supabase advisors showed no new category NAV RLS warning after the migration.
