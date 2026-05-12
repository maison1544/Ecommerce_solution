# 알림 시스템 구현 가이드

이 문서는 현재 프로젝트에서 구현된 관리자 알림 시스템을 다른 프로젝트에서 재사용하기 위한 상세 가이드입니다.

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [필수 의존성](#2-필수-의존성)
3. [타입 정의](#3-타입-정의)
4. [핵심 기능](#4-핵심-기능)
5. [Supabase Realtime 구독](#5-supabase-realtime-구독)
6. [UI 컴포넌트](#6-ui-컴포넌트)
7. [App.tsx 통합](#7-apptsx-통합)
8. [다른 프로젝트 적용 체크리스트](#8-다른-프로젝트-적용-체크리스트)

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx (루트)                          │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Toaster        │  │ AdminNotification│                   │
│  │  (sonner)       │  │   컴포넌트       │                   │
│  └─────────────────┘  └────────┬────────┘                   │
│                                │                             │
│                    ┌───────────┴───────────┐                 │
│                    │   Supabase Realtime   │                 │
│                    │   (postgres_changes)  │                 │
│                    └───────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### 주요 구성 요소

| 구성 요소 | 역할 |
|-----------|------|
| `AdminNotification` | 메인 알림 컴포넌트 (알림 패널, 설정, 구독 관리) |
| `Toaster (sonner)` | 토스트 알림 렌더링 |
| `Supabase Realtime` | 데이터베이스 변경 실시간 감지 |
| `LocalStorage` | 사용자 알림 설정 영속화 |

---

## 2. 필수 의존성

### 패키지 설치

```bash
npm install sonner @supabase/supabase-js lucide-react react-router-dom
```

### 패키지 설명

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `sonner` | 최신 | 토스트 알림 라이브러리 |
| `@supabase/supabase-js` | v2+ | Supabase 클라이언트 (Realtime 포함) |
| `lucide-react` | 최신 | 아이콘 (Bell, BellOff, X 등) |
| `react-router-dom` | v6+ | 알림 클릭 시 페이지 이동 |

---

## 3. 타입 정의

### NotificationItem

```typescript
interface NotificationItem {
  id: string;                    // 고유 ID (timestamp + random)
  type: "order" | "inquiry";     // 알림 유형
  title: string;                 // 알림 제목
  message: string;               // 알림 내용
  createdAt: Date;               // 생성 시간
  link: string;                  // 클릭 시 이동할 경로
}
```

### NotificationSettings

```typescript
interface NotificationSettings {
  enabled: boolean;              // 전체 알림 활성화 여부
  soundEnabled: boolean;         // 알림음 활성화 여부
  orderNotifications: boolean;   // 주문 알림 활성화
  inquiryNotifications: boolean; // 문의 알림 활성화
}
```

### 기본 설정 값

```typescript
const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  orderNotifications: true,
  inquiryNotifications: true,
};
```

---

## 4. 핵심 기능

### 4.1 Rate Limiting (과부하 방지)

알림이 너무 자주 발생하는 것을 방지합니다.

```typescript
// 설정값
const NOTIFICATION_COOLDOWN = 5000;        // 5초 쿨다운
const MAX_NOTIFICATIONS_PER_MINUTE = 10;   // 분당 최대 10개

// Refs
const lastNotificationTime = useRef<number>(0);
const notificationCountRef = useRef<number>(0);
const notificationResetTimer = useRef<NodeJS.Timeout | null>(null);

// Rate Limiting 체크 함수
const canShowNotification = useCallback(() => {
  const now = Date.now();
  
  // 쿨다운 체크 (5초 내 중복 알림 방지)
  if (now - lastNotificationTime.current < NOTIFICATION_COOLDOWN) {
    return false;
  }
  
  // 분당 알림 수 체크
  if (notificationCountRef.current >= MAX_NOTIFICATIONS_PER_MINUTE) {
    return false;
  }
  
  return true;
}, []);
```

### 4.2 설정 영속화 (LocalStorage)

사용자의 알림 설정을 브라우저에 저장합니다.

```typescript
const NOTIFICATION_SETTINGS_KEY = "admin-notification-settings";

// 설정 로드 (컴포넌트 마운트 시)
useEffect(() => {
  const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
  if (saved) {
    try {
      setSettings(JSON.parse(saved));
    } catch {
      setSettings(defaultSettings);
    }
  }
}, []);

// 설정 저장
const saveSettings = useCallback((newSettings: NotificationSettings) => {
  setSettings(newSettings);
  localStorage.setItem(
    NOTIFICATION_SETTINGS_KEY,
    JSON.stringify(newSettings)
  );
}, []);
```

### 4.3 알림음 재생

```typescript
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const audioRef = useRef<HTMLAudioElement | null>(null);

const playNotificationSound = useCallback(() => {
  if (!settings.soundEnabled) return;
  
  // Audio 객체 생성 (최초 1회)
  if (!audioRef.current) {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }
  
  // 재생 위치 초기화 후 재생
  audioRef.current.currentTime = 0;
  audioRef.current.play().catch(() => {
    // 사용자 인터랙션 없이 재생 실패 시 무시
    // (브라우저 자동 재생 정책)
  });
}, [settings.soundEnabled]);
```

### 4.4 알림 추가 함수

```typescript
const addNotification = useCallback(
  (item: Omit<NotificationItem, "id" | "createdAt">) => {
    // 알림 비활성화 또는 Rate Limit 초과 시 무시
    if (!settings.enabled) return;
    if (!canShowNotification()) return;
    
    // Rate limit 카운터 업데이트
    const now = Date.now();
    lastNotificationTime.current = now;
    notificationCountRef.current += 1;
    
    // 1분 후 카운트 리셋 타이머
    if (!notificationResetTimer.current) {
      notificationResetTimer.current = setTimeout(() => {
        notificationCountRef.current = 0;
        notificationResetTimer.current = null;
      }, 60000);
    }
    
    // 새 알림 객체 생성
    const newNotification: NotificationItem = {
      ...item,
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    
    // 상태 업데이트 (최대 50개 유지)
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
    
    // 알림음 재생
    playNotificationSound();
    
    // 토스트 알림 표시
    toast(item.title, {
      description: item.message,
      action: {
        label: "보기",
        onClick: () => navigate(item.link),
      },
      duration: 5000,
    });
  },
  [settings.enabled, canShowNotification, playNotificationSound, navigate]
);
```

---

## 5. Supabase Realtime 구독

### Supabase 클라이언트 설정

```typescript
// src/utils/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Realtime 구독 코드

```typescript
useEffect(() => {
  // 관리자가 아니거나 알림이 비활성화된 경우 구독하지 않음
  if (!isAdmin || !settings.enabled) {
    return;
  }
  
  // 주문 알림 구독
  if (settings.orderNotifications) {
    const orderChannel = supabase
      .channel("admin-orders-notification")
      .on(
        "postgres_changes",
        {
          event: "INSERT",           // INSERT, UPDATE, DELETE, *
          schema: "public",
          table: "orders",           // 감시할 테이블
        },
        (payload: any) => {
          console.log("[알림] 새 주문 감지:", payload);
          addNotification({
            type: "order",
            title: "🛒 새로운 주문",
            message: `새로운 주문이 접수되었습니다. (주문번호: ${payload.new?.id || "N/A"})`,
            link: "/admin?tab=orders",
          });
        }
      )
      .subscribe((status) => {
        console.log("[알림] 주문 채널 상태:", status);
      });
    
    subscriptionsRef.current.push(orderChannel);
  }
  
  // 문의 알림 구독
  if (settings.inquiryNotifications) {
    const inquiryChannel = supabase
      .channel("admin-inquiries-notification")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inquiries",
        },
        (payload: any) => {
          console.log("[알림] 새 문의 감지:", payload);
          addNotification({
            type: "inquiry",
            title: "💬 새로운 문의",
            message: `새로운 문의가 접수되었습니다. (${payload.new?.title || "제목 없음"})`,
            link: "/admin?tab=inquiries",
          });
        }
      )
      .subscribe((status) => {
        console.log("[알림] 문의 채널 상태:", status);
      });
    
    subscriptionsRef.current.push(inquiryChannel);
  }
  
  // 클린업 (컴포넌트 언마운트 또는 의존성 변경 시)
  return () => {
    subscriptionsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current = [];
  };
}, [
  isAdmin,
  settings.enabled,
  settings.orderNotifications,
  settings.inquiryNotifications,
  addNotification,
]);
```

### Supabase Realtime 활성화 방법

1. Supabase 대시보드 접속
2. **Database** → **Replication** 이동
3. 해당 테이블 (`orders`, `inquiries`) 에 대해 **Realtime** 활성화
4. **RLS (Row Level Security)** 정책 확인

---

## 6. UI 컴포넌트

### 6.1 전체 컴포넌트 구조

```tsx
export function AdminNotification() {
  // ... 상태 및 로직 ...
  
  // 관리자가 아니면 렌더링하지 않음
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className="fixed top-20 right-4 z-[100]">
      {/* 알림 버튼 */}
      {/* 알림 패널 */}
    </div>
  );
}
```

### 6.2 알림 버튼

```tsx
<button
  onClick={togglePanel}
  className="relative p-3 bg-white border-2 border-gray-200 hover:border-gray-400 rounded-full transition-colors shadow-lg"
  title="관리자 알림 설정"
>
  {settings.enabled ? (
    <Bell
      size={24}
      className={unreadCount > 0 ? "text-yellow-500" : "text-gray-700"}
    />
  ) : (
    <BellOff size={24} className="text-gray-400" />
  )}
  
  {/* 읽지 않은 알림 배지 */}
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</button>
```

### 6.3 알림 패널

```tsx
{showPanel && (
  <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border rounded-lg shadow-xl z-50 max-h-[500px] overflow-hidden">
    
    {/* 헤더 */}
    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
      <h3 className="font-bold text-lg">알림</h3>
      <div className="flex items-center gap-2">
        {notifications.length > 0 && (
          <button onClick={clearAllNotifications} className="text-xs text-gray-500 hover:text-gray-700">
            모두 지우기
          </button>
        )}
        <button onClick={() => setShowPanel(false)} className="p-1 hover:bg-gray-200 rounded">
          <X size={16} />
        </button>
      </div>
    </div>
    
    {/* 알림 설정 */}
    <div className="p-3 border-b bg-gray-50 space-y-2">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => saveSettings({ ...settings, enabled: e.target.checked })}
          className="rounded"
        />
        <span>알림 활성화</span>
      </label>
      
      {settings.enabled && (
        <>
          {/* 알림음, 주문 알림, 문의 알림 체크박스 */}
        </>
      )}
    </div>
    
    {/* 알림 목록 */}
    <div className="overflow-y-auto max-h-[300px]">
      {notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Bell size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">새로운 알림이 없습니다</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setShowPanel(false);
              setTimeout(() => navigate(notification.link), 100);
            }}
          >
            {/* 알림 아이템 내용 */}
          </div>
        ))
      )}
    </div>
  </div>
)}
```

---

## 7. App.tsx 통합

### 필요한 import

```tsx
import { Toaster } from "sonner";
import { AdminNotification } from "./components/AdminNotification";
```

### App 컴포넌트 통합

```tsx
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          {/* 기존 라우트 및 컴포넌트 */}
          <div className="bg-white min-h-screen">
            <Header />
            <Navigation />
            
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* ... 라우트 설정 ... */}
              </Routes>
            </Suspense>
            
            <Footer />
            
            {/* ✅ 토스트 알림 렌더러 (필수) */}
            <Toaster position="top-center" richColors />
            
            {/* ✅ 관리자 알림 시스템 - 모든 페이지에서 작동 */}
            <AdminNotification />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
```

---

## 8. 다른 프로젝트 적용 체크리스트

### 8.1 사전 준비

- [ ] Supabase 프로젝트 생성 및 설정
- [ ] 환경 변수 설정 (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`)
- [ ] 필요한 테이블 생성 (`orders`, `inquiries` 등)

### 8.2 의존성 설치

```bash
npm install sonner @supabase/supabase-js lucide-react react-router-dom
```

### 8.3 파일 복사 및 수정

1. **Supabase 클라이언트** (`src/utils/supabase/client.ts`)
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.REACT_APP_SUPABASE_URL!,
     process.env.REACT_APP_SUPABASE_ANON_KEY!
   );
   ```

2. **AuthContext** (`src/context/AuthContext.tsx`)
   - `currentUser` 객체에 `role` 필드 포함 필요
   - 관리자 확인: `currentUser?.role === "admin"`

3. **AdminNotification 컴포넌트** (`src/components/AdminNotification.tsx`)
   - 테이블명 수정 (필요 시)
   - 알림 유형 추가 (필요 시)
   - 알림 링크 경로 수정

### 8.4 Supabase 설정

1. **Realtime 활성화**
   - Supabase 대시보드 → Database → Replication
   - 해당 테이블 Realtime 활성화

2. **RLS 정책 설정** (필요 시)
   ```sql
   -- 예: 관리자만 모든 주문 조회 가능
   CREATE POLICY "Admin can view all orders" ON orders
   FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
   ```

### 8.5 App.tsx 수정

```tsx
import { Toaster } from "sonner";
import { AdminNotification } from "./components/AdminNotification";

// App 컴포넌트 내부에 추가
<Toaster position="top-center" richColors />
<AdminNotification />
```

### 8.6 테스트

- [ ] 알림 설정 토글 동작 확인
- [ ] 알림 설정 LocalStorage 저장 확인
- [ ] 새 주문 생성 시 알림 표시 확인
- [ ] 새 문의 생성 시 알림 표시 확인
- [ ] 알림음 재생 확인
- [ ] 토스트 알림 클릭 시 페이지 이동 확인
- [ ] Rate limiting 동작 확인

---

## 9. 커스터마이징 가이드

### 알림 유형 추가

```typescript
// 1. NotificationItem 타입 수정
interface NotificationItem {
  type: "order" | "inquiry" | "review" | "custom"; // 새 유형 추가
  // ...
}

// 2. 새 구독 채널 추가
const reviewChannel = supabase
  .channel("admin-reviews-notification")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "reviews",
  }, (payload) => {
    addNotification({
      type: "review",
      title: "⭐ 새로운 리뷰",
      message: `새로운 리뷰가 등록되었습니다.`,
      link: "/admin?tab=reviews",
    });
  })
  .subscribe();
```

### Rate Limiting 조정

```typescript
// 더 느슨하게
const NOTIFICATION_COOLDOWN = 2000;        // 2초
const MAX_NOTIFICATIONS_PER_MINUTE = 20;   // 분당 20개

// 더 엄격하게
const NOTIFICATION_COOLDOWN = 10000;       // 10초
const MAX_NOTIFICATIONS_PER_MINUTE = 5;    // 분당 5개
```

### 알림음 변경

```typescript
// 다른 무료 사운드 URL 사용
const NOTIFICATION_SOUND_URL = "https://your-sound-url.mp3";

// 또는 로컬 파일 사용
import notificationSound from "../assets/sounds/notification.mp3";
const NOTIFICATION_SOUND_URL = notificationSound;
```

---

## 10. 트러블슈팅

### 알림이 오지 않는 경우

1. **Supabase Realtime 활성화 확인**
   - Database → Replication → 해당 테이블 활성화

2. **콘솔 로그 확인**
   ```
   [AdminNotification] Realtime 구독 시작
   [AdminNotification] 주문 채널 상태: SUBSCRIBED
   ```

3. **네트워크 탭 확인**
   - WebSocket 연결 상태 확인

### 알림음이 재생되지 않는 경우

- 브라우저 자동 재생 정책으로 인해 사용자 인터랙션 없이는 재생 불가
- 사용자가 페이지와 한 번이라도 상호작용한 후 재생됨

### Rate Limiting으로 알림이 차단되는 경우

- 콘솔에 `[AdminNotification] Rate limit 초과` 로그 확인
- 필요 시 `NOTIFICATION_COOLDOWN`, `MAX_NOTIFICATIONS_PER_MINUTE` 조정

---

## 참고 자료

- [Sonner 공식 문서](https://sonner.emilkowal.ski/)
- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
- [Lucide React 아이콘](https://lucide.dev/icons/)
