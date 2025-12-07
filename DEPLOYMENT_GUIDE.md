# 🚀 Solution Studio 배포 가이드

## 📋 목차

1. [GitHub 업로드](#1-github-업로드-원본)
2. [복제 배포 가이드](#2-복제-배포-가이드)
3. [Cloudflare 설정](#3-cloudflare-설정)
4. [문제 해결](#4-문제-해결)

---

## 1. GitHub 업로드 (원본)

### 1.1 GitHub 저장소 생성

1. GitHub.com에서 **New Repository** 클릭
2. Repository name: `solution-studio-ecommerce` (원하는 이름)
3. **Private** 선택 (권장)
4. **Create repository** 클릭

### 1.2 로컬에서 업로드

```bash
# 프로젝트 폴더로 이동
cd C:\Users\Windows X\Desktop\ecommercing\Applyresponsivedesign

# Git 초기화
git init

# 모든 파일 추가 (.gitignore 규칙 적용됨)
git add .

# 커밋
git commit -m "Initial commit: Solution Studio E-commerce"

# 원격 저장소 연결 (YOUR_USERNAME을 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/solution-studio-ecommerce.git

# 업로드
git branch -M main
git push -u origin main
```

### 1.3 .gitignore로 제외되는 것들

- `node_modules/` - npm 패키지 (복제 후 `npm install`로 재설치)
- `.env` - 환경 변수 (복제 후 직접 생성)
- `dist/` - 빌드 결과물 (복제 후 `npm run build`로 재생성)

---

## 2. 복제 배포 가이드

### 📌 전체 흐름

```
GitHub Clone → Supabase 설정 → Vercel 배포 → Cloudflare DNS 연결
```

### 2.1 GitHub에서 복제

```bash
# 원하는 위치에서
git clone https://github.com/YOUR_USERNAME/solution-studio-ecommerce.git my-shop
cd my-shop

# 의존성 설치
npm install
```

### 2.2 Supabase 프로젝트 생성

#### A. 프로젝트 생성

1. https://supabase.com 로그인
2. **New Project** 클릭
3. 프로젝트 이름, 비밀번호 설정
4. Region: **Northeast Asia (Seoul)** 권장
5. **Create new project** 클릭 (2-3분 소요)

#### B. 데이터베이스 스키마 적용

1. Supabase Dashboard → **SQL Editor**
2. `database/schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기 후 **Run** 클릭

#### C. Edge Function 배포

```bash
# Supabase CLI 설치 (처음 한 번만)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_ID

# Edge Function 배포
supabase functions deploy shop-api --project-ref YOUR_PROJECT_ID
```

> **YOUR_PROJECT_ID**: Supabase Dashboard URL에서 확인
> `https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]`

#### D. 환경 변수 확인

Supabase Dashboard → **Settings** → **API**에서:

- **Project URL**: `https://xxxxx.supabase.co`
- **anon public key**: `eyJhbGci...`

### 2.3 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_API_ENDPOINT=shop-api
```

### 2.4 로컬 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

### 2.5 Vercel 배포

#### A. Vercel 프로젝트 생성

1. https://vercel.com 로그인
2. **Add New** → **Project**
3. **Import Git Repository** → GitHub 저장소 선택
4. Framework Preset: **Vite** 자동 감지

#### B. 환경 변수 설정

Vercel Dashboard → **Settings** → **Environment Variables**:

| Name                       | Value             |
| -------------------------- | ----------------- |
| `VITE_SUPABASE_PROJECT_ID` | `your_project_id` |
| `VITE_SUPABASE_ANON_KEY`   | `your_anon_key`   |
| `VITE_API_ENDPOINT`        | `shop-api`        |

#### C. 배포

**Deploy** 클릭 → 자동 빌드 및 배포

---

## 3. Cloudflare 설정

### 3.1 Cloudflare에 도메인 추가 (이미 완료된 경우 건너뛰기)

1. https://dash.cloudflare.com 로그인
2. **Add a Site** → 도메인 입력
3. Plan 선택 (Free 가능)
4. 네임서버를 Cloudflare 제공 값으로 변경 (도메인 등록업체에서)

### 3.2 Vercel과 연결

#### A. Vercel에서 도메인 추가

1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Domains**
3. 도메인 입력 (예: `shop.yourdomain.com`)
4. **Add** 클릭

#### B. Cloudflare DNS 설정

Cloudflare Dashboard → **DNS** → **Records**:

**CNAME 레코드 추가:**
| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `shop` (서브도메인) 또는 `@` (루트) | `cname.vercel-dns.com` | DNS only (회색 구름) |

> ⚠️ **중요**: Proxy 상태를 **DNS only** (회색 구름)로 설정해야 Vercel SSL이 제대로 작동합니다.

#### C. SSL/TLS 설정

Cloudflare Dashboard → **SSL/TLS**:

- **Overview** → **Full (strict)** 선택
- **Edge Certificates** → **Always Use HTTPS** ON

### 3.3 확인

1. Vercel Dashboard에서 도메인 상태가 **Valid Configuration** 확인
2. 브라우저에서 `https://shop.yourdomain.com` 접속 테스트

---

## 4. 문제 해결

### Q: `npm install` 에러

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### Q: Supabase Edge Function 404 에러

- Edge Function 이름이 `shop-api`인지 확인
- `VITE_API_ENDPOINT` 환경 변수가 `shop-api`인지 확인

### Q: Vercel 빌드 실패

- 환경 변수가 모두 설정되었는지 확인
- Vercel Dashboard → **Deployments** → 로그 확인

### Q: Cloudflare SSL 에러

- DNS 레코드의 Proxy 상태를 **DNS only**로 변경
- 24시간 후 재시도 (DNS 전파 시간)

### Q: 관리자 계정 생성

- 첫 번째 사용자로 회원가입 후
- Supabase Dashboard → SQL Editor에서:

```sql
-- 사용자를 관리자로 전환
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb WHERE email = 'admin@example.com';

-- admin_accounts 테이블에 추가
INSERT INTO admin_accounts (id, email, name)
SELECT id, email, raw_user_meta_data->>'name'
FROM auth.users WHERE email = 'admin@example.com';

-- user_accounts에서 제거
DELETE FROM user_accounts WHERE email = 'admin@example.com';
```

---

## 📁 프로젝트 구조

```
my-shop/
├── .env.example          # 환경 변수 템플릿
├── .gitignore            # Git 제외 파일
├── DEPLOY_THIS.ts        # Edge Function 소스
├── DEPLOYMENT_GUIDE.md   # 이 가이드
├── database/
│   └── schema.sql        # DB 스키마
├── public/
│   ├── favicon.svg
│   ├── og-image.svg
│   └── robots.txt
├── src/
│   ├── components/
│   ├── context/
│   ├── data/             # 로컬 테스트 데이터
│   ├── pages/
│   └── utils/
├── index.html
├── package.json
├── vercel.json
└── vite.config.ts
```

---

## ✅ 체크리스트

배포 전 확인:

- [ ] `.env` 파일 생성 완료
- [ ] Supabase 프로젝트 생성 완료
- [ ] SQL 스키마 적용 완료
- [ ] Edge Function 배포 완료
- [ ] `npm run build` 성공
- [ ] Vercel 환경 변수 설정 완료
- [ ] Cloudflare DNS 설정 완료

---

**작성일**: 2025-12-08
**버전**: 1.0.0
