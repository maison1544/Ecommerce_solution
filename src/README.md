# E-Commerce Website

Supabase + Vercel 기반 풀스택 이커머스 웹사이트

## 🚀 배포 가이드

### 1. Supabase 설정

#### Database 테이블 생성
```sql
CREATE TABLE kv_store_94a0507e (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kv_store_key_prefix ON kv_store_94a0507e (key text_pattern_ops);

-- RLS 활성화
ALTER TABLE kv_store_94a0507e ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON kv_store_94a0507e 
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON kv_store_94a0507e 
FOR SELECT TO anon, authenticated USING (true);
```

#### Storage 버킷 생성
- Name: `make-94a0507e-products`
- Public: ✅

#### Authentication 설정
- Email Provider: ✅ 활성화
- Email Confirmations: ❌ OFF

### 2. Edge Function 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인 및 프로젝트 연결
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Edge Function 배포
supabase functions deploy make-server-94a0507e

# 환경 변수 설정
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. ⚠️ CORS 도메인 변경 (필수!)

`/supabase/functions/server/index.tsx` 파일 16줄:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://YOUR-VERCEL-DOMAIN.vercel.app', // ← 실제 도메인으로 변경!
];
```

변경 후 재배포:
```bash
supabase functions deploy make-server-94a0507e
```

### 4. Vercel 배포

#### Environment Variables
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. 첫 관리자 계정 생성

Supabase Dashboard → Authentication → Users → Add user
```json
{
  "email": "admin@example.com",
  "password": "YourPassword123!",
  "user_metadata": {
    "name": "관리자",
    "role": "admin"
  }
}
```
✅ Auto Confirm User 체크!

### 6. URL Configuration

Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/**
```

## 🔒 보안 기능

- ✅ Supabase Auth 기반 인증
- ✅ RLS (Row Level Security) 활성화
- ✅ 관리자 권한 검증
- ✅ CORS 도메인 제한
- ✅ Access Token 기반 API 호출

## 📦 기술 스택

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Hono)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Auth**: Supabase Auth
- **Deployment**: Vercel + Supabase

## 🧩 주요 기능

- 21개 페이지 (홈, 상품상세, 장바구니, 주문, 마이페이지, 관리자 등)
- 13개 카테고리별 100개 상품
- 관리자 CRM 페이지
- 상품 후기 시스템 (영구 저장)
- 이미지 업로드 (최대 4개)
- 검색, 정렬, 필터링
- 반응형 디자인

## 📖 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 미리보기
npm run preview
```

## 📝 Notes

- 배포 후 `/SECURITY_FIXES.md`, `/DEPLOY_CHECKLIST.md` 파일 삭제 권장
- 첫 관리자는 Supabase Dashboard에서 생성 필요
- CORS 도메인 변경 필수!
