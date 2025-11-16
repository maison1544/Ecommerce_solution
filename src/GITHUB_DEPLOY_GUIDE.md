# 🚀 GitHub → Vercel 배포 완벽 가이드

## 📦 1단계: 로컬에 프로젝트 다운로드

Figma Make에서 모든 파일을 다운로드하세요.

### 필요한 파일 구조:
```
ecommerce-project/
├── src/
│   ├── main.tsx         ✅ 생성됨
│   └── index.css        ✅ 생성됨
├── components/          ✅ 모든 컴포넌트
├── pages/              ✅ 모든 페이지
├── context/            ✅ AuthContext, CartContext
├── data/               ✅ products, reviews 등
├── styles/             ✅ globals.css
├── supabase/           ✅ Edge Functions
├── utils/              ✅ Supabase client
├── App.tsx             ✅
├── index.html          ✅ 생성됨
├── package.json        ✅ 생성됨
├── vite.config.ts      ✅ 생성됨
├── tsconfig.json       ✅ 생성됨
├── vercel.json         ✅ 생성됨
├── .gitignore          ✅ 생성됨
└── README.md           ✅ 생성됨
```

---

## 🔧 2단계: 로컬에서 Git 초기화

터미널에서 프로젝트 폴더로 이동 후:

```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: E-Commerce website with Supabase"
```

---

## 🌐 3단계: GitHub Repository 생성

### 방법 1: GitHub 웹사이트에서
1. https://github.com/new 접속
2. Repository name: `ecommerce-website` (원하는 이름)
3. Description: "E-Commerce website with Supabase + Vercel"
4. **Public** 또는 **Private** 선택
5. ❌ **Add README 체크 해제** (이미 있음)
6. "Create repository" 클릭

### 방법 2: GitHub CLI로
```bash
gh repo create ecommerce-website --public --source=. --remote=origin
```

---

## 📤 4단계: GitHub에 푸시

GitHub에서 생성된 repository URL 복사 후:

```bash
# Remote 추가
git remote add origin https://github.com/YOUR_USERNAME/ecommerce-website.git

# Push
git branch -M main
git push -u origin main
```

**성공!** GitHub에 코드가 올라갔습니다! 🎉

---

## 🚀 5단계: Vercel에서 Import

### 1) Vercel 로그인
https://vercel.com/dashboard

### 2) "Add New" → "Project"

### 3) GitHub Repository 선택
- "Import Git Repository" 섹션에서
- 방금 만든 `ecommerce-website` 선택
- "Import" 클릭

### 4) 프로젝트 설정

**Framework Preset**: Vite (자동 감지됨)

**Root Directory**: `.` (그대로 두기)

**Build Command**: `npm run build` (기본값)

**Output Directory**: `dist` (기본값)

**Install Command**: `npm install` (기본값)

### 5) Environment Variables 추가

"Environment Variables" 섹션에서:

```
Name: VITE_SUPABASE_URL
Value: https://YOUR_PROJECT_ID.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **주의**: Supabase 프로젝트가 아직 없다면 먼저 생성해야 합니다!

### 6) "Deploy" 클릭

배포 진행... ⏳ (1-3분 소요)

---

## ✅ 6단계: 배포 완료 후 확인

### 1) Vercel 도메인 확인
배포 완료 후 자동으로 할당되는 도메인:
```
https://ecommerce-website-xxxxx.vercel.app
```

### 2) ⚠️ **CORS 도메인 업데이트 (필수!)**

**로컬에서** `/supabase/functions/server/index.tsx` 수정:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://ecommerce-website-xxxxx.vercel.app', // ← Vercel 도메인으로 변경!
];
```

**저장 후 GitHub에 푸시:**
```bash
git add supabase/functions/server/index.tsx
git commit -m "Update CORS domain for production"
git push
```

**Supabase Edge Function 재배포:**
```bash
supabase functions deploy make-server-94a0507e
```

### 3) Supabase URL Configuration

Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://ecommerce-website-xxxxx.vercel.app
Redirect URLs: https://ecommerce-website-xxxxx.vercel.app/**
```

---

## 🎯 7단계: 테스트

1. **회원가입** → 성공하는지 확인
2. **로그인** → 성공하는지 확인
3. **상품 보기** → 이미지가 보이는지 확인
4. **관리자 로그인** → `/admin` 접근 가능한지 확인
5. **브라우저 콘솔** → 에러 없는지 확인

---

## 🔄 업데이트 배포 방법

코드 수정 후:
```bash
git add .
git commit -m "Update: 변경 내용 설명"
git push
```

→ Vercel이 자동으로 감지하여 재배포! 🚀

---

## ⚠️ 문제 해결

### 문제 1: "Failed to compile"
**원인**: 의존성 설치 실패  
**해결**: Vercel Dashboard → Deployments → 실패한 배포 클릭 → 로그 확인

### 문제 2: "Network Error" / CORS 에러
**원인**: CORS 도메인 설정 안 됨  
**해결**: 6단계 2번 다시 확인!

### 문제 3: Supabase 연결 실패
**원인**: 환경 변수 누락  
**해결**: Vercel → Settings → Environment Variables 확인

### 문제 4: 이미지 안 보임
**원인**: Supabase Storage 버킷 생성 안 됨  
**해결**: 
```
Supabase Dashboard → Storage → New bucket
Name: make-94a0507e-products
Public: ✅
```

### 문제 5: 관리자 페이지 접근 불가
**원인**: 관리자 계정 없음  
**해결**:
```
Supabase Dashboard → Authentication → Users → Add user
user_metadata: { "role": "admin", "name": "관리자" }
```

---

## 📝 체크리스트

배포 전:
- [ ] 로컬에서 `npm run build` 성공
- [ ] `.gitignore` 확인 (node_modules 포함)
- [ ] Supabase 프로젝트 생성 완료
- [ ] Database 테이블 생성 완료
- [ ] Storage 버킷 생성 완료
- [ ] Edge Function 배포 완료

배포 후:
- [ ] Vercel 환경 변수 설정
- [ ] CORS 도메인 업데이트
- [ ] Supabase URL Configuration
- [ ] 첫 관리자 계정 생성
- [ ] 회원가입/로그인 테스트
- [ ] 관리자 페이지 테스트

---

## 🎉 완료!

모든 단계를 완료하면 프로덕션 환경에서 완벽하게 작동하는 이커머스 웹사이트가 배포됩니다!

**접속**: https://ecommerce-website-xxxxx.vercel.app

---

## 🔗 유용한 링크

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- GitHub Repository: https://github.com/YOUR_USERNAME/ecommerce-website
- Edge Function 로그: Supabase Dashboard → Edge Functions → Logs

---

**문제가 생기면 Vercel/Supabase 로그를 먼저 확인하세요!** 📊
