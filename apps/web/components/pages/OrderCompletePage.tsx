import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function OrderCompletePage() {
  const router = useRouter();
  const location = useLocation();
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    const state = location.state as { order: any } | null;
    if (!state || !state.order) {
      router.push("/");
      return;
    }
    setOrder(state.order);
  }, [location, navigate]);

  if (!order) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={48} className="text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-bold mb-4">
          주문이 완료되었습니다!
        </h1>

        {/* Message */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-8">
          <p className="font-bold text-lg mb-2">
            결제를 위해 입금 계좌를 요청해주세요.
          </p>
          <p className="text-sm text-gray-700">
            고객센터 또는 관리자에게 문의하시면 입금 계좌 정보를 안내해드립니다.
          </p>
        </div>

        {/* Order Info */}
        <div className="bg-white border rounded-lg p-6 mb-8 text-left">
          <h2 className="font-bold mb-4">주문 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">주문번호</span>
              <span className="font-bold">{order.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">주문일시</span>
              <span className="font-bold">{order.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">결제금액</span>
              <span className="font-bold text-[#b78b1f]">
                {order.totalAmount.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">결제방법</span>
              <span className="font-bold">무통장 입금</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white border rounded-lg p-6 mb-8 text-left">
          <h2 className="font-bold mb-4">배송지 정보</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-600">수령인:</span>{" "}
              <span className="font-bold">
                {order.shippingAddress.recipient}
              </span>
            </p>
            <p>
              <span className="text-gray-600">연락처:</span>{" "}
              <span className="font-bold">{order.shippingAddress.phone}</span>
            </p>
            <p>
              <span className="text-gray-600">주소:</span>
              <span className="font-bold">
                {" "}
                ({order.shippingAddress.postalCode}){" "}
                {order.shippingAddress.address}{" "}
                {order.shippingAddress.detailAddress}
              </span>
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/orders"
            className="flex-1 bg-black text-white rounded-lg py-3 font-bold hover:bg-gray-800 text-center"
          >
            주문 내역 보기
          </Link>
          <Link
            to="/"
            className="flex-1 bg-white border-2 border-black text-black rounded-lg py-3 font-bold hover:bg-gray-50 text-center"
          >
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </main>
  );
}
