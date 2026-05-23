import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/api";
import { ImageWithFallback } from "@/components/layout/ImageWithFallback";
import { useCategoryNavLabels } from "@/hooks/useCategoryNavLabels";
import {
  getCartItems,
  subscribeToCartChanges,
  flushPendingUpdates,
  syncCartWithServer,
  type CartItem as StoreCartItem,
} from "@/data/cart";

interface CartItem {
  id: number;
  userId: string;
  productId: number;
  name: string;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  discount?: number;
  quantity: number;
  image: string;
}

// 🔥 전역 스토어 → 로컬 타입 변환 함수
function convertStoreToLocal(storeItems: StoreCartItem[]): CartItem[] {
  return storeItems.map((item) => ({
    id: item.id,
    userId: String(item.userId),
    productId: item.productId,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    quantity: item.quantity,
    image: item.image,
  }));
}

export default function CartPage() {
  const router = useRouter();
  const { refreshCart, removeFromCart, clearCart, isClearingCart } = useCart();
  const { isLoggedIn, isAuthLoading, getAccessToken } = useAuth();
  const { resolveCategory } = useCategoryNavLabels();
  const specialDealsSlug = resolveCategory("special-deals")?.slug || "13";

  // 🔥 1. 전역 스토어에서 초기값 가져오기 (즉시 데이터 표시)
  const [localCartItems, setLocalCartItems] = useState<CartItem[]>(() => {
    // 전역 스토어에 데이터가 있으면 그것을 초기값으로 사용
    const storeItems = getCartItems();
    if (storeItems.length > 0) {
      console.log(
        "🚀 전역 스토어에서 초기 데이터 로드:",
        storeItems.length,
        "개"
      );
      return convertStoreToLocal(storeItems);
    }
    return [];
  });

  // 🔥 전역 스토어에 데이터가 있으면 로딩 스킵
  const [loading, setLoading] = useState(() => getCartItems().length === 0);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  // 🔥 삭제 중복 방지용 ref
  const deletingItemsRef = useRef<Set<number>>(new Set());
  const lastClearClickRef = useRef<number>(0); // 전체 삭제 쓰로틀링

  // 🔥 2. 전역 스토어 구독 - 실시간 동기화
  useEffect(() => {
    const unsubscribe = subscribeToCartChanges((storeItems) => {
      console.log("🔄 전역 스토어 변경 감지:", storeItems.length, "개");
      setLocalCartItems(convertStoreToLocal(storeItems));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 🔥 3. 서버에서 최신 데이터 로드 (백그라운드 동기화)
  const loadCartItemsFromServer = useCallback(async () => {
    try {
      const token = await getAccessToken();

      if (!token) {
        setLoading(false);
        return;
      }

      console.log("📡 서버에서 장바구니 데이터 로드 중...");

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const serverCart = data.cart || [];

        console.log("✅ 서버 데이터 로드 완료:", serverCart.length, "개");

        // 🔥 전역 스토어와 동기화 (구독자들에게 자동 알림)
        syncCartWithServer(serverCart);

        // 로컬 상태도 업데이트 (혹시 구독 누락 시 대비)
        setLocalCartItems(serverCart);
      } else {
        console.error("Failed to load cart from server");
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // 🔥 페이지 진입 시 플러시 실행
  useEffect(() => {
    console.log("🛒 장바구니 페이지 진입 - 플러시 실행");
    flushPendingUpdates();
  }, []);

  // 🔥 로그인 체크 및 서버 데이터 로드
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    // 서버에서 최신 데이터 로드 (백그라운드)
    loadCartItemsFromServer();
  }, [isLoggedIn, isAuthLoading, router, loadCartItemsFromServer]);

  // 🔥 수량 업데이트 - 낙관적 업데이트 적용
  const updateQuantity = useCallback(
    async (productId: number, newQuantity: number) => {
      if (newQuantity < 1) return;
      if (updatingItems.has(productId)) return;

      // 🔥 낙관적 업데이트: 즉시 UI 반영
      const prevItems = [...localCartItems];
      setLocalCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      setUpdatingItems((prev) => new Set(prev).add(productId));

      try {
        const token = await getAccessToken();
        if (!token) {
          setLocalCartItems(prevItems); // 롤백
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/${productId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        });

        if (response.ok) {
          await refreshCart();
        } else {
          setLocalCartItems(prevItems); // 롤백
          toast.error("수량 변경에 실패했습니다");
        }
      } catch {
        setLocalCartItems(prevItems); // 롤백
        toast.error("수량 변경에 실패했습니다");
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [updatingItems, localCartItems, getAccessToken, refreshCart]
  );

  // 🔥 전체 삭제 함수 - 쓰로틀링 적용
  const handleClearCart = useCallback(async () => {
    // 쓰로틀링: 1초 내 중복 클릭 방지
    const now = Date.now();
    if (now - lastClearClickRef.current < 1000) {
      return;
    }
    lastClearClickRef.current = now;

    // 확인 대화상자
    if (!confirm("장바구니를 비우시겠습니까?")) {
      return;
    }

    // 낙관적 업데이트: 즉시 UI 반영
    const prevItems = [...localCartItems];
    setLocalCartItems([]);
    toast.success("장바구니가 비워졌습니다");

    try {
      const success = await clearCart();
      if (!success) {
        setLocalCartItems(prevItems); // 롤백
        toast.error("장바구니 비우기에 실패했습니다");
      }
    } catch {
      setLocalCartItems(prevItems); // 롤백
      toast.error("장바구니 비우기에 실패했습니다");
    }
  }, [localCartItems, clearCart]);

  // 🔥 삭제 함수 - 중복 방지 적용 (CartContext에서도 체크하므로 이중 보호)
  const removeItem = useCallback(
    async (cartItemId: number) => {
      // 로컬에서만 체크 (CartContext에서도 체크함)
      if (deletingItemsRef.current.has(cartItemId)) return;
      deletingItemsRef.current.add(cartItemId);

      // 🔥 낙관적 업데이트: 즉시 UI 제거 + 토스트
      const prevItems = [...localCartItems];
      setLocalCartItems((prev) =>
        prev.filter((item) => item.id !== cartItemId)
      );
      toast.success("상품이 장바구니에서 삭제되었습니다");

      try {
        const success = await removeFromCart(cartItemId);
        if (success) {
          await refreshCart();
        } else {
          setLocalCartItems(prevItems); // 롤백
          toast.error("상품 삭제에 실패했습니다");
        }
      } catch {
        setLocalCartItems(prevItems); // 롤백
        toast.error("상품 삭제에 실패했습니다");
      } finally {
        deletingItemsRef.current.delete(cartItemId);
      }
    },
    [localCartItems, removeFromCart, refreshCart]
  );

  if (loading) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="text-center py-20">
          <p className="text-gray-500">장바구니를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  const subtotal = localCartItems.reduce(
    (sum: number, item: CartItem) =>
      sum + (item.price ?? 0) * (item.quantity ?? 0),
    0
  );
  const shipping = 3000;
  const total = subtotal + shipping;

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
              장바구니
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              총 {localCartItems.length}개의 상품이 담겨있습니다
            </p>
          </div>
          {localCartItems.length > 0 && (
            <button
              onClick={handleClearCart}
              disabled={isClearingCart}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingCart ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              전체 삭제
            </button>
          )}
        </div>
        <div className="h-px bg-black mt-5" />
      </div>

      {localCartItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">장바구니가 비어있습니다</p>
          <Link
            href={`/category/${specialDealsSlug}`}
            className="inline-block bg-black text-white rounded-[10px] px-8 py-3 font-bold tracking-wider uppercase hover:bg-gray-800"
          >
            쇼핑 계속하기
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {localCartItems.map((item) => (
              <div
                key={item.productId} // ✅ productId를 key로 사용
                className="bg-white border rounded-[10px] p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded bg-gradient-to-b from-white to-[#e8e7e7] overflow-hidden">
                    <ImageWithFallback
                      src={item.image || ""}
                      alt={item.name || "상품"}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm lg:text-base line-clamp-2">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {item.originalPrice &&
                        item.originalPrice > item.price && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 line-through">
                              {(item.originalPrice ?? 0).toLocaleString()}원
                            </span>
                            <span className="text-xs font-bold text-[#ff3c3c] bg-red-50 px-1.5 py-0.5 rounded">
                              {item.discount ||
                                Math.round(
                                  ((item.originalPrice - item.price) /
                                    item.originalPrice) *
                                    100
                                )}
                              % OFF
                            </span>
                          </div>
                        )}
                      <p className="font-bold text-lg">
                        {(item.price ?? 0).toLocaleString()}원
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          item.quantity <= 1 ||
                          updatingItems.has(item.productId)
                        }
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-bold">
                        {updatingItems.has(item.productId)
                          ? "..."
                          : item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={updatingItems.has(item.productId)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border rounded-[10px] p-6 sticky top-[200px]">
              <h2 className="font-bold mb-4 uppercase tracking-wider">
                주문 요약
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">소계</span>
                  <span className="font-bold">
                    {subtotal.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">배송비</span>
                  <span className="font-bold">
                    {shipping.toLocaleString()}원
                  </span>
                </div>
                <div className="h-px bg-gray-300" />
                <div className="flex justify-between">
                  <span className="font-bold">총 금액</span>
                  <span className="font-bold text-[#b78b1f]">
                    {total.toLocaleString()}원
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  sessionStorage.setItem(
                    "checkoutState",
                    JSON.stringify({ type: "cart" })
                  );
                  router.push("/checkout");
                }}
                className="w-full flex items-center justify-center bg-black text-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-4 font-bold tracking-wider uppercase hover:bg-gray-800 mb-3"
              >
                구매하기
              </button>

              <Link
                href={`/category/${specialDealsSlug}`}
                className="block text-center text-sm text-[#b78b1f] hover:underline"
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
