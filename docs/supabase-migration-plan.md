# Supabase Migration Plan

## MCP4 현재 상태

- **초기 상태**: public application tables 없음, Edge Functions 없음, Storage bucket 없음, Realtime publication 대상 없음
- **적용 후 tables**: `products`, `user_accounts`, `admin_accounts`, `addresses`, `cart_items`, `orders`, `order_items`, `reviews`, `review_helpful`, `inquiries`, `login_attempts`
- **RPC/functions**: `is_admin`, `add_cart_item`, `sync_cart_items`, `increment_review_likes`, `decrement_review_likes`
- **Storage**: `product-images` bucket 생성
- **Realtime**: `orders`, `inquiries` added to `supabase_realtime`
- **Edge Function**: `shop-api` deployed and active

## 적용한 migrations

### `bootstrap_ecommerce_backend`

- Ecommerce 핵심 테이블 생성
- FK/index/RLS 활성화
- owner/admin 기반 RLS 정책 생성
- cart/review helper RPC 생성
- `product-images` bucket 생성
- `orders`, `inquiries` realtime publication 등록

### `harden_ecommerce_backend_advisors`

- `is_admin()` search_path 고정
- SECURITY DEFINER RPC의 anon/authenticated 직접 실행 권한 revoke
- public bucket object listing policy 제거
- FK 인덱스 추가
- `reviews` 중복 permissive policy 일부 정리

### `optimize_ecommerce_rls_performance`

- `auth.uid()` RLS initplan 경고가 발생하던 정책을 `(select auth.uid())` 형태로 최적화
- `admin_accounts` 중복 permissive SELECT 정책 정리

### `split_products_admin_write_policies`

- `products_admin_all` 정책을 insert/update/delete 전용 정책으로 분리
- public active product read 정책과 admin write 정책의 중복 SELECT advisor 제거

## 백업/schema/API 비교 결과

- **코드에서 필요한 테이블**: `products`, `user_accounts`, `admin_accounts`, `addresses`, `cart_items`, `orders`, `order_items`, `reviews`, `review_helpful`, `inquiries`, `login_attempts`
- **MCP4에 이미 있던 테이블**: application table 없음
- **누락되어 생성한 테이블**: 위 application tables 전체
- **코드에서 필요한 RPC**: `add_cart_item`, `sync_cart_items`, `increment_review_likes`, `decrement_review_likes`
- **누락되어 생성한 RPC**: 위 RPC 전체
- **코드에서 필요한 Edge Function**: `shop-api`
- **MCP4 Edge Function 상태**: deployed and active
- **코드에서 필요한 Storage bucket**: `product-images`
- **누락되어 생성한 Storage bucket**: `product-images`
- **Local smoke data**: one active E2E product, one customer test Auth user/profile, and one admin test Auth user/profile were created for account-based browser verification.

## Edge Function 전략

이번 단계는 기존 기능 복구 우선이므로 단일 Edge Function `shop-api` 유지가 가장 안전합니다.

- **선택안**: A안, 기존 단일 Edge Function 유지
- **이유**: 프론트 `API_BASE_URL`과 `NEXT_PUBLIC_API_ENDPOINT=shop-api` 계약 유지
- **보강 사항**: `DEPLOY_THIS.ts`의 admin/product/upload/order status 쓰기 라우트에 `verifyAdmin` 연결
- **배포 상태**: MCP4에 `shop-api` 배포 완료, `/shop-api/health` 및 `/shop-api/api/health` 정상 응답 확인

## 검증 완료

- Local public Supabase env configured in `apps/web/.env.local`.
- Account-based customer flow verified: login, account page, cart add/update/delete, checkout, order complete, orders page, review create, inquiry create/read.
- Account-based admin flow verified: login, dashboard, product create/update/delete smoke on test product, order status update, inquiry answer, scoped logout.
- API authorization verified: unauthenticated requests receive 401, customer requests to admin/mutation/upload/status endpoints receive 403, admin requests receive 200.
- Order integrity verified with real API calls: manipulated totals are recalculated from DB prices, missing/inactive products and invalid quantities are rejected with 400.
- `shop-api` remains active in MCP4.

## 남은 작업

- Auth Site URL 및 redirect URL dashboard 설정 확인
- Supabase Auth leaked password protection dashboard setting enablement
- Vercel runtime에 public Supabase env 설정
- Real image upload browser smoke
- Hostname-based `app.localhost` / `admin.localhost` scope smoke if needed
