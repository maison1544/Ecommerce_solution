import { useState } from "react";
import { Search } from "lucide-react";

export default function DeliveryPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber) {
      alert("운송장 번호를 입력해주세요.");
      return;
    }

    // Mock delivery data
    setDeliveryInfo({
      trackingNumber: trackingNumber,
      courier: "CJ대한통운",
      status: "배송중",
      product: "Apple 아이폰 17 Pro 자급제",
      recipient: "홍길동",
      address: "서울특별시 은평구",
      history: [
        { date: "2025-11-13 14:30", status: "배송중", location: "서울 은평구 배송센터", description: "배송기사님이 상품을 배송중입니다." },
        { date: "2025-11-13 08:20", status: "배송출발", location: "서울 은평구 배송센터", description: "배송을 시작했습니다." },
        { date: "2025-11-12 18:45", status: "간선상차", location: "서울 물류터미널", description: "간선 상차 완료" },
        { date: "2025-11-12 15:30", status: "집하완료", location: "서울 강남구 집하센터", description: "상품이 집하되었습니다." }
      ]
    });
  };

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            배송조회
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            주문하신 상품의 배송 현황을 확인하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        {/* Search Form */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="trackingNumber" className="block text-sm font-bold mb-2">
                운송장 번호
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1 bg-white rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="운송장 번호를 입력하세요 (예: 123456789012)"
                />
                <button
                  type="submit"
                  className="bg-black text-white rounded px-6 py-3 font-bold hover:bg-gray-800 flex items-center gap-2"
                >
                  <Search size={18} />
                  조회
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              ※ 운송장 번호는 주문 완료 후 발송 시 문자 또는 이메일로 안내됩니다.
            </p>
          </form>
        </div>

        {/* Delivery Information */}
        {deliveryInfo ? (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-bold mb-4 text-lg">배송 정보</h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">운송장 번호</p>
                  <p className="font-bold">{deliveryInfo.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">택배사</p>
                  <p className="font-bold">{deliveryInfo.courier}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">상품명</p>
                  <p className="font-bold">{deliveryInfo.product}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">수령인</p>
                  <p className="font-bold">{deliveryInfo.recipient}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-gray-600 mb-1">배송지</p>
                  <p className="font-bold">{deliveryInfo.address}</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="font-bold text-blue-900 mb-1">현재 배송 상태</p>
                <p className="text-blue-700">{deliveryInfo.status}</p>
              </div>
            </div>

            {/* Delivery Progress */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-bold mb-4 text-lg">배송 추적</h2>
              <div className="relative">
                {deliveryInfo.history.map((item: any, index: number) => (
                  <div key={index} className="flex gap-4 pb-6 last:pb-0">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      {index !== deliveryInfo.history.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-1" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className={`font-bold ${index === 0 ? 'text-blue-600' : 'text-black'}`}>
                          {item.status}
                        </p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                      </div>
                      <p className="text-sm text-gray-600">{item.location}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-bold text-sm mb-2">📦 배송 안내</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• 배송 정보는 실시간으로 업데이트되며, 약간의 지연이 있을 수 있습니다.</li>
                <li>• 배송 관련 문의사항은 고객센터(010-9999-9999)로 연락주시기 바랍니다.</li>
                <li>• 부재 시 경비실 또는 택배함에 보관될 수 있습니다.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <p className="text-gray-600 mb-2">운송장 번호를 입력하여 배송 현황을 조회하세요</p>
            <p className="text-sm text-gray-500">
              주문 후 발송 완료 시 운송장 번호가 발급됩니다
            </p>
          </div>
        )}

        {/* Quick Guide */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-bold mb-4">배송 조회 방법</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>주문 완료 후 발송 시 문자 또는 이메일로 운송장 번호를 받으세요</li>
            <li>위의 검색창에 운송장 번호를 입력하고 '조회' 버튼을 클릭하세요</li>
            <li>현재 배송 상태와 상세한 배송 추적 정보를 확인할 수 있습니다</li>
          </ol>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-700 mb-2">
              <strong>배송 관련 문의</strong>
            </p>
            <p className="text-sm text-gray-600">
              전화: 010-9999-9999 | 이메일: solution@gmail.com
            </p>
            <p className="text-xs text-gray-500 mt-1">
              운영시간: 평일 09:00 - 18:00 (점심시간 12:00 - 13:00)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
