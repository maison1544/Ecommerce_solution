import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  ShoppingCart,
  MapPin,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
// import { getAddressesByUserId } from "../data/addresses"; // 로컬 데이터 사용 안 함
import { API_BASE_URL } from "../utils/api";

interface OrderItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

interface Order {
  id: string;
  userId: string;
  date: string;
  status?: "배송 준비 중" | "배송 중" | "배송 완료" | "취소";
  shippingStatus?: string; // API에서 사용하는 필드
  items: OrderItem[];
  totalAmount: number;
  trackingNumber?: string;
  shippingAddress: {
    recipient: string;
    phone: string;
    address: string;
    detailAddress: string;
    postalCode: string;
  };
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { isLoggedIn, currentUser, logout, getAccessToken } = useAuth();
  const { cartCount } = useCart();
  const [addressCount, setAddressCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      toast.error("로그인이 필요합니다");
      navigate("/login");
      return;
    }

    // 배송지 개수 로드 - API에서 가져오기
    const loadAddresses = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAddressCount(data.addresses?.length || 0);
        }
      } catch (error) {
        console.error("Failed to load addresses:", error);
      }
    };

    // API에서 주문 데이터 로드
    const loadOrders = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userOrders = (data.orders || []).sort(
            (a: Order, b: Order) =>
              new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );

          setTotalOrders(userOrders.length);
          setRecentOrders(userOrders.slice(0, 2));
        }
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
    loadOrders();
  }, [isLoggedIn, currentUser, navigate, getAccessToken]);

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      logout();
      toast.success("로그아웃되었습니다");
      navigate("/");
    }
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b78b1f]"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
            내 계정
          </h1>
          <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
            회원님의 정보와 주문 내역을 확인하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-lg p-6 sticky top-24">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <User size={40} className="text-gray-500" />
                </div>
                <h2 className="font-bold text-lg mb-1">{currentUser.name}</h2>
                <p className="text-sm text-gray-500">{currentUser.email}</p>
              </div>

              <div className="space-y-3 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">전화번호</span>
                  <span className="font-bold">{currentUser.phone}</span>
                </div>
                {currentUser.birthDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">생년월일</span>
                    <span className="font-bold">{currentUser.birthDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">가입일</span>
                  <span className="font-bold">{currentUser.createdAt}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-6 bg-gray-100 text-black rounded px-4 py-2 font-bold hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            </div>
          </div>

          {/* Account Menu */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Order History */}
              <Link
                to="/orders"
                className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-black rounded-lg">
                    <Package size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">주문 내역</h3>
                    <p className="text-sm text-gray-600">
                      주문한 상품을 확인하세요
                    </p>
                    <p className="text-xs text-[#b78b1f] mt-2">
                      진행 중인 주문 {totalOrders}건
                    </p>
                  </div>
                </div>
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-black rounded-lg">
                    <ShoppingCart size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">장바구니</h3>
                    <p className="text-sm text-gray-600">
                      장바구니를 확인하세요
                    </p>
                    <p className="text-xs text-[#b78b1f] mt-2">
                      담은 상품 {cartCount}개
                    </p>
                  </div>
                </div>
              </Link>

              {/* Delivery Address */}
              <Link
                to="/addresses"
                className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-black rounded-lg">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">배송지 관리</h3>
                    <p className="text-sm text-gray-600">배송지를 관리하세요</p>
                    <p className="text-xs text-[#b78b1f] mt-2">
                      등록된 주소 {addressCount}개
                    </p>
                  </div>
                </div>
              </Link>

              {/* Account Settings */}
              <Link
                to="/settings"
                className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-black rounded-lg">
                    <Settings size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">계정 설정</h3>
                    <p className="text-sm text-gray-600">
                      회원 정보를 수정하세요
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Orders */}
            <div className="mt-8 bg-white border rounded-lg p-6">
              <h3 className="font-bold mb-4">최근 주문</h3>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const items = order.items || [];
                    const firstItem = items[0];
                    return (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                          {firstItem?.image && (
                            <img
                              src={firstItem.image}
                              alt={firstItem?.name || "상품"}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm mb-1">
                            {firstItem?.name || "상품명 없음"}
                            {items.length > 1 && ` 외 ${items.length - 1}개`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.date || "날짜 없음"} 주문
                          </p>
                          <p className="text-xs text-[#b78b1f] mt-1">
                            {order.shippingStatus || order.status || "주문접수"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {(order.totalAmount ?? 0).toLocaleString()}원
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">최근 주문 내역이 없습니다</p>
                </div>
              )}
              <Link
                to="/orders"
                className="block text-center mt-4 text-sm text-gray-600 hover:text-black"
              >
                전체 주문 내역 보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
