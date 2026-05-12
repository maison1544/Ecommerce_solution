import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/api";
import { ImageWithFallback } from "../components/common/ImageWithFallback";

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
  status: "배송 준비 중" | "배송 중" | "배송 완료" | "취소";
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: {
    recipient: string;
    phone: string;
    address: string;
    detailAddress: string;
    postalCode: string;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const { isLoggedIn, getAccessToken, isAuthLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<
    "all" | "3month" | "6month" | "1year"
  >("3month");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 주문 데이터 로드
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
        setOrders(data.orders || []);
      } else {
        console.error("Failed to load orders");
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 로그인 체크 및 주문 데이터 로드
  useEffect(() => {
    // 세션 로딩 중이면 체크하지 않음
    if (isAuthLoading) return;

    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    loadOrders();
  }, [isLoggedIn, navigate, isAuthLoading]);

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "배송 준비 중":
        return <Package size={16} className="text-blue-500" />;
      case "배송 중":
        return <Truck size={16} className="text-orange-500" />;
      case "배송 완료":
        return <CheckCircle size={16} className="text-green-500" />;
      case "취소":
        return <XCircle size={16} className="text-red-500" />;
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "배송 준비 중":
        return "text-blue-600 bg-blue-50";
      case "배송 중":
        return "text-orange-600 bg-orange-50";
      case "배송 완료":
        return "text-green-600 bg-green-50";
      case "취소":
        return "text-red-600 bg-red-50";
    }
  };

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
            주문 내역
          </h1>
          <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
            주문하신 상품의 배송 상태를 확인하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { value: "all", label: "전체" },
            { value: "3month", label: "최근 3개월" },
            { value: "6month", label: "최근 6개월" },
            { value: "1year", label: "최근 1년" },
          ].map((period) => (
            <button
              key={period.value}
              onClick={() =>
                setSelectedPeriod(period.value as typeof selectedPeriod)
              }
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                selectedPeriod === period.value
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">
              주문 내역을 로딩 중입니다
            </h2>
            <p className="text-gray-600 mb-6">잠시만 기다려주세요!</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">주문 내역이 없습니다</h2>
            <p className="text-gray-600 mb-6">쇼핑을 시작해보세요!</p>
            <Link
              to="/"
              className="inline-block bg-black text-white rounded-[10px] px-8 py-3 font-bold tracking-wider uppercase hover:bg-gray-800"
            >
              쇼핑하러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border rounded-lg overflow-hidden"
              >
                {/* Order Header */}
                <div className="bg-gray-50 border-b px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          주문번호: {order.id}
                        </p>
                        <p className="text-xs text-gray-500">{order.date}</p>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4 mb-4">
                    {(order.items || []).map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                          <ImageWithFallback
                            src={item.image || ""}
                            alt={item.name || "상품"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold mb-1">
                            {item.name || "상품명 없음"}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            수량: {item.quantity ?? 0}개
                          </p>
                          <p className="font-bold text-[#b78b1f]">
                            {(item.price ?? 0).toLocaleString()}원
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {(
                              (item.price ?? 0) * (item.quantity ?? 0)
                            ).toLocaleString()}
                            원
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-bold">총 결제금액</span>
                    <span className="text-xl font-bold text-black">
                      {(order.totalAmount ?? 0).toLocaleString()}원
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Link
                      to={`/product/${
                        order.items?.[0]?.id || order.items?.[0]?.productId || 1
                      }`}
                      className="flex-1 text-center bg-white border border-black text-black rounded px-4 py-2 font-bold hover:bg-gray-50"
                    >
                      상품 상세보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            to="/account"
            className="inline-block text-gray-600 hover:text-black font-bold"
          >
            ← 내 계정으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
