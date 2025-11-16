# 🔒 보안 이슈 수정 완료 보고서

## ✅ 완료된 보안 수정 사항

### 1. **비밀번호 암호화** ✅
- **문제**: 비밀번호를 평문으로 저장 및 비교
- **해결**: Supabase Auth API 사용으로 전환
  - `AuthContext.tsx`: `signInWithPassword()`, `signUp()` 사용
  - `/supabase/functions/server/index.tsx`: `auth.admin.createUser()` 사용
  - `users` 테이블에서 password 컬럼 제거 (Auth에만 암호화되어 저장)

### 2. **CORS 완전 개방** ✅
- **문제**: `origin: "*"` - 모든 도메인 허용
- **해결**: 허용된 도메인만 접근 가능
```javascript
origin: (origin) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://your-app.vercel.app', // ⚠️ 배포 시 실제 도메인으로 변경!
  ];
  return allowedOrigins.includes(origin);
}
```

### 3. **관리자 권한 검증 누락** ✅
- **문제**: 누구나 관리자 API 호출 가능
- **해결**: 미들웨어 추가
  - `requireAdmin`: 관리자만 접근 (이미지 업로드/삭제, 관리자 생성)
  - `requireAuth`: 인증된 사용자 (리뷰 작성)
  - Supabase Auth 토큰으로 권한 검증

### 4. **프론트엔드 토큰 전달** ✅
- **문제**: anon key를 사용하여 서버 호출
- **해결**: access_token 사용
  - `AuthContext.tsx`: `getAccessToken()` 함수 추가
  - `AdminPage.tsx`: 이미지 업로드, 관리자 생성 시 토큰 전달
  - `ProductDetailPage.tsx`: 리뷰 작성 시 토큰 전달

### 5. **users 테이블 비밀번호 저장** ✅
- **문제**: Supabase Auth + users 테이블 중복, password 평문 저장
- **해결**: users 테이블에서 password 컬럼 제거
  - Supabase Auth에만 암호화되어 저장
  - users 테이블은 Legacy (추후 제거 권장)

---

## ⚠️ 배포 전 필수 작업 (당신이 해야 할 일!)

### **1. Supabase 프로젝트 생성 및 설정**

#### **Step 1: 새 프로젝트 생성**
1. https://app.supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 이름, 비밀번호 설정
4. 리전 선택 (Northeast Asia - Seoul 권장)

#### **Step 2: Authentication 설정**
```
Dashboard → Authentication → Providers
- Email 로그인 활성화
- "Enable email confirmations" OFF (이메일 서버 없으므로)
```

#### **Step 3: Database 설정**
**SQL Editor에서 실행:**

```sql
-- A. KV Store 테이블 생성
CREATE TABLE kv_store_94a0507e (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. 인덱스 생성
CREATE INDEX idx_kv_store_key_prefix 
ON kv_store_94a0507e (key text_pattern_ops);

-- C. RLS 활성화 ⚠️ 중요!
ALTER TABLE kv_store_94a0507e ENABLE ROW LEVEL SECURITY;

-- D. RLS 정책 생성
CREATE POLICY "Service role full access"
ON kv_store_94a0507e
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public read access"
ON kv_store_94a0507e
FOR SELECT
TO anon, authenticated
USING (true);
```

**⚠️ users 테이블은 생성하지 마세요!** (Legacy, Supabase Auth만 사용)

#### **Step 4: Storage 설정**
```
Dashboard → Storage → "New bucket"
- Name: make-94a0507e-products
- ✅ Public
- File size limit: 5MB
- Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp
```

#### **Step 5: Edge Function 배포**
터미널에서 실행:
```bash
# Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_ID

# Edge Function 배포
supabase functions deploy make-server-94a0507e

# 환경 변수 설정
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### **Step 6: CORS 도메인 변경 ⚠️ 중요!**
`/supabase/functions/server/index.tsx` 수정:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://YOUR-ACTUAL-VERCEL-DOMAIN.vercel.app', // ← 여기 변경!
];
```

변경 후 다시 배포:
```bash
supabase functions deploy make-server-94a0507e
```

---

### **2. Vercel 배포**

#### **Step 1: Vercel 프로젝트 생성**
1. https://vercel.com 접속
2. "Add New Project"
3. GitHub 레포지토리 연결
4. Framework Preset: Vite
5. Root Directory: `.`

#### **Step 2: 환경 변수 설정**
```
Settings → Environment Variables
```

추가할 변수:
```
VITE_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY = your_anon_key
```

#### **Step 3: 배포**
```bash
# Git push하면 자동 배포
git add .
git commit -m "Production ready with security fixes"
git push
```

---

### **3. Supabase URL Configuration**

Vercel 배포 완료 후:
```
Supabase Dashboard → Authentication → URL Configuration

Site URL: https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/**
```

---

### **4. 첫 관리자 계정 생성**

배포 완료 후, Supabase Dashboard에서:
```
Dashboard → Authentication → Users → "Add user"

Email: admin@example.com
Password: YourSecurePassword123!
User Metadata:
{
  "name": "관리자",
  "role": "admin"
}

✅ Auto Confirm User (체크)
```

---

## 🔍 보안 검증 체크리스트

배포 후 확인:

### **1. RLS 작동 확인**
브라우저 콘솔에서:
```javascript
// ❌ 이게 작동하면 안 됨 (RLS 제대로 설정된 경우)
const supabase = createClient(url, anonKey);
const { data, error } = await supabase
  .from('kv_store_94a0507e')
  .delete()
  .eq('key', 'reviews:1');
// → 에러 발생해야 정상!

// ✅ 이건 작동해야 함
const { data } = await supabase
  .from('kv_store_94a0507e')
  .select('*');
// → 읽기는 가능
```

### **2. 관리자 권한 확인**
1. 일반 사용자로 로그인
2. `/admin` 접속 시도 → 거부되어야 함
3. 관리자 로그인
4. 이미지 업로드, 관리자 생성 → 성공해야 함

### **3. CORS 확인**
다른 도메인에서 API 호출 시도 → 거부되어야 함

---

## 📋 추가 권장 사항 (선택)

### **1. Rate Limiting**
프로덕션 환경에서는 Vercel의 Rate Limiting 설정:
```
vercel.json:
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

### **2. 로그 모니터링**
```
Supabase Dashboard → Logs → Edge Functions
→ 에러 발생 시 알림 설정
```

### **3. 백업 설정**
```
Supabase Dashboard → Database → Backups
→ 자동 백업 활성화
```

---

## 🎯 최종 요약

### ✅ 코드 수정 완료 (자동):
- [x] 비밀번호 암호화 (Supabase Auth)
- [x] CORS 도메인 제한
- [x] 관리자 권한 검증
- [x] 토큰 기반 인증
- [x] users 테이블 password 제거

### ⚠️ 배포 시 해야 할 일 (수동):
1. [ ] 새 Supabase 프로젝트 생성
2. [ ] Database 테이블 생성 (SQL 실행)
3. [ ] RLS 활성화 및 정책 설정
4. [ ] Storage 버킷 생성
5. [ ] Edge Function 배포
6. [ ] **CORS 도메인 변경** (중요!)
7. [ ] Vercel 환경 변수 설정
8. [ ] Vercel 배포
9. [ ] Supabase URL Configuration
10. [ ] 첫 관리자 계정 생성

---

**배포 완료 후 이 파일은 삭제하세요!** (보안 정보 포함)
