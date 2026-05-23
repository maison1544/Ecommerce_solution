# Deployment Checklist

## Supabase

- [x] Public application tables created in MCP4.
- [x] RLS enabled on application tables.
- [x] Ecommerce RLS policies applied.
- [x] `product-images` bucket created.
- [x] `orders` and `inquiries` added to realtime publication.
- [x] `category_nav_labels` table uses numeric user-facing slugs with preserved internal `category_key` values and admin-managed labels/descriptions.
- [ ] Security advisors reviewed; Auth leaked password protection remains a dashboard action.
- [x] Performance advisor optimization pass for safe RLS policy items.
- [x] Deploy `shop-api` Edge Function.
- [x] Confirm Edge Function runtime has required env by successful health response:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [x] Confirm Edge Function runtime has `SUPABASE_ANON_KEY` before deploying scoped login.
- [x] Redeploy `shop-api` so `/shop-api/api/auth/login` is available in the deployed Edge Function.
- [ ] Confirm Auth Site URL and redirect URLs in Supabase dashboard.
- [x] Create test customer/admin accounts using safe server-side/Auth paths for local smoke testing.

## Vercel / Next.js

- [x] Root `vercel.json` uses `framework: nextjs`.
- [x] Root `vercel.json` uses `pnpm --filter web build`.
- [x] `npx tsc -p apps/web/tsconfig.json --noEmit --pretty false` passes locally.
- [x] Next.js middleware no longer throws 500 when local Supabase public env values are missing; protected routes redirect to login instead.
- [x] Legacy shop layout restored in Next.js App Router for user-facing routes.
- [x] `/` route restored to legacy `MainPage` structure with hero, featured products, and category sections.
- [ ] Configure Vercel project root/build settings for monorepo.
- [ ] Configure public env vars without printing real values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PROJECT_ID`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_ENDPOINT=shop-api`
  - `NEXT_PUBLIC_APP_INSTANCE=user` or deployment-specific value
- [ ] Configure server-only secrets only if Next.js server routes later require them.
- [x] Local `apps/web/.env.local` public Supabase env configured for smoke testing.

## Security

- [x] MCP config was not read and no secret values were printed.
- [x] README project ref replaced with placeholder.
- [x] JWT-looking doc sample replaced with safer placeholder.
- [x] Admin mutation routes in `DEPLOY_THIS.ts` require `verifyAdmin`.
- [x] Local Next `/api/auth/login` route is disabled and does not authenticate or return tokens.
- [x] Browser login uses the `shop-api` scoped Edge Function login endpoint and includes `scope`.
- [x] `verifyAdmin` and `verifyCustomer` enforce exclusive profile table membership in addition to role metadata.
- [x] Cross-table profile overlap is blocked by a non-destructive trigger migration; existing overlap query returned no rows.
- [x] Recalculate order totals from DB in Edge Function before production payment integration.
- [x] Upload endpoint authorization verified; file type/size policy review remains a production hardening task.

## Runtime smoke tests

- [x] `/api/health` through Edge Function returns OK.
- [x] Product list API loads from Supabase Edge Function.
- [x] Local `/`, numeric `/category/[slug]`, legacy `/category/special-deals`, `/login`, `/admin/login`, `/signup`, and `/search?q=test` render without console errors.
- [x] Local unauthenticated `/cart`, `/checkout`, `/admin`, and `/order-complete` redirect to the correct login route without console errors.
- [x] Customer test account has Auth user and `user_accounts` row.
- [ ] Login attempt limit works.
- [x] Scoped login endpoint works after `shop-api` redeploy; invalid login returns generic 401 and admin login succeeds from `/admin/login`.
- [x] Wrong-scope login shows only the generic login failure message after `shop-api` redeploy.
- [x] Cart add/update/delete works.
- [x] Order create/read works.
- [x] Review create works.
- [x] Inquiry create/read works.
- [x] Admin product create/update/delete smoke works on test products.
- [x] Admin order status update works.
- [x] Admin inquiry answer works.
- [x] Admin UX update static checks pass: full order IDs/addresses are no longer truncated, admin account is displayed, dashboard period stats UI uses existing protected admin APIs, and `/about` footer links are removed.
- [x] Admin notification bell is displayed in the admin header next to logout; popover settings, MP3 sound selection, unread badge, notification click-to-read behavior, pruning, pagination, and notification list icons without black rounded backgrounds are implemented.
- [x] Admin notification MP3 assets `/sounds/notification1.mp3` through `/sounds/notification5.mp3` return `200 audio/mpeg`.
- [x] Admin product image input accepts JPG/PNG/WebP/GIF, supports up to 4 images, uses slot-based individual add/delete/keep UX, uploads only pending images on save, preserves existing/uploaded URLs, marks failed slots, and resets upload/save state on all paths.
- [x] `/account/settings` email field is disabled/read-only and no frontend email duplicate/update path remains.
- [x] Admin category NAV management tab edits label, description, visibility, and sort order while hiding internal category keys in the UI and preserving internal `special-deals` category key behavior.
- [x] Admin product category filters/selects/tables display admin-managed category labels while keeping product payload category values as internal `category_key`.
- [ ] Admin realtime new order/inquiry toast and sound should still be verified with a live inserted order/inquiry after production Edge Function deployment if realtime publication settings change.
- [x] Unauthenticated users cannot call admin/order protected APIs.
- [x] Non-admin cannot call admin/product mutation/upload endpoints.
- [x] User/admin session isolation verified in browser with separate scoped cookies.
- [x] Local public-route and unauthenticated protected-route browser smoke passes without console errors when Supabase env is not configured.
- [x] Local browser app smoke with Supabase env configured.
- [x] UI completeness smoke verified header, navigation, logo, search, cart/account entry, footer, home hero, product/category/search/auth pages, and admin layout separation.

## Not run in this step

- Vercel deployment.
- Full Next.js build.
- Full lint.
- Destructive database rollback or data reset.
- Hostname-based `app.localhost` / `admin.localhost` scope smoke.
- Full product creation save with 4 production images; slot selection, append, delete, and save-state logic were statically verified, but final browser upload with real image files should be confirmed by the user.
- Production deployment of the updated `shop-api` Edge Function was completed in this step.
