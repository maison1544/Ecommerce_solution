# Security Audit

## Secret handling

- MCP config and local `.env` files were not read.
- No actual secret values were printed.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only / Edge Function only.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed with `NEXT_PUBLIC_`.

## Findings fixed

- **Admin API role enforcement**: `DEPLOY_THIS.ts` had `verifyAdmin` defined but many admin/product/upload mutation routes used only `verifyJWT`. These routes were updated to include `verifyAdmin`.
- **RLS baseline**: MCP4 had no application RLS because no application tables existed. Tables were created with RLS enabled.
- **Unsafe service-role-style policies avoided**: legacy `Service role full access ... USING (true)` policies from `database/schema.sql` were not copied as-is.
- **Storage listing**: broad public `storage.objects` SELECT policy was removed after advisor warning.
- **SECURITY DEFINER RPC exposure**: direct `anon` and `authenticated` execute privileges were revoked for cart/review helper RPCs.
- **Function search path**: `is_admin()` was recreated with fixed `search_path`.
- **Order integrity**: order creation now validates item IDs and quantities, rejects inactive/missing products, and recalculates prices/totals from `products` before inserting.
- **Edge Function deployment**: `shop-api` is deployed with platform JWT verification disabled because the function contains public routes and enforces JWT/admin checks per protected route internally.
- **RLS performance hardening**: safe auth initplan and multiple permissive policy warnings were resolved without removing functional indexes.
- **Local middleware env guard**: protected Next.js routes avoid Supabase client construction when public Supabase env values are missing and redirect unauthenticated users instead of returning 500.
- **Client env loading**: public Supabase env values are referenced directly so Next.js can inline them in the client bundle.
- **Scoped Supabase clients**: browser clients are reused per app scope to avoid duplicate GoTrue clients under the same storage key.
- **Admin runtime access**: admin page redirects unauthenticated users to `/admin/login` and provides scoped admin logout.
- **UI layout separation**: restored user-facing shop layout is excluded from `/admin` routes to avoid mixing user navigation with admin scope.
- **Admin operational APIs**: dashboard period statistics use existing protected admin endpoints for users, orders, and inquiries, while realtime alerts use scoped admin Supabase client state and do not expose service-role credentials.
- **Admin debug output**: product save/upload token and image URL debug logs were removed from the browser console path.
- **Category NAV labels**: `category_nav_labels` uses public visible-row read and admin-only insert/update/delete RLS with optimized auth initplan checks; user-facing slugs are numeric while internal `category_key` values preserve product filtering logic.
- **Account email immutability in settings**: `/account/settings` renders email as disabled/read-only and frontend profile updates only submit metadata fields that remain editable.
- **Scoped login endpoint**: browser login no longer calls `supabase.auth.signInWithPassword()` directly. `AuthContext.login()` calls the `shop-api` Edge Function `/api/auth/login` with `{ email, password, scope }` and only calls scoped `setSession()` after server-side scope validation succeeds.
- **Local Next login route disabled**: `apps/web/app/api/auth/login/route.ts` no longer performs authentication and returns a generic disabled response for POST requests.
- **Profile membership enforcement**: login and protected APIs require `auth.users` role metadata to match exactly one profile table: customers in `user_accounts`, admins/superadmins in `admin_accounts`, with no cross-table membership.
- **Generic login failures**: invalid credentials, missing account, blocked account, role mismatch, and profile membership mismatch return the same generic login failure message to avoid role/scope enumeration.
- **Profile overlap prevention**: a non-destructive trigger migration prevents future rows from sharing the same id across `user_accounts` and `admin_accounts`; direct RPC execution privileges were revoked from public/anon/authenticated roles.

## Current RLS model

- **Public read**: active products, public reviews through RLS and public Storage URL access.
- **Authenticated users**: own account, own addresses, own cart, own orders, own inquiries, own reviews/helpful interactions.
- **Admin users**: checked via `auth.jwt().app_metadata.role in ('admin', 'superadmin')` in RLS and via `verifyAdmin` in Edge Function.
- **Edge Function auth**: `verifyAdmin` checks both admin role metadata and `admin_accounts` membership, while `verifyCustomer` checks customer role metadata and `user_accounts` membership.
- **Service role**: server-only Edge Function execution; not exposed to client.

## Advisors

- **Security advisor**: `auth_leaked_password_protection` remains as a Supabase dashboard WARN action.
- **Performance advisor**: only non-blocking unused index INFO notices remain. Index removal is intentionally deferred until real traffic/query stats exist.
- **Scoped auth migration advisor follow-up**: `prevent_cross_profile_membership()` initially triggered SECURITY DEFINER execute warnings; execute privileges were revoked and the warnings cleared.
- **Category NAV advisor follow-up**: function `search_path`, auth initplan, and multiple permissive policy warnings from the new category NAV table were resolved.
- **Order constraints**: `orders` and `order_items` have primary keys, foreign keys, status/amount checks, quantity checks, and cascade delete from `orders` to `order_items`.
- **API authorization smoke**: unauthenticated admin/product/upload calls returned 401, customer calls to admin/product/upload/order-status returned 403, and admin calls to admin/product/order-status endpoints returned 200.
- **Order integrity E2E**: manipulated client totals were ignored and DB prices/totals were stored; missing product, inactive product, zero/negative/excessive quantities returned 400.

## Remaining risks

- `DEPLOY_THIS.ts` is a large single function. Domain split or Next.js Route Handler migration can improve maintainability later.
- User/admin role correctness depends on Supabase Auth `app_metadata.role` being set server-side only.
- Actual Auth redirect URLs and site URLs still need dashboard verification.
- Supabase Auth leaked password protection should be enabled in the dashboard before production.
- Production Edge Function deployment was completed for the updated `shop-api`, including the scope-aware `/shop-api/api/auth/login` endpoint.
- Scope-aware login Playwright smoke passed after deployment: invalid credentials returned the generic 401 response, admin credentials were rejected from `/login`, and admin credentials succeeded from `/admin/login`.
- Admin realtime insert behavior should be rechecked after production deployment or realtime publication changes.

## Required user actions

- Confirm Supabase Auth settings in dashboard.
- Enable leaked password protection in Supabase Auth settings.
- Confirm production test/seed accounts are removed or replaced before launch.
