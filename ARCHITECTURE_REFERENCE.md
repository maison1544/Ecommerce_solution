# E-commerce 프로젝트 아키텍처 레퍼런스

> 본 문서는 Supabase + Edge Functions 기반 E-commerce 프로젝트의 인증, API 처리, 백엔드 연동 방식을 상세히 설명합니다.

---

## 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [계정 인증 방식](#2-계정-인증-방식)
3. [API 처리 방식](#3-api-처리-방식)
4. [백엔드 연동 방식](#4-백엔드-연동-방식)
5. [보안 설계](#5-보안-설계)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [배포 및 인프라](#7-배포-및-인프라)

---

## 1. 전체 아키텍처 개요

### 1.1 기술 스택

```
Frontend: React + TypeScript + Vite
Backend: Supabase Edge Functions (Deno + Hono)
Database: PostgreSQL (Supabase)
Auth: Supabase Auth (JWT)
Hosting: Vercel (Frontend) + Supabase (Backend)
CDN/Security: Cloudflare
```

### 1.2 아키텍처 다이어그램

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│ Cloudflare  │ ← DNS, CDN, Security Rules
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Vercel    │ ← Static Hosting
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│   Supabase Edge Function    │ ← API Gateway
│   (Hono Framework)           │
└──────┬───────────────────────┘
       │
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
┌─────────┐   ┌──────────┐  ┌──────────┐
│Supabase │   │PostgreSQL│  │ Storage  │
│  Auth   │   │    DB    │  │  Bucket  │
└─────────┘   └──────────┘  └──────────┘
```

### 1.3 핵심 설계 원칙

1. **단일 Edge Function**: 모든 API를 하나의 Edge Function으로 통합
2. **JWT 기반 인증**: Supabase Auth의 JWT 토큰 사용
3. **Service Role Key**: 백엔드에서 RLS 우회하여 데이터 접근
4. **역할 기반 접근 제어**: user/admin 역할 분리
5. **IP 기반 보안**: 회원가입/로그인 시 IP 추적

---

## 2. 계정 인증 방식

### 2.1 인증 플로우

#### 회원가입 플로우

```
1. 사용자 입력 (이메일, 비밀번호, 이름, 전화번호)
   ↓
2. Frontend: POST /api/auth/signup
   - 클라이언트 IP 자동 포함
   ↓
3. Edge Function: 검증
   - 이메일 중복 체크 (Supabase Admin API)
   - 전화번호 중복 체크
   - 이메일 형식 검증
   - 비밀번호 강도 검증 (8자 이상)
   ↓
4. Supabase Auth: 계정 생성
   - supabase.auth.admin.createUser()
   - 이메일 확인 비활성화 (email_confirm: false)
   ↓
5. Database: user_accounts 테이블 삽입
   - id (UUID from auth.users)
   - email, name, phone
   - signup_ip (클라이언트 IP)
   - created_at
   ↓
6. Response: 성공 메시지
```

#### 로그인 플로우

```
1. 사용자 입력 (이메일, 비밀번호)
   ↓
2. Frontend: Supabase Client
   - supabase.auth.signInWithPassword()
   ↓
3. Supabase Auth: 인증
   - 비밀번호 검증
   - JWT 토큰 생성 (access_token, refresh_token)
   ↓
4. Frontend: 토큰 저장
   - localStorage에 자동 저장 (Supabase Client)
   ↓
5. Frontend: 사용자 정보 조회
   - POST /api/auth/me (JWT 토큰 포함)
   ↓
6. Edge Function: JWT 검증 + 사용자 정보 반환
   - user_accounts 또는 admin_accounts 조회
   - role 정보 포함 (user/admin)
   ↓
7. Frontend: AuthContext 업데이트
   - currentUser 상태 설정
   - 역할 기반 UI 렌더링
```

### 2.2 JWT 토큰 구조

```javascript
// Access Token (Supabase Auth 발급)
{
  "sub": "uuid-user-id",           // 사용자 ID
  "email": "user@example.com",     // 이메일
  "role": "authenticated",         // Supabase 역할
  "iat": 1234567890,               // 발급 시간
  "exp": 1234571490                // 만료 시간 (1시간)
}
```

### 2.3 인증 미들웨어 구현

```typescript
// Edge Function: JWT 검증 미들웨어
const verifyJWT = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    // Supabase로 JWT 검증
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: "Invalid token" }, 401);
    }

    // Context에 사용자 정보 저장
    c.set("userId", user.id);
    c.set("userEmail", user.email);

    // 역할 조회 (user_accounts 또는 admin_accounts)
    const { data: userAccount } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: adminAccount } = await supabase
      .from("admin_accounts")
      .select("*")
      .eq("id", user.id)
      .single();

    if (adminAccount) {
      c.set("userRole", "admin");
    } else if (userAccount) {
      c.set("userRole", "user");
    } else {
      return c.json({ error: "User not found" }, 404);
    }

    await next();
  } catch (err) {
    return c.json({ error: "Token verification failed" }, 401);
  }
};
```

### 2.4 역할 기반 접근 제어

```typescript
// 관리자 전용 미들웨어
const requireAdmin = async (c: Context, next: Next) => {
  const role = c.get("userRole");

  if (role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
};

// 라우트 적용 예시
app.get("/api/admin/users", verifyJWT, requireAdmin, async (c) => {
  // 관리자만 접근 가능
});
```

---

## 3. API 처리 방식

### 3.1 API 엔드포인트 구조

```
/api/auth/*          - 인증 관련
  POST /signup       - 회원가입
  POST /login        - 로그인 (사용 안 함, Supabase Client 직접 사용)
  POST /me           - 현재 사용자 정보
  POST /logout       - 로그아웃

/api/products/*      - 상품 관련
  GET  /             - 상품 목록 (페이지네이션)
  GET  /:id          - 상품 상세

/api/cart/*          - 장바구니 관련
  GET  /             - 장바구니 조회
  POST /sync         - 장바구니 동기화
  POST /item         - 아이템 추가
  PUT  /item/:id     - 수량 변경
  DELETE /item/:id   - 아이템 삭제
  DELETE /clear      - 전체 삭제

/api/orders/*        - 주문 관련
  GET  /             - 주문 목록
  POST /             - 주문 생성
  GET  /:id          - 주문 상세

/api/reviews/*       - 리뷰 관련
  GET  /product/:id  - 상품별 리뷰
  POST /             - 리뷰 작성
  POST /:id/like     - 좋아요
  DELETE /:id/like   - 좋아요 취소

/api/inquiries/*     - 문의 관련
  GET  /             - 문의 목록
  POST /             - 문의 작성

/api/admin/*         - 관리자 전용
  GET  /users        - 사용자 관리
  PUT  /users/:id    - 사용자 정보 수정
  POST /products     - 상품 등록
  PUT  /products/:id - 상품 수정
  DELETE /products/:id - 상품 삭제
  PUT  /orders/:id   - 주문 상태 변경
  POST /inquiries/:id/answer - 문의 답변
```

### 3.2 Hono 프레임워크 사용

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS 설정
app.use(
  "*",
  cors({
    origin: ["https://ata-1500.com", "https://www.ata-1500.com"],
    credentials: true,
  })
);

// 라우트 그룹화
const authRoutes = new Hono();
authRoutes.post("/signup", signupHandler);
authRoutes.post("/me", verifyJWT, getMeHandler);

const productRoutes = new Hono();
productRoutes.get("/", getProductsHandler);
productRoutes.get("/:id", getProductDetailHandler);

// 메인 앱에 마운트
app.route("/api/auth", authRoutes);
app.route("/api/products", productRoutes);

// Edge Function 엔트리포인트
Deno.serve(app.fetch);
```

### 3.3 요청/응답 처리 패턴

#### 표준 응답 형식

```typescript
// 성공 응답
{
  "data": { /* 데이터 */ },
  "message": "Success"
}

// 에러 응답
{
  "error": "Error message",
  "details": "Additional error details" // 선택적
}
```

#### 페이지네이션 응답

```typescript
{
  "data": [/* 아이템 배열 */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### 3.4 에러 처리

```typescript
// 글로벌 에러 핸들러
app.onError((err, c) => {
  console.error("Error:", err);

  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }

  if (err instanceof UnauthorizedError) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ error: "Internal server error" }, 500);
});
```

---

## 4. 백엔드 연동 방식

### 4.1 Frontend API 호출 패턴

#### API 유틸리티 설정

```typescript
// src/utils/api.ts
export const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT ||
  `https://${
    import.meta.env.VITE_SUPABASE_PROJECT_ID
  }.supabase.co/functions/v1/shop-api`;

// 인증된 요청 헬퍼
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}
```

#### 사용 예시

```typescript
// 장바구니 조회
const cartData = await authenticatedFetch("/api/cart");

// 주문 생성
const orderData = await authenticatedFetch("/api/orders", {
  method: "POST",
  body: JSON.stringify({
    items: cartItems,
    address: shippingAddress,
    totalAmount: 50000,
  }),
});
```

### 4.2 Supabase Client 설정

```typescript
// src/utils/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = `https://${
  import.meta.env.VITE_SUPABASE_PROJECT_ID
}.supabase.co`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

### 4.3 AuthContext 구현

```typescript
// src/context/AuthContext.tsx
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 세션 복원
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserData(session.access_token);
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await fetchUserData(session.access_token);
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCurrentUser(data.user);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data.session) {
      await fetchUserData(data.session.access_token);
    }
  };

  const signup = async (signupData: SignupData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, login, logout, signup }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

### 4.4 Realtime 구독 (관리자 알림)

```typescript
// src/components/AdminNotification.tsx
useEffect(() => {
  if (!isAdmin) return;

  // 주문 알림 구독
  const orderChannel = supabase
    .channel("admin-orders-notification")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
      },
      (payload) => {
        showNotification({
          title: "새로운 주문",
          message: `주문번호: ${payload.new.id}`,
          link: "/admin?tab=orders",
        });
        playSound();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(orderChannel);
  };
}, [isAdmin]);
```

---

## 5. 보안 설계

### 5.1 인증 보안

#### JWT 토큰 관리

- Access Token: 1시간 유효
- Refresh Token: 자동 갱신 (Supabase Client)
- 토큰 저장: localStorage (Supabase Client 자동 관리)

#### 비밀번호 정책

```typescript
// 최소 8자 이상
if (password.length < 8) {
  throw new Error("비밀번호는 최소 8자 이상이어야 합니다");
}
```

#### 로그인 시도 제한

```sql
-- login_attempts 테이블로 관리
CREATE TABLE login_attempts (
  email TEXT UNIQUE,
  attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ
);

-- 5회 실패 시 30분 잠금
```

### 5.2 API 보안

#### CORS 설정

```typescript
cors({
  origin: ["https://ata-1500.com", "https://www.ata-1500.com"],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
});
```

#### Rate Limiting (Cloudflare)

- 일반 API: 100 req/min per IP
- 로그인/회원가입: 10 req/min per IP

#### SQL Injection 방지

```typescript
// Supabase Client는 자동으로 파라미터화된 쿼리 사용
const { data } = await supabase
  .from("products")
  .select("*")
  .eq("id", productId); // 안전
```

### 5.3 데이터 접근 제어

#### Service Role Key 사용

```typescript
// Edge Function에서만 Service Role Key 사용
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // RLS 우회
);
```

#### RLS (Row Level Security)

```sql
-- 사용자는 본인 데이터만 접근
CREATE POLICY "Users can view own cart"
ON cart_items FOR SELECT
USING (auth.uid() = user_id);

-- Service Role은 모든 데이터 접근
CREATE POLICY "Service role full access"
ON cart_items FOR ALL
USING (true);
```

#### Edge Function에서 권한 검증

```typescript
// userId 기반 필터링
const userId = c.get("userId");

const { data: orders } = await supabase
  .from("orders")
  .select("*")
  .eq("user_id", userId); // 본인 주문만 조회
```

### 5.4 IP 추적 및 차단

```typescript
// 클라이언트 IP 추출
const clientIp = c.req.header("x-forwarded-for")?.split(",")[0] ||
                 c.req.header("x-real-ip") ||
                 "unknown";

// 회원가입 시 IP 저장
await supabase.from("user_accounts").insert({
  id: user.id,
  email,
  signup_ip: clientIp,
});

// 의심스러운 IP 차단 (수동)
UPDATE user_accounts
SET is_blocked = true, blocked_at = NOW()
WHERE signup_ip = '악성IP';
```

---

## 6. 데이터베이스 설계

### 6.1 주요 테이블 구조

#### auth.users (Supabase 기본 테이블)

```sql
-- Supabase Auth가 자동 관리
id UUID PRIMARY KEY
email TEXT
encrypted_password TEXT
created_at TIMESTAMPTZ
```

#### user_accounts (일반 사용자)

```sql
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '이름 없음',
  phone TEXT,
  default_address_id BIGINT REFERENCES addresses(id),
  signup_ip TEXT,
  last_login_ip TEXT,
  last_login_at TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### admin_accounts (관리자)

```sql
CREATE TABLE admin_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_by_email TEXT,
  created_by_ip TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### products (상품)

```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  original_price NUMERIC,
  category TEXT NOT NULL,
  has_discount BOOLEAN DEFAULT false,
  discount INTEGER CHECK (discount >= 0 AND discount <= 100),
  images TEXT[] DEFAULT '{}',
  rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  description TEXT,
  specs TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### cart_items (장바구니)

```sql
CREATE TABLE cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  product_name TEXT,
  price NUMERIC,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id) -- 중복 방지
);
```

#### orders (주문)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_date TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT '배송 준비 중',
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  recipient TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 RPC 함수

#### add_cart_item (장바구니 아이템 추가/업데이트)

```sql
CREATE OR REPLACE FUNCTION add_cart_item(
  p_user_id UUID,
  p_product_id INTEGER,
  p_product_name TEXT,
  p_price NUMERIC,
  p_quantity INTEGER,
  p_image TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  v_existing_id BIGINT;
  v_new_quantity INTEGER;
BEGIN
  -- 기존 아이템 확인
  SELECT id, quantity INTO v_existing_id, v_new_quantity
  FROM cart_items
  WHERE user_id = p_user_id AND product_id = p_product_id;

  IF v_existing_id IS NOT NULL THEN
    -- 수량 업데이트
    v_new_quantity := v_new_quantity + p_quantity;
    UPDATE cart_items SET quantity = v_new_quantity WHERE id = v_existing_id;
    RETURN json_build_object('action', 'updated', 'id', v_existing_id);
  ELSE
    -- 새 아이템 추가
    INSERT INTO cart_items (user_id, product_id, product_name, price, quantity, image)
    VALUES (p_user_id, p_product_id, p_product_name, p_price, p_quantity, p_image)
    RETURNING id INTO v_existing_id;
    RETURN json_build_object('action', 'inserted', 'id', v_existing_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### sync_cart_items (장바구니 전체 동기화)

```sql
CREATE OR REPLACE FUNCTION sync_cart_items(
  p_user_id UUID,
  p_cart_items JSONB
) RETURNS JSON AS $$
-- 로컬 장바구니와 DB 동기화
-- 삭제, 추가, 업데이트를 한 번에 처리
$$;
```

### 6.3 인덱스 최적화

```sql
-- 자주 조회되는 컬럼에 인덱스
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
```

---

## 7. 배포 및 인프라

### 7.1 환경 변수 관리

#### Frontend (.env)

```bash
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_ENDPOINT=https://your-project.supabase.co/functions/v1/shop-api
```

#### Backend (Supabase Edge Function)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 7.2 배포 프로세스

#### Frontend (Vercel)

```bash
# GitHub 연동 후 자동 배포
git push origin main
# → Vercel이 자동으로 빌드 및 배포
```

#### Backend (Supabase Edge Function)

```bash
# Supabase Dashboard에서 수동 배포
1. Functions 메뉴 선택
2. Create new function
3. DEPLOY_THIS.ts 코드 복사
4. Deploy 클릭
```

### 7.3 도메인 설정

#### Vercel

```
도메인: ata-1500.com, www.ata-1500.com
DNS: Cloudflare
```

#### Cloudflare DNS

```
A    @      76.76.21.21 (Vercel IP)
CNAME www   cname.vercel-dns.com
```

### 7.4 모니터링

#### Supabase Dashboard

- Edge Function 로그
- Database 쿼리 성능
- Auth 통계

#### Vercel Analytics

- 페이지 뷰
- 성능 메트릭
- 에러 추적

---

## 8. 참고 코드 위치

### 8.1 주요 파일 구조

```
프로젝트/
├── src/
│   ├── context/
│   │   └── AuthContext.tsx          # 인증 컨텍스트
│   ├── utils/
│   │   ├── api.ts                   # API 유틸리티
│   │   └── supabase/
│   │       └── client.ts            # Supabase 클라이언트
│   ├── pages/
│   │   ├── SignupPage.tsx           # 회원가입
│   │   ├── AccountPage.tsx          # 마이페이지
│   │   └── AdminPage.tsx            # 관리자 페이지
│   └── components/
│       └── AdminNotification.tsx    # 실시간 알림
├── database/
│   └── schema.sql                   # DB 스키마
├── DEPLOY_THIS.ts                   # Edge Function 코드
└── vercel.json                      # Vercel 설정
```

### 8.2 핵심 코드 참조

1. **인증 로직**: `src/context/AuthContext.tsx`
2. **API 호출**: `src/utils/api.ts`
3. **Edge Function**: `DEPLOY_THIS.ts`
4. **DB 스키마**: `database/schema.sql`
5. **관리자 알림**: `src/components/AdminNotification.tsx`

---

## 9. 다른 프로젝트 적용 가이드

### 9.1 필수 단계

1. **Supabase 프로젝트 생성**
2. **schema.sql 실행** (테이블 + RLS + RPC)
3. **Edge Function 배포** (DEPLOY_THIS.ts)
4. **환경 변수 설정** (.env)
5. **Frontend 코드 복사** (AuthContext, API 유틸)
6. **Vercel 배포**

### 9.2 커스터마이징 포인트

- **테이블 구조**: 필요한 필드 추가/제거
- **RLS 정책**: 접근 권한 규칙 수정
- **API 엔드포인트**: 비즈니스 로직에 맞게 추가
- **인증 플로우**: 소셜 로그인, 2FA 등 추가 가능

### 9.3 주의사항

1. **Service Role Key 보안**: 절대 Frontend에 노출 금지
2. **RLS 정책**: Edge Function은 Service Role로 우회
3. **JWT 검증**: 모든 보호된 API에서 필수
4. **IP 추적**: GDPR 등 개인정보 보호법 준수

---

## 10. 결론

본 프로젝트는 **Supabase + Edge Functions**를 활용하여 다음을 구현했습니다:

✅ **JWT 기반 인증** - 안전하고 확장 가능  
✅ **단일 Edge Function** - 관리 용이, 배포 간편  
✅ **Service Role + RLS** - 백엔드 보안 강화  
✅ **역할 기반 접근 제어** - user/admin 분리  
✅ **Realtime 알림** - 관리자 실시간 모니터링

이 아키텍처는 **중소규모 E-commerce**에 최적화되어 있으며, 다른 프로젝트에도 쉽게 적용 가능합니다.

---

**문서 버전**: 1.0  
**작성일**: 2026-01-02  
**프로젝트**: Solution Studio E-commerce
