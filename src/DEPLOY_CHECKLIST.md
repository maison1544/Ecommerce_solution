# 🚀 프로덕션 배포 체크리스트

## 📌 빠른 가이드

### 1. Supabase 설정 (15분)
```bash
# 1) app.supabase.com → 새 프로젝트 생성
# 2) SQL Editor에서 실행:
```

```sql
-- 테이블 생성
CREATE TABLE kv_store_94a0507e (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kv_store_key_prefix ON kv_store_94a0507e (key text_pattern_ops);

-- RLS 활성화
ALTER TABLE kv_store_94a0507e ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON kv_store_94a0507e FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public read access" ON kv_store_94a0507e FOR SELECT TO anon, authenticated USING (true);
```

```bash
# 3) Storage → New bucket → "make-94a0507e-products" (Public)
# 4) Authentication → Email Provider 활성화, Email Confirmations OFF
```

---

### 2. Edge Function 배포 (5분)
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy make-server-94a0507e

# 환경 변수 설정
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

### 3. ⚠️ CORS 도메인 변경 (중요!)
**`/supabase/functions/server/index.tsx` 16줄:**
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

---

### 4. Vercel 배포 (5분)
```bash
# 1) vercel.com → New Project → GitHub 연결
# 2) Environment Variables 추가:
#    VITE_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
#    VITE_SUPABASE_ANON_KEY = your_anon_key
# 3) Deploy
```

---

### 5. 첫 관리자 생성 (2분)
**Supabase Dashboard → Authentication → Users → Add user:**
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

---

### 6. URL Configuration
**Supabase Dashboard → Authentication → URL Configuration:**
```
Site URL: https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/**
```

---

## ✅ 배포 완료 확인

1. [ ] 관리자 로그인 → `/admin` 접근 성공
2. [ ] 일반 회원가입 → 로그인 성공
3. [ ] 상품 이미지 업로드 테스트
4. [ ] 상품 후기 작성 테스트
5. [ ] 브라우저 콘솔 에러 없음

---

## 🔒 보안 검증

브라우저 콘솔에서:
```javascript
// ❌ 이게 실행되면 안 됨 (RLS 작동 확인)
const { data } = await supabase.from('kv_store_94a0507e').delete().eq('key', 'test');
// → "new row violates row-level security policy" 에러 발생해야 정상!
```

---

**자세한 내용은 `/SECURITY_FIXES.md` 참고**
