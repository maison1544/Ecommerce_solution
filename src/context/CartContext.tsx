import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { createClient } from "../utils/supabase/client";
import { API_BASE_URL } from "../utils/api";

interface CartContextType {
  cartCount: number;
  addToCart: (
    productId: number,
    name: string,
    price: number,
    originalPrice: number | undefined,
    image: string,
    quantity?: number
  ) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
  setCartCount: (count: number) => void;
  isAddingToCart: boolean;
  isClearingCart: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// API Base URL is configured via environment variables

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isClearingCart, setIsClearingCart] = useState(false);

  // 🔥 요청 큐: 동시 요청 순차 처리
  const addQueueRef = useRef<Promise<void>>(Promise.resolve());
  const removeQueueRef = useRef<Set<number>>(new Set()); // 삭제 중인 아이템 추적
  const lastRefreshRef = useRef<number>(0); // 마지막 새로고침 시간
  const clearingRef = useRef<boolean>(false); // 전체 삭제 중 플래그
  const sessionCacheRef = useRef<{ token: string; expiresAt: number } | null>(
    null
  ); // 세션 캐시

  // 🔥 세션 캐싱 - 매번 새로 생성하지 않음 + force_logout 체크
  const getSession = useCallback(async () => {
    const now = Date.now();

    // 캐시된 세션이 유효하면 재사용
    if (sessionCacheRef.current && sessionCacheRef.current.expiresAt > now) {
      return sessionCacheRef.current.token;
    }

    const supabase = createClient();

    // 🔥 먼저 getUser()로 force_logout 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      sessionCacheRef.current = null;
      return null;
    }

    // 🔥 force_logout 플래그 확인
    if (user.app_metadata?.force_logout) {
      console.log("CartContext: force_logout 감지, 세션 무효화");
      sessionCacheRef.current = null;
      await supabase.auth.signOut();
      window.location.href = "/login?reason=password_changed";
      return null;
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      sessionCacheRef.current = null;
      return null;
    }

    // 5분간 캐시
    sessionCacheRef.current = {
      token: session.access_token,
      expiresAt: now + 5 * 60 * 1000,
    };

    return session.access_token;
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const token = await getSession();

      if (!token) {
        setCartCount(0);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const totalCount =
          data.cart?.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          ) || 0;
        setCartCount(totalCount);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error("❌ Failed to refresh cart:", error);
      setCartCount(0);
    }
  }, [getSession]);

  const addToCart = useCallback(
    async (
      productId: number,
      name: string,
      price: number,
      originalPrice: number | undefined,
      image: string,
      quantity: number = 1
    ) => {
      // 🚀 낙관적 업데이트: 즉시 UI 반영
      setCartCount((prev) => prev + quantity);
      setIsAddingToCart(true);

      // 🔥 요청 큐에 추가 (이전 요청 완료 후 실행)
      const currentRequest = addQueueRef.current
        .then(async () => {
          const token = await getSession();

          if (!token) {
            setCartCount((prev) => prev - quantity); // 롤백
            return;
          }

          // 🔥 빠른 단일 아이템 추가 API 호출
          const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId,
              name,
              price,
              originalPrice: originalPrice || price,
              quantity,
              image: image || "",
            }),
          });

          if (!response.ok) {
            setCartCount((prev) => prev - quantity); // 롤백
          }
        })
        .catch(() => {
          setCartCount((prev) => prev - quantity); // 롤백
        });

      // 큐 업데이트
      addQueueRef.current = currentRequest;

      // 모든 요청이 완료된 후 한 번만 새로고침
      currentRequest.finally(() => {
        setIsAddingToCart(false);
        // 디바운스된 새로고침: 마지막 요청 후 300ms 대기
        const now = Date.now();
        lastRefreshRef.current = now;
        setTimeout(() => {
          if (lastRefreshRef.current === now) {
            refreshCart();
          }
        }, 300);
      });
    },
    [refreshCart]
  );

  const removeFromCart = useCallback(
    async (itemId: number): Promise<boolean> => {
      // 🔥 이미 삭제 중인 아이템이면 무시 (중복 클릭 방지)
      if (removeQueueRef.current.has(itemId)) {
        return false;
      }

      removeQueueRef.current.add(itemId);

      try {
        const token = await getSession();
        if (!token) return false;

        const response = await fetch(`${API_BASE_URL}/api/cart/${itemId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        return response.ok;
      } catch {
        return false;
      } finally {
        removeQueueRef.current.delete(itemId);
      }
    },
    [getSession]
  );

  // 🔥 장바구니 전체 삭제 - 디바운싱 적용
  const clearCart = useCallback(async (): Promise<boolean> => {
    // 이미 전체 삭제 중이면 무시 (중복 클릭 방지)
    if (clearingRef.current) {
      return false;
    }

    clearingRef.current = true;
    setIsClearingCart(true);

    // 🔥 낙관적 업데이트: 즉시 UI 반영
    const prevCount = cartCount;
    setCartCount(0);

    try {
      const token = await getSession();
      if (!token) {
        setCartCount(prevCount); // 롤백
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setCartCount(prevCount); // 롤백
        return false;
      }

      return true;
    } catch {
      setCartCount(prevCount); // 롤백
      return false;
    } finally {
      clearingRef.current = false;
      setIsClearingCart(false);
    }
  }, [getSession, cartCount]);

  // 초기 로드 시 장바구니 개수 로드
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cartCount,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart,
        setCartCount,
        isAddingToCart,
        isClearingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
