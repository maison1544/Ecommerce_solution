import { useState, useEffect } from "react";
import { MessageSquare, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { API_BASE_URL } from "../utils/api";

// 날짜 포맷팅 함수: 2025. 12. 6. 18:06:33
const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${year}. ${month}. ${day}. ${hours}:${mins}:${secs}`;
};

interface Inquiry {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  category:
    | "주문/배송"
    | "교환/환불"
    | "회원정보"
    | "상품문의"
    | "배송문의"
    | "교환/반품"
    | "결제문의"
    | "기타";
  status: "대기" | "답변완료";
  createdAt: string;
  answer?: {
    content: string;
    answeredAt: string;
    answeredBy: string;
  };
}

export default function CustomerServicePage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [userInquiries, setUserInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "기타" as Inquiry["category"],
  });

  // 문의 내역 로드
  const loadInquiries = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/inquiries/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserInquiries(data.inquiries || []);
      } else {
        setUserInquiries([]);
      }
    } catch (error) {
      console.error("Failed to load inquiries:", error);
      setUserInquiries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadInquiries();
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      return;
    }

    // 프론트엔드 검증
    if (!formData.title.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }
    if (formData.title.length < 2 || formData.title.length > 100) {
      toast.error("제목은 2~100자 사이여야 합니다");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("내용을 입력해주세요");
      return;
    }
    if (formData.content.length < 10 || formData.content.length > 2000) {
      toast.error("내용은 10~2000자 사이여야 합니다");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          type: formData.category, // 백엔드는 type 필드를 기대함
        }),
      });

      if (response.ok) {
        await loadInquiries();
        setFormData({ title: "", content: "", category: "기타" });
        setShowForm(false);
        toast.success("문의가 등록되었습니다");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "문의 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
      toast.error("문의 등록에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="max-w-2xl mx-auto text-center py-20">
          <Lock size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-bold mb-4">
            로그인이 필요한 서비스입니다
          </h2>
          <p className="text-gray-600 mb-6">
            1대1 문의는 로그인 후 이용하실 수 있습니다.
          </p>
          <a
            href="/login"
            className="inline-block bg-black text-white rounded-[10px] px-8 py-3 font-bold tracking-wider uppercase hover:bg-gray-800"
          >
            로그인하기
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
            1대1 문의
          </h1>
          <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
            문의사항을 남겨주시면 신속하게 답변해드리겠습니다
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        {/* 문의하기 버튼 */}
        {!showForm && !selectedInquiry && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-black text-white rounded-lg py-4 font-bold mb-6 flex items-center justify-center gap-2 hover:bg-gray-800"
          >
            <MessageSquare size={20} />새 문의 작성
          </button>
        )}

        {/* 문의 작성 폼 */}
        {showForm && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="font-bold mb-4">문의하기</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">카테고리</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Inquiry["category"],
                    })
                  }
                  className="w-full bg-white border border-gray-300 rounded px-4 py-3 outline-none focus:border-black"
                >
                  <option value="주문/배송">주문/배송</option>
                  <option value="교환/환불">교환/환불</option>
                  <option value="회원정보">회원정보</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full bg-white border border-gray-300 rounded px-4 py-3 outline-none focus:border-black"
                  placeholder="문의 제목을 입력하세요"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">내용</label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full bg-white border border-gray-300 rounded px-4 py-3 outline-none focus:border-black"
                  rows={6}
                  placeholder="문의 내용을 입력하세요"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded px-4 py-3 font-bold ${
                    isSubmitting
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {isSubmitting ? "등록 중..." : "등록"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ title: "", content: "", category: "기타" });
                  }}
                  className="flex-1 bg-white border border-gray-300 text-black rounded px-4 py-3 font-bold hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 문의 상세 보기 */}
        {selectedInquiry && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">문의 내용</h2>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-sm text-gray-600 hover:text-black"
              >
                목록으로
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold bg-gray-200 px-3 py-1 rounded">
                    {selectedInquiry.category}
                  </span>
                  <span
                    className={`text-sm font-bold px-3 py-1 rounded ${
                      selectedInquiry.status === "답변완료"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedInquiry.status}
                  </span>
                </div>
                <h3 className="font-bold mb-2">{selectedInquiry.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {formatDateTime(selectedInquiry.createdAt)}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedInquiry.content}
                </p>
              </div>

              {selectedInquiry.answer && (
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h4 className="font-bold mb-2 text-blue-900">답변</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {formatDateTime(selectedInquiry.answer.answeredAt)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedInquiry.answer.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 문의 내역 */}
        {!showForm && !selectedInquiry && (
          <div>
            <h2 className="font-bold mb-4">내 문의 내역</h2>
            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-gray-500">문의 내역을 불러오는 중...</p>
              </div>
            ) : userInquiries.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare
                  size={48}
                  className="mx-auto mb-4 text-gray-400"
                />
                <h3 className="text-xl font-bold mb-2">문의 내역이 없습니다</h3>
                <p className="text-gray-600">
                  궁금한 사항이 있으시면 문의해주세요
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userInquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    onClick={() => setSelectedInquiry(inquiry)}
                    className="bg-white border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold bg-gray-200 px-3 py-1 rounded">
                        {inquiry.category}
                      </span>
                      <span
                        className={`text-sm font-bold px-3 py-1 rounded ${
                          inquiry.status === "답변완료"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {inquiry.status}
                      </span>
                    </div>
                    <h3 className="font-bold mb-2">{inquiry.title}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(inquiry.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
