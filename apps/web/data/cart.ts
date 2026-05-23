export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
}

// ============================================
// 🔥 서버 데이터와 동기화되는 전역 장바구니 스토어
// - React 컴포넌트에서 구독하여 실시간 UI 동기화
// - 서버 API 호출 결과로 syncCartWithServer 호출
// ============================================

// 배포용 - 빈 배열로 시작
export const cartItems: CartItem[] = [];

// ============================================
// 구독 시스템: React 상태 동기화
// ============================================

type CartChangeListener = (items: CartItem[]) => void;
const cartChangeListeners = new Set<CartChangeListener>();

// 변경 알림 함수 - 마이크로태스크로 배치 처리
let notifyScheduled = false;
function notifyCartChange(): void {
  if (notifyScheduled) return;
  notifyScheduled = true;

  // 마이크로태스크로 배치 처리 (동일 tick에서 여러 변경 시 1번만 알림)
  queueMicrotask(() => {
    notifyScheduled = false;
    const currentItems = [...cartItems];
    cartChangeListeners.forEach((listener) => {
      try {
        listener(currentItems);
      } catch (error) {
        console.error("Cart change listener error:", error);
      }
    });
  });
}

// 구독 함수 (React에서 사용)
export function subscribeToCartChanges(
  listener: CartChangeListener
): () => void {
  cartChangeListeners.add(listener);
  return () => {
    cartChangeListeners.delete(listener);
  };
}

// ============================================
// 플러시 함수 (기존 호환성 유지)
// ============================================

export function flushPendingUpdates(): void {
  // 서버 API 기반으로 변경되어 이제 빈 함수
  console.log("🔄 장바구니 상태 동기화");
}

// ============================================
// 🔥 서버 데이터와 전역 스토어 동기화
// ============================================

export function syncCartWithServer(serverCart: CartItem[]): void {
  // 전역 cartItems 배열을 서버 데이터로 완전히 덮어쓰기
  cartItems.length = 0; // 기존 데이터 비우기
  serverCart.forEach((item) => cartItems.push(item));

  console.log("🔄 서버 데이터와 동기화 완료:", cartItems.length, "개");

  // 모든 구독자에게 변경 알림
  notifyCartChange();
}

// ============================================
// 유틸리티: 전역 스토어의 현재 상태 조회 (안전한 복사본)
// ============================================

export function getCartItems(): CartItem[] {
  return [...cartItems]; // 복사본 반환
}
