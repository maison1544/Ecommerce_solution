import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Home, Building, Plus, ChevronDown } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { formatPhoneNumber } from "../utils/phoneFormat";

interface CheckoutProduct {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Address {
  id: number;
  userId: string;
  name: string;
  recipient: string;
  phone: string;
  address: string;
  detailAddress: string;
  postalCode: string;
  isDefault: boolean;
  type?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const location = useLocation();
  const { isLoggedIn, getAccessToken, isAuthLoading } = useAuth();
  const [products, setProducts] = useState<CheckoutProduct[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [addressData, setAddressData] = useState({
    name: "",
    recipient: "",
    phone: "",
    postalCode: "",
    address: "",
    detailAddress: "",
    type: "home" as "home" | "office",
    isDefault: false,
  });

  const [errors, setErrors] = useState({
    recipient: "",
    phone: "",
    postalCode: "",
    address: "",
    name: "",
  });

  // Load addresses
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
        // 백엔드 필드를 프론트엔드 인터페이스에 맞게 매핑
        const mappedAddresses = (data.addresses || []).map((addr: any) => ({
          ...addr,
          name: addr.addressName || "", // 배송지명
          recipient: addr.name || "", // 수령인 이름
          postalCode: addr.zipCode || addr.postalCode || "", // 우편번호
        }));
        setAddresses(mappedAddresses);

        // Select default address
        const defaultAddr = mappedAddresses.find(
          (addr: Address) => addr.isDefault
        );
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (mappedAddresses.length > 0) {
          setSelectedAddressId(mappedAddresses[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Load items - Check if type is "direct" or "cart"
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const state = location.state as {
          type: "direct" | "cart";
          productId?: number;
          quantity?: number;
        } | null;

        if (!state) {
          toast.error("잘못된 접근입니다");
          router.push("/");
          return;
        }

        if (state.type === "direct" && state.productId) {
          // 직접 구매 - API에서 상품 정보 조회
          const token = await getAccessToken();
          if (!token) {
            toast.error("인증 정보가 없습니다");
            router.push("/login");
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/products`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const product = data.products?.find(
              (p: any) => p.id === state.productId
            );

            if (product) {
              setProducts([
                {
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  quantity: state.quantity || 1,
                  image:
                    product.images && product.images.length > 0
                      ? product.images[0]
                      : "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                },
              ]);
            } else {
              toast.error("상품을 찾을 수 없습니다");
              router.push("/");
            }
          } else {
            toast.error("상품 정보를 불러오는데 실패했습니다");
            router.push("/");
          }
        } else if (state.type === "cart") {
          // 장바구니에서 구매
          const token = await getAccessToken();
          if (!token) {
            toast.error("로그인이 필요합니다");
            router.push("/login");
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/cart`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const cartProducts =
              data.cart?.map((item: any) => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
              })) || [];

            if (cartProducts.length === 0) {
              toast.error("장바구니가 비어있습니다");
              router.push("/cart");
              return;
            }

            setProducts(cartProducts);
          } else {
            toast.error("장바구니 정보를 불러오는데 실패했습니다");
            router.push("/cart");
          }
        }
      } catch (error) {
        console.error("Failed to load checkout items:", error);
        toast.error("주문 정보를 불러오는데 실패했습니다");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    // 세션 로딩 중이면 체크하지 않음
    if (isAuthLoading) return;

    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    loadAddresses();
    loadItems();
  }, [isLoggedIn, navigate, location.state, getAccessToken, isAuthLoading]);

  // Validation functions
  const validateName = (name: string): string => {
    if (!name.trim()) return "배송지명을 입력해주세요";
    if (name.length < 2) return "배송지명은 2자 이상이어야 합니다";
    return "";
  };

  const validateRecipient = (recipient: string): string => {
    if (!recipient.trim()) return "수령인을 입력해주세요";
    if (!/^[가-힣a-zA-Z\s]+$/.test(recipient))
      return "수령인은 한글 또는 영문만 가능합니다";
    return "";
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return "연락처를 입력해주세요";
    if (!/^01[0-9]-\d{4}-\d{4}$/.test(phone))
      return "010-0000-0000 형식으로 입력해주세요";
    return "";
  };

  const validatePostalCode = (postalCode: string): string => {
    if (!postalCode.trim()) return "우편번호를 입력해주세요";
    if (!/^\d{5}$/.test(postalCode)) return "5자리 숫자로 입력해주세요";
    return "";
  };

  const validateAddress = (address: string): string => {
    if (!address.trim()) return "주소를 입력해주세요";
    if (address.length < 5) return "주소를 정확히 입력해주세요";
    return "";
  };

  const handleChange = (field: string, value: string) => {
    setAddressData({ ...addressData, [field]: value });

    // Real-time validation
    let error = "";
    if (field === "name") error = validateName(value);
    else if (field === "recipient") error = validateRecipient(value);
    else if (field === "phone") error = validatePhone(value);
    else if (field === "postalCode") error = validatePostalCode(value);
    else if (field === "address") error = validateAddress(value);

    setErrors({ ...errors, [field]: error });
  };

  const handleSaveNewAddress = async () => {
    if (!isLoggedIn) return;

    // Validate all fields
    const validationErrors = {
      name: validateName(addressData.name),
      recipient: validateRecipient(addressData.recipient),
      phone: validatePhone(addressData.phone),
      postalCode: validatePostalCode(addressData.postalCode),
      address: validateAddress(addressData.address),
    };

    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("배송지 정보를 확인해주세요");
      return;
    }

    const newAddressData = {
      name: addressData.recipient.trim(), // 수령인 이름
      addressName: addressData.name.trim() || "배송지", // 배송지명
      phone: addressData.phone.trim(),
      address: addressData.address.trim(),
      detailAddress: addressData.detailAddress.trim(),
      zipCode: addressData.postalCode.trim(),
      isDefault: addressData.isDefault,
    };

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/addresses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAddressData),
      });

      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
        setSelectedAddressId(data.address.id);
        setShowAddressForm(false);
        toast.success("새 배송지가 추가되었습니다!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "배송지 추가에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to add address:", error);
      toast.error("배송지 추가에 실패했습니다");
    }
  };

  const totalAmount = products.reduce(
    (sum, p) => sum + (p.price ?? 0) * (p.quantity ?? 0),
    0
  );
  const shippingFee = 3000;
  const finalTotal = totalAmount + shippingFee;

  const handleOrder = async () => {
    if (!isLoggedIn) return;

    // 중복 방지
    if (isProcessing) return;

    // 배송지 선택 확인
    if (!selectedAddressId && !showAddressForm) {
      toast.error("배송지를 선택하거나 새로 등록해주세요");
      return;
    }

    // 새 배송지 등록 중인 경우
    if (showAddressForm) {
      toast.error("배송지를 먼저 저장해주세요");
      return;
    }

    setIsProcessing(true);

    const selectedAddress = addresses.find(
      (addr) => addr.id === selectedAddressId
    );
    if (!selectedAddress) {
      toast.error("배송지를 선택해주세요");
      return;
    }

    // 주문 생성
    const orderItems = products.map((p) => ({
      id: p.productId,
      productId: p.productId,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      image: p.image,
    }));

    const orderData = {
      items: orderItems,
      totalAmount: finalTotal,
      shippingAddress: {
        recipient: selectedAddress.recipient,
        phone: selectedAddress.phone,
        address: selectedAddress.address,
        detailAddress: selectedAddress.detailAddress,
        postalCode: selectedAddress.postalCode,
      },
    };

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const data = await response.json();
        const newOrder = data.order;

        // 장바구니에서 구매한 경우 장바구니 비우기
        const state = location.state as { type: "direct" | "cart" } | null;
        if (state?.type === "cart") {
          try {
            // 모든 장바구니 아이템 삭제 요청
            const cartResponse = await fetch(`${API_BASE_URL}/api/cart/clear`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (cartResponse.ok) {
              console.log("장바구니가 클리어되었습니다");
            }
          } catch (error) {
            console.error("Failed to clear cart:", error);
            // 장바구니 클리어 실패는 주문 완료를 막지 않음
          }
        }

        // 주문 완료 페이지로 이동
        router.push("/order-complete", { state: { order: newOrder } });
      } else {
        toast.error("주문 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error("주문 생성에 실패했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="text-center py-20">
          <p className="text-gray-500">주문 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const selectedAddress = addresses.find(
    (addr) => addr.id === selectedAddressId
  );

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
            주문/결제
          </h1>
          <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
            주문 정보를 확인하고 결제를 진행하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        {/* 주문 상품 */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-bold mb-4">주문 상품</h2>
          <div className="space-y-4">
            {products.map((product, index) => (
              <div
                key={index}
                className="flex items-center gap-4 pb-4 border-b last:border-b-0"
              >
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-bold">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    수량: {product.quantity}개
                  </p>
                </div>
                <p className="font-bold">
                  {(
                    (product.price ?? 0) * (product.quantity ?? 0)
                  ).toLocaleString()}
                  원
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 배송지 정보 */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">배송지 정보</h2>
            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="flex items-center gap-1 text-sm text-[#b78b1f] hover:underline font-bold"
              >
                <Plus size={16} />새 배송지 등록
              </button>
            )}
          </div>

          {showAddressForm ? (
            /* 새 배송지 등록 폼 */
            <div className="space-y-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">새 배송지 등록</h3>
                <button
                  onClick={() => setShowAddressForm(false)}
                  className="text-sm text-gray-600 hover:text-black"
                >
                  취소
                </button>
              </div>

              {/* Address Name */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  배송지명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={`w-full bg-white rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="예) 집, 회사"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  수령인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressData.recipient}
                  onChange={(e) => handleChange("recipient", e.target.value)}
                  className={`w-full bg-white rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    errors.recipient ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="받는 분의 성함"
                />
                {errors.recipient && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.recipient}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={addressData.phone}
                  onChange={(e) =>
                    handleChange("phone", formatPhoneNumber(e.target.value))
                  }
                  className={`w-full bg-white rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="숫자만 입력 (자동 하이픈)"
                  maxLength={13}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  우편번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressData.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  className={`w-full bg-white rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    errors.postalCode ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="5자리 우편번호 (예: 06234)"
                  maxLength={5}
                />
                {errors.postalCode && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.postalCode}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className={`w-full bg-white rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    errors.address ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="기본 주소"
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                )}
              </div>

              {/* Detail Address */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  상세 주소
                </label>
                <input
                  type="text"
                  value={addressData.detailAddress}
                  onChange={(e) =>
                    setAddressData({
                      ...addressData,
                      detailAddress: e.target.value,
                    })
                  }
                  className="w-full bg-white rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="동/호수 등 상세 주소"
                />
              </div>

              {/* Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressData.isDefault}
                  onChange={(e) =>
                    setAddressData({
                      ...addressData,
                      isDefault: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm font-bold cursor-pointer"
                >
                  기본 배송지로 설정
                </label>
              </div>

              <button
                onClick={handleSaveNewAddress}
                className="w-full bg-black text-white rounded px-4 py-3 font-bold hover:bg-gray-800"
              >
                배송지 저장
              </button>
            </div>
          ) : addresses.length > 0 ? (
            /* 배송지 선택 드롭다운 */
            <div>
              <label className="block text-sm font-bold mb-2">
                배송지 선택 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedAddressId || ""}
                  onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                  className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black appearance-none pr-10 font-bold"
                >
                  <option value="" disabled>
                    배송지를 선택하세요
                  </option>
                  {addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.name} - {addr.recipient} ({addr.address})
                      {addr.isDefault ? " [기본]" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={20}
                />
              </div>

              {/* 선택된 배송지 상세 정보 */}
              {selectedAddress && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded">
                      {selectedAddress.type === "home" ? (
                        <Home size={20} />
                      ) : (
                        <Building size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold">{selectedAddress.name}</h3>
                        {selectedAddress.isDefault && (
                          <span className="bg-[#b78b1f] text-white text-xs px-2 py-1 rounded">
                            기본
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p className="font-bold">{selectedAddress.recipient}</p>
                        <p>{selectedAddress.phone}</p>
                        <p>
                          ({selectedAddress.postalCode}){" "}
                          {selectedAddress.address}
                        </p>
                        {selectedAddress.detailAddress && (
                          <p>{selectedAddress.detailAddress}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">등록된 배송지가 없습니다</p>
              <button
                onClick={() => setShowAddressForm(true)}
                className="bg-black text-white rounded px-6 py-2 font-bold hover:bg-gray-800 inline-flex items-center gap-2"
              >
                <Plus size={18} />새 배송지 등록
              </button>
            </div>
          )}
        </div>

        {/* 결제 방법 */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-bold mb-4">결제 방법</h2>
          <div className="bg-[#eeeeee] rounded p-4">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="bank"
                checked
                readOnly
                className="w-4 h-4"
              />
              <label htmlFor="bank" className="font-bold">
                무통장 입금
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              주문 완료 후 입금 계좌 정보를 안내해드립니다.
            </p>
          </div>
        </div>

        {/* 결제 금액 */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-bold mb-4">결제 금액</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>상품 금액</span>
              <span>{totalAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>배송비</span>
              <span>{shippingFee.toLocaleString()}원</span>
            </div>
            <div className="h-px bg-gray-200 my-3" />
            <div className="flex justify-between font-bold text-lg">
              <span>총 결제 금액</span>
              <span className="text-[#b78b1f]">
                {finalTotal.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 주문하기 버튼 */}
        <button
          onClick={handleOrder}
          className="w-full flex items-center justify-center bg-black text-white rounded-lg py-4 font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isProcessing}
        >
          {isProcessing
            ? "주문 처리 중..."
            : `${finalTotal.toLocaleString()}원 주문하기`}
        </button>
      </div>
    </main>
  );
}
