import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/utils/api";
import { formatPhoneNumber } from "../utils/phoneFormat";

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

export default function AddressesPage() {
  const router = useRouter();
  const { isLoggedIn, getAccessToken, isAuthLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Omit<Address, "id" | "userId">>({
    name: "",
    recipient: "",
    phone: "",
    address: "",
    detailAddress: "",
    postalCode: "",
    isDefault: false,
  });

  const [errors, setErrors] = useState({
    name: "",
    recipient: "",
    phone: "",
    postalCode: "",
    address: "",
  });

  // 배송지 로드
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
        // 백엔드 응답 필드명이 프론트엔드와 동일함
        // name: 배송지명, recipient: 수령인, postalCode: 우편번호
        setAddresses(data.addresses || []);
      } else {
        setAddresses([]);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  // 로그인 체크 및 배송지 로드
  useEffect(() => {
    // 세션 로딩 중이면 체크하지 않음
    if (isAuthLoading) return;

    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      router.push("/login");
      return;
    }

    loadAddresses();
  }, [isLoggedIn, navigate, isAuthLoading]);

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
    setFormData({ ...formData, [field]: value });

    // Real-time validation
    let error = "";
    if (field === "name") error = validateName(value);
    else if (field === "recipient") error = validateRecipient(value);
    else if (field === "phone") error = validatePhone(value);
    else if (field === "postalCode") error = validatePostalCode(value);
    else if (field === "address") error = validateAddress(value);

    setErrors({ ...errors, [field]: error });
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: "",
      recipient: "",
      phone: "",
      address: "",
      detailAddress: "",
      postalCode: "",
      isDefault: addresses.length === 0,
    });
    setErrors({
      name: "",
      recipient: "",
      phone: "",
      postalCode: "",
      address: "",
    });
  };

  const handleEdit = (address: Address) => {
    setEditingId(address.id);
    setIsAdding(false);
    setFormData({
      name: address.name,
      recipient: address.recipient,
      phone: address.phone,
      address: address.address,
      detailAddress: address.detailAddress,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
    setErrors({
      name: "",
      recipient: "",
      phone: "",
      postalCode: "",
      address: "",
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: "",
      recipient: "",
      phone: "",
      address: "",
      detailAddress: "",
      postalCode: "",
      isDefault: false,
    });
    setErrors({
      name: "",
      recipient: "",
      phone: "",
      postalCode: "",
      address: "",
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate all fields
    const validationErrors = {
      name: validateName(formData.name),
      recipient: validateRecipient(formData.recipient),
      phone: validatePhone(formData.phone),
      postalCode: validatePostalCode(formData.postalCode),
      address: validateAddress(formData.address),
    };

    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("배송지 정보를 확인해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("로그인이 필요합니다");
        router.push("/login");
        return;
      }

      if (editingId !== null) {
        // 수정
        const response = await fetch(
          `${API_BASE_URL}/api/addresses/${editingId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: formData.recipient, // 수령인 이름
              addressName: formData.name, // 배송지명
              phone: formData.phone,
              address: formData.address,
              detailAddress: formData.detailAddress,
              zipCode: formData.postalCode,
              isDefault: formData.isDefault,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          // 백엔드 응답 필드명이 프론트엔드와 동일함
          setAddresses(data.addresses || []);
          toast.success("배송지가 수정되었습니다");
          handleCancel();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "배송지 수정에 실패했습니다");
        }
      } else {
        // 추가
        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.recipient, // 수령인 이름
            addressName: formData.name, // 배송지명
            phone: formData.phone,
            address: formData.address,
            detailAddress: formData.detailAddress,
            zipCode: formData.postalCode,
            isDefault: formData.isDefault,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // 백엔드 응답 필드명이 프론트엔드와 동일함
          setAddresses(data.addresses || []);
          toast.success("배송지가 추가되었습니다");
          handleCancel();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "배송지 추가에 실패했습니다");
        }
      }
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error("배송지 저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 배송지를 삭제하시겠습니까?")) return;

    setDeletingId(id);

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // 백엔드 응답 필드명이 프론트엔드와 동일함
        setAddresses(data.addresses || []);
        toast.success("배송지가 삭제되었습니다");
      } else {
        toast.error("배송지 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("배송지 삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefaultId(id);

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const address = addresses.find((a) => a.id === id);
      if (!address) return;

      const response = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: address.recipient, // 수령인 이름
          addressName: address.name, // 배송지명
          phone: address.phone,
          address: address.address,
          detailAddress: address.detailAddress,
          zipCode: address.postalCode,
          isDefault: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // 백엔드 응답 필드명이 프론트엔드와 동일함
        setAddresses(data.addresses || []);
        toast.success("기본 배송지가 변경되었습니다");
      } else {
        toast.error("기본 배송지 변경에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to set default address:", error);
      toast.error("기본 배송지 변경에 실패했습니다");
    } finally {
      setSettingDefaultId(null);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="text-center py-20">
          <p className="text-gray-500">배송지 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
            배송지 관리
          </h1>
          <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
            자주 사용하는 배송지를 등록���고 관리하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        {/* Add New Button */}
        {!isAdding && editingId === null && (
          <button
            onClick={handleAddNew}
            className="w-full bg-black text-white rounded-lg py-4 font-bold mb-6 flex items-center justify-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />새 배송지 추가
          </button>
        )}

        {/* Add/Edit Form */}
        {(isAdding || editingId !== null) && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border">
            <h2 className="font-bold mb-4">
              {editingId !== null ? "배송지 수정" : "새 배송지 추가"}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  배송지명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
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
                  value={formData.recipient}
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
                  value={formData.phone}
                  onChange={(e) =>
                    handleChange("phone", formatPhoneNumber(e.target.value))
                  }
                  className={`w-full bg-white rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="숫자만 입력"
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
                  value={formData.postalCode}
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
                  value={formData.address}
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
                  value={formData.detailAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, detailAddress: e.target.value })
                  }
                  className="w-full bg-white rounded border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                  placeholder="동/호수 등 상세 주소"
                />
              </div>

              {/* Default Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
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

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-black text-white rounded px-4 py-3 font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "처리 중..."
                    : editingId !== null
                    ? "수정"
                    : "저장"}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-white border border-gray-300 text-black rounded px-4 py-3 font-bold hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Address List */}
        {addresses.length === 0 ? (
          <div className="text-center py-20">
            <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">등록된 배송지가 없습니다</h2>
            <p className="text-gray-600">
              새 배송지를 추가하여 빠르게 주문하세요
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white border rounded-lg p-6 ${
                  address.isDefault ? "border-[#b78b1f] border-2" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{address.name}</h3>
                    {address.isDefault && (
                      <span className="bg-[#b78b1f] text-white text-xs px-2 py-1 rounded">
                        기본
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-2 hover:bg-gray-100 rounded text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={deletingId === address.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">수령인:</span>{" "}
                    <span className="font-bold">{address.recipient}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">연락처:</span>{" "}
                    <span className="font-bold">{address.phone}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">주소:</span>{" "}
                    <span className="font-bold">
                      ({address.postalCode}) {address.address}{" "}
                      {address.detailAddress}
                    </span>
                  </p>
                </div>

                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="mt-4 w-full bg-gray-100 text-black rounded px-4 py-2 text-sm font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={settingDefaultId === address.id}
                  >
                    {settingDefaultId === address.id
                      ? "처리 중..."
                      : "기본 배송지로 설정"}
                  </button>
                )}
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
