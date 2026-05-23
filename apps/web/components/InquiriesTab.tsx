import { useState, useEffect, useRef, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Pagination } from "./Pagination";
import { API_BASE_URL } from "@/utils/api";
import { formatKoreanDateTime } from "@/utils/date";
import { toast } from "sonner";

// 상태 필터 타입
type StatusFilter = "all" | "pending" | "answered";

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

export function InquiriesTab() {
  const { getAccessToken } = useAuth();
  const [inquiryList, setInquiryList] = useState<Inquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submittingAnswers, setSubmittingAnswers] = useState<{
    [key: string]: boolean;
  }>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [newInquiryCount, setNewInquiryCount] = useState(0);
  // 서버에서 받은 상태별 카운트
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    answered: 0,
  });
  const itemsPerPage = 20;
  const lastFetchRef = useRef<number>(0);
  // 검색 실행 여부 (엔터 키로만 검색)
  const [activeSearch, setActiveSearch] = useState("");

  // 문의 로드 함수 (메모이제이션)
  const loadInquiries = useCallback(
    async (
      page: number = 1,
      search: string = "",
      status: StatusFilter = "all"
    ) => {
      try {
        // Rate limiting: 최소 1초 간격
        const now = Date.now();
        if (now - lastFetchRef.current < 1000) {
          return;
        }
        lastFetchRef.current = now;

        setLoading(true);
        const token = await getAccessToken();
        if (!token) return;

        const params = new URLSearchParams({
          page: page.toString(),
          perPage: itemsPerPage.toString(),
          ...(search && { search }),
          ...(status !== "all" && {
            status: status === "pending" ? "대기" : "답변완료",
          }),
        });

        const response = await fetch(
          `${API_BASE_URL}/api/admin/inquiries?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setInquiryList(data.inquiries || []);
          if (data.pagination) {
            setTotalCount(data.pagination.total);
            setTotalPages(data.pagination.totalPages);
          }
          // 서버에서 받은 상태별 카운트 설정
          if (data.counts) {
            setStatusCounts({
              all: data.counts.all || 0,
              pending: data.counts.pending || 0,
              answered: data.counts.answered || 0,
            });
          }
          setNewInquiryCount(0); // 새 문의 카운트 리셋
        } else {
          console.error("Failed to load inquiries");
          setInquiryList([]);
        }
      } catch (error) {
        console.error("Failed to load inquiries:", error);
        setInquiryList([]);
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken]
  );

  // 페이지, 검색어, 상태 필터 변경 시 데이터 로드
  useEffect(() => {
    loadInquiries(currentPage, activeSearch, statusFilter);
  }, [currentPage, activeSearch, statusFilter, loadInquiries]);

  // 수동 새로고침
  const handleRefresh = () => {
    lastFetchRef.current = 0; // rate limit 리셋
    loadInquiries(currentPage, activeSearch, statusFilter);
  };

  // 검색 실행 (엔터 키)
  const handleSearch = () => {
    setCurrentPage(1);
    setActiveSearch(searchTerm);
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearch("");
    setCurrentPage(1);
  };

  const handleAnswerSubmit = async (inquiryId: string | undefined) => {
    if (!inquiryId) {
      toast.error("문의 ID가 없습니다");
      return;
    }

    // 중복 클릭 방지
    if (submittingAnswers[inquiryId]) {
      toast.info("답변 등록 중입니다...");
      return;
    }

    const answer = answerText[inquiryId];
    if (!answer || !answer.trim()) {
      toast.error("답변 내용을 입력해주세요");
      return;
    }

    setSubmittingAnswers({ ...submittingAnswers, [inquiryId]: true });

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        setSubmittingAnswers({ ...submittingAnswers, [inquiryId]: false });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/inquiries/${inquiryId}/answer`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answer: answer.trim() }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 문의 목록 업데이트
        setInquiryList(
          inquiryList.map((inquiry) =>
            inquiry.id === inquiryId ? data.inquiry : inquiry
          )
        );
        setAnswerText({ ...answerText, [inquiryId]: "" });

        // 카운트 즉시 업데이트 (대기 -1, 답변완료 +1)
        setStatusCounts((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          answered: prev.answered + 1,
        }));

        toast.success("문의에 답변이 등록되었습니다!");

        // 1초 후 버튼 재활성화
        setTimeout(() => {
          setSubmittingAnswers((prev) => ({ ...prev, [inquiryId]: false }));
        }, 1000);
      } else {
        toast.error("답변 등록에 실패했습니다");
        setSubmittingAnswers({ ...submittingAnswers, [inquiryId]: false });
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast.error("답변 등록에 실패했습니다");
      setSubmittingAnswers({ ...submittingAnswers, [inquiryId]: false });
    }
  };

  // 서버에서 이미 필터링 및 정렬된 데이터 사용
  const paginatedInquiries = inquiryList;

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">문의 내역을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* 상태 필터 탭 */}
      <div className="flex items-center gap-2 mb-4 border-b">
        <button
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            statusFilter === "all"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          전체 문의 ({statusCounts.all})
        </button>
        <button
          onClick={() => {
            setStatusFilter("pending");
            setCurrentPage(1);
          }}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            statusFilter === "pending"
              ? "border-yellow-500 text-yellow-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          답변 대기중 ({statusCounts.pending})
        </button>
        <button
          onClick={() => {
            setStatusFilter("answered");
            setCurrentPage(1);
          }}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            statusFilter === "answered"
              ? "border-green-500 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          답변 완료 ({statusCounts.answered})
        </button>

        {/* 새 문의 알림 배지 */}
        {newInquiryCount > 0 && (
          <span className="ml-auto bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            새 문의 {newInquiryCount}건
          </span>
        )}

        {/* 새로고침 버튼 */}
        <button
          onClick={handleRefresh}
          className="ml-auto p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="새로고침"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="문의번호, 제목, 내용, 작성자명으로 검색 (Enter)"
              className="w-full pl-10 pr-10 py-2 border rounded-lg outline-none focus:border-black"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
          >
            검색
          </button>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="space-y-4 mb-4">
        {paginatedInquiries.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
            문의 내역이 없습니다
          </div>
        ) : (
          paginatedInquiries.map((inquiry, index) => {
            // inquiry.id가 없으면 index 사용
            const inquiryKey = inquiry.id || `inquiry-${index}`;
            return (
              <div key={inquiryKey} className="bg-white border rounded-lg p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs font-bold">
                        {inquiry.category}
                      </span>
                      <span className="font-bold text-sm">{inquiry.id}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          inquiry.status === "답변완료"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {inquiry.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{inquiry.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>작성자: {inquiry.userName}</span>
                      <span>작성일: {formatKoreanDateTime(inquiry.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Question Content */}
                <div className="bg-gray-50 rounded p-4 mb-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {inquiry.content}
                  </p>
                </div>

                {/* Answer Section */}
                {inquiry.answer ? (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-blue-900">
                        관리자 답변
                      </span>
                      <span className="text-xs text-blue-600">
                        {formatKoreanDateTime(inquiry.answer.answeredAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-blue-900">
                      {inquiry.answer.content}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      답변 작성
                    </label>
                    <textarea
                      value={answerText[inquiry.id] || ""}
                      onChange={(e) =>
                        setAnswerText({
                          ...answerText,
                          [inquiry.id]: e.target.value,
                        })
                      }
                      className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black min-h-[120px]"
                      placeholder="고객에게 전달할 답변을 입력하세요"
                    />
                    <button
                      onClick={() => handleAnswerSubmit(inquiry.id)}
                      disabled={submittingAnswers[inquiry.id]}
                      className={`mt-2 rounded px-6 py-2 font-bold ${
                        submittingAnswers[inquiry.id]
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      {submittingAnswers[inquiry.id]
                        ? "등록 중..."
                        : "답변 등록"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
