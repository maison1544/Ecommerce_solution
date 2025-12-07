# 🛍️ E-Commerce Platform with Supabase

현대적인 React + Supabase 기반 전자상거래 플랫폼

## 🌟 주요 기능

### 사용자 기능

- ✅ 회원가입 및 로그인 (Supabase Auth)
- 🛒 장바구니 관리
- 📦 주문 및 주문 내역 조회
- 📍 배송지 관리
- ⭐ 상품 리뷰 작성 및 조회
- 💬 고객 문의

### 관리자 기능

- 👥 사용자 관리 (차단/해제)
- 📊 주문 관리
- 💬 문의사항 답변
- 📦 상품 관리 (CRUD)

### 기술 스택

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Styling**: TailwindCSS, Radix UI
- **State Management**: React Context API
- **Routing**: React Router v6
- **Deployment**: Vercel

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일이 이미 설정되어 있습니다:

```env
VITE_SUPABASE_URL=https://gpyuopwpxfwhbnkcltev.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Supabase 설정

#### A. SQL 스키마 실행

1. [Supabase Dashboard](https://supabase.com/dashboard/project/gpyuopwpxfwhbnkcltev/sql) 접속
2. `supabase-schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 실행

#### B. Edge Function 배포

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref gpyuopwpxfwhbnkcltev

# Edge Function 배포
supabase functions deploy make-server-94a0507e --project-ref gpyuopwpxfwhbnkcltev
```

자세한 내용은 `EDGE_FUNCTION_DEPLOY.md` 참조

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속

### 5. 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 📚 문서

- **[PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)** - 배포 전 필수 체크리스트
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - 상세 배포 가이드
- **[EDGE_FUNCTION_DEPLOY.md](./EDGE_FUNCTION_DEPLOY.md)** - Edge Function 배포 가이드
- **[SYSTEM_VALIDATION.md](./SYSTEM_VALIDATION.md)** - 시스템 검증 보고서
- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - 빠른 설정 가이드

## 🏗️ 프로젝트 구조

```
Applyresponsivedesign/
├── src/
│   ├── components/          # 재사용 가능한 UI 컴포넌트
│   ├── context/             # React Context (Auth, Cart)
│   ├── data/                # 로컬 데이터 (products.ts)
│   ├── pages/               # 페이지 컴포넌트
│   ├── supabase/
│   │   └── functions/
│   │       └── server/      # Edge Function 코드
│   └── utils/
│       └── supabase/        # Supabase 클라이언트
├── .env                     # 환경 변수
├── package.json             # 의존성 관리
├── supabase-schema.sql      # 데이터베이스 스키마
├── vercel.json              # Vercel 배포 설정
└── vite.config.ts           # Vite 설정
```

## 🔐 보안

- ✅ JWT 기반 인증
- ✅ Row Level Security (RLS) 정책
- ✅ Service Role Key는 Edge Function에서만 사용
- ✅ 환경 변수로 민감 정보 관리
- ✅ CORS 설정

## 🧪 테스트

### 로컬 테스트

1. 회원가입 및 로그인
2. 상품 조회
3. 장바구니 추가/수정/삭제
4. 주문 생성
5. 리뷰 작성

### 관리자 기능 테스트

1. 관리자 계정 생성 (SQL 또는 Dashboard)
2. `/admin` 페이지 접속
3. 사용자 관리
4. 주문 관리

## 🚀 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel --prod
```

또는 [Vercel Dashboard](https://vercel.com)에서 수동 배포

**환경 변수 설정 (Vercel):**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

자세한 내용은 `DEPLOYMENT_GUIDE.md` 참조

## 📝 API 엔드포인트

### 공개 엔드포인트

- `GET /api/health` - 헬스 체크
- `POST /api/auth/signup` - 회원가입

### 인증 필요

- `GET /api/products` - 상품 목록
- `GET /api/cart` - 장바구니 조회
- `POST /api/cart` - 장바구니 저장
- `GET /api/orders` - 주문 조회
- `POST /api/orders` - 주문 생성
- `GET /api/addresses` - 배송지 조회
- `POST /api/addresses` - 배송지 추가

### 관리자 전용

- `GET /api/admin/users` - 사용자 목록
- `GET /api/admin/orders` - 전체 주문 조회
- `POST /api/products` - 상품 생성
- `PUT /api/products/:id` - 상품 수정
- `DELETE /api/products/:id` - 상품 삭제

## 🐛 문제 해결

### TypeScript 오류

```bash
npm install --save-dev @types/react @types/react-dom typescript
```

### Edge Function 연결 오류

1. Edge Function 배포 확인
2. 환경 변수 확인
3. Supabase Dashboard → Logs 확인

### 빌드 오류

```bash
rm -rf node_modules
npm install
npm run build
```

## 📞 지원

문제 발생 시:

1. [Supabase Dashboard Logs](https://supabase.com/dashboard/project/gpyuopwpxfwhbnkcltev/logs) 확인
2. 브라우저 개발자 도구 콘솔 확인
3. `SYSTEM_VALIDATION.md` 참조

## 📄 라이선스

This project is based on the Figma design: [Apply Responsive Design](https://www.figma.com/design/XYYv6wBTQM0af2Lul4EgOn/Apply-Responsive-Design)

## 🎉 기여

프로젝트 개선을 위한 기여를 환영합니다!

---

**Made with ❤️ using React, Supabase, and Vite**
