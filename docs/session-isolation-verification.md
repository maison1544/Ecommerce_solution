# Session Isolation Verification

## Implemented session model

- **User scope key**: `sb-ecommerce-user-auth-token`
- **Admin scope key**: `sb-ecommerce-admin-auth-token`
- **Scope resolver**: `apps/web/lib/supabase/config.ts`
- **Client creation**: `apps/web/lib/supabase/client.ts`
- **Server/middleware session handling**: `apps/web/lib/supabase/server.ts`, `apps/web/lib/supabase/proxy.ts`, `apps/web/middleware.ts`

## Expected behavior

- `/login` accepts customer/user accounts only.
- `/admin/login` accepts admin accounts only.
- Customer account cannot persist in admin scope.
- Admin account cannot persist in user scope.
- Wrong-scope login attempts fail through the server-side scoped Edge Function with the same generic login failure message as invalid credentials.
- Browser login only receives access/refresh tokens after the Edge Function verifies credentials, role metadata, and exclusive profile table membership.
- User and admin can coexist in the same browser because cookie/storage keys differ.
- User logout should clear only user scope.
- Admin logout should clear only admin scope.
- Hard refresh should preserve each valid scoped session.

## Verification status

- **Static verification**: completed.
- **Browser verification**: completed for pathname-based local routing. Public routes, protected redirects, customer login, admin login, and scoped logout behavior were verified.
- **Layout separation verification**: user-facing routes render the restored shop header/navigation/footer while `/admin/login` and unauthenticated `/admin` do not render the shop layout.
- **API authorization verification**: completed. Public health/products returned 200; unauthenticated protected endpoints returned 401; customer calls to admin/product/upload/order-status endpoints returned 403; admin calls returned 200.
- **Type verification**: `npx tsc -p apps/web/tsconfig.json --noEmit --pretty false` passes.
- **Scoped login static verification**: `AuthContext.login()` calls `https://<project>.supabase.co/functions/v1/shop-api/api/auth/login` via `API_BASE_URL`, includes `scope`, and no longer calls `supabase.auth.signInWithPassword()` directly.
- **Local Next route verification**: `/api/auth/login` is intentionally disabled and returns a generic POST failure; authentication is not performed in Next Route Handlers.
- **Profile overlap verification**: `select id from user_accounts intersect select id from admin_accounts` returned no rows; a trigger migration prevents future overlap.
- **Playwright scoped login verification**: completed after `shop-api` redeploy. Invalid credentials returned the generic 401 response, admin credentials were rejected from `/login`, and admin credentials succeeded from `/admin/login` with redirect to `/admin`.
- **Admin scoped realtime**: admin dashboard subscribes to order/inquiry inserts with the admin-scoped browser client and polling fallback; live browser insert smoke remains pending.
- **Admin notification UX**: notification state/settings are client-local and run under the authenticated admin surface; bell popover, MP3 selection, read-state badge updates, pruning, and pagination are implemented in the admin scope.
- **Category NAV management**: admin-only category metadata management is isolated to `/admin?tab=categoryNav`; public shop navigation reads numeric slugs/display metadata while product logic resolves through internal `category_key`.
- **Build/lint verification**: full Next.js build and full lint were not run to avoid OOM/heavy commands.

## Manual smoke test checklist

1. Start dev server with `pnpm --filter web dev`.
2. Open `/login`, log in as customer.
3. Verify localStorage/cookie key includes `sb-ecommerce-user-auth-token`.
4. Open `/admin/login`, log in as admin.
5. Verify localStorage/cookie key includes `sb-ecommerce-admin-auth-token`.
6. Confirm both keys can coexist.
7. Log out user and confirm admin session remains.
8. Log out admin and confirm user session remains if still logged in.
9. Try customer access to `/admin`; expect redirect or denial.
10. Try admin access to `/account`; expect user-scope denial/redirect.
11. Test `admin.localhost` and `app.localhost` host-based scope if local DNS/hosts supports it.

## Known prerequisites

- Supabase project env values must be configured in local/Vercel runtime.
- `shop-api` Edge Function is deployed for login attempt/IP tracking APIs.
- Updated `shop-api` Edge Function must be deployed for `/shop-api/api/auth/login`.
- Edge Function runtime must include `SUPABASE_ANON_KEY` in addition to `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Test customer/admin Auth users must exist.

## Verified local results

- Customer login created `sb-ecommerce-user-auth-token` scoped cookies.
- Admin login created `sb-ecommerce-admin-auth-token` scoped cookie.
- User and admin scoped cookies coexisted in the same browser context.
- User logout removed only user scoped cookies and preserved admin access.
- Admin logout removed only admin scoped cookie and preserved user access.
- Customer access to `/admin` redirected to `/admin/login` without creating an admin session.
- Admin account login through `/login` returned only the generic login failure message.
- Admin account login through `/admin/login` created the admin scoped session, recorded login IP, and loaded protected admin APIs.
- Shop layout is excluded from admin scope routes so user navigation does not mix with admin login/dashboard surfaces.
- Hostname-based `app.localhost` / `admin.localhost` scope was not verified in this environment.
