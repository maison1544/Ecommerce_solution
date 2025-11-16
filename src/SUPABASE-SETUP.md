# 🚀 Supabase 데이터베이스 설정 가이드

## 📋 1단계: SQL 실행

### 1️⃣ **스키마 생성**

1. Supabase 대시보드 접속: https://supabase.com/dashboard
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. `supabase-migration.sql` 파일 내용 전체 복사
5. SQL Editor에 붙여넣기
6. **RUN** 버튼 클릭

✅ **결과:** 8개 테이블 생성 완료!
- users
- products
- addresses
- cart_items
- orders
- order_items
- reviews
- inquiries

---

### 2️⃣ **더미 데이터 삽입**

1. SQL Editor에서 **New Query** 클릭
2. `supabase-seed-data.sql` 파일 내용 전체 복사
3. SQL Editor에 붙여넣기
4. **RUN** 버튼 클릭

✅ **결과:** 샘플 데이터 삽입 완료!
- 테스트 계정 3개
- 상품 12개
- 배송지 3개
- 리뷰 4개
- 주문 2개
- 문의 2개

---

## 📦 2단계: 전체 상품 데이터 업로드 (100개)

SQL로 100개 상품을 모두 INSERT하는 것은 비효율적입니다.  
대신 **Supabase Table Editor**로 CSV 업로드를 권장합니다:

### 방법 1: CSV 업로드 (추천)

1. Supabase 대시보드 → **Table Editor**
2. `products` 테이블 클릭
3. 우측 상단 **Insert** → **Import data from CSV**
4. CSV 파일 업로드

**또는**

### 방법 2: 코드로 자동 업로드 (자동화)

나중에 TypeScript 코드로 `/data/products.ts`의 100개 상품을 자동으로 Supabase에 INSERT하는 스크립트를 실행할 수 있습니다.

---

## 🔐 3단계: API 키 확인

Supabase 연결이 완료되어 이미 환경 변수가 설정되어 있습니다!

확인 방법:
1. Supabase 대시보드 → **Settings** → **API**
2. 다음 정보 확인:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiI...`

---

## ✅ 4단계: 연결 테스트

SQL이 모두 실행되면, 다음 단계에서 React 코드를 수정하여 Supabase와 연동합니다.

---

## 🎯 테스트 계정 정보

### 일반 고객 계정
- **이메일**: `hong@example.com`
- **비밀번호**: `Password123`

### 관리자 계정
- **이메일**: `admin@example.com`
- **비밀번호**: `Admin123!`

---

## 📊 생성된 데이터베이스 구조

```
users (회원)
  ↓
├─ addresses (배송지)
├─ cart_items (장바구니) → products
├─ orders (주문)
│   └─ order_items (주문 상세) → products
├─ inquiries (문의)
└─ reviews (리뷰) → products
```

---

## 🚨 중요 사항

### ⚠️ RLS (Row Level Security)

현재 RLS가 활성화되어 있습니다.  
프로토타입 단계에서는 **RLS를 일시적으로 비활성화**하는 것을 권장합니다:

```sql
-- 모든 테이블의 RLS 비활성화 (개발용)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries DISABLE ROW LEVEL SECURITY;
```

**또는** SQL Editor에서:

```sql
-- Supabase 대시보드 → Authentication → Policies
-- 각 테이블에서 "Disable RLS" 클릭
```

---

## 📝 다음 단계

1. ✅ SQL 실행 완료
2. ✅ 테스트 데이터 삽입 완료
3. ⏳ React 코드 수정 (Supabase Client 연동)
4. ⏳ 100개 상품 데이터 업로드
5. ⏳ 테스트 및 배포

---

준비되셨으면 말씀해주세요! React 코드 수정을 시작하겠습니다 🚀
