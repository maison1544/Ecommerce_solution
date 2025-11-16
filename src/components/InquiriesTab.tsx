import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../context/AuthContext";
import { projectId } from "../utils/supabase/info";

interface Inquiry {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  category: "주문/배송" | "교환/환불" | "회원정보" | "기타";
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
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  // 문의 목록 로드
  useEffect(() => {
    const loadInquiries = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/api/admin/inquiries`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setInquiryList(data.inquiries || []);
        } else {
          console.error('Failed to load inquiries');
          setInquiryList([]);
        }
      } catch (error) {
        console.error('Failed to load inquiries:', error);
        setInquiryList([]);
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();
  }, []);

  const handleAnswerSubmit = async (inquiryId: string) => {
    const answer = answerText[inquiryId];
    if (!answer || !answer.trim()) {
      toast.error("답변 내용을 입력해주세요");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/api/inquiries/${inquiryId}/answer`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answer: answer.trim() })
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 문의 목록 업데이트
        setInquiryList(inquiryList.map(inquiry => 
          inquiry.id === inquiryId ? data.inquiry : inquiry
        ));
        setAnswerText({ ...answerText, [inquiryId]: "" });
        toast.success("문의에 답변이 등록되었습니다!");
      } else {
        toast.error("답변 등록에 실패했습니다");
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error("답변 등록에 실패했습니다");
    }
  };

  // 검색: 문의번호, 제목, 내용으로 검색 가능
  const filteredInquiries = inquiryList
    .filter(i => {
      return (
        i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    // 정렬: 미답변 문의가 최상단, 그 다음 최신순
    .sort((a, b) => {
      // 1. 미답변이 먼저 오도록
      if (a.status === "대기" && b.status === "답변완료") return -1;
      if (a.status === "답변완료" && b.status === "대기") return 1;
      
      // 2. 같은 상태면 최신순 정렬
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // 최신순
    });

  // 페이지네이션
  const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInquiries = filteredInquiries.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">문의 내역을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // 검색 시 첫 페이지로
            }}
            placeholder="문의번호, 제목, 내용으로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Inquiries List */}
      <div className="space-y-4 mb-4">
        {paginatedInquiries.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
            문의 내역이 없습니다
          </div>
        ) : (
          paginatedInquiries.map((inquiry) => {
            return (
              <div key={inquiry.id} className="bg-white border rounded-lg p-6">
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
                      <span>작성일: {new Date(inquiry.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                </div>

                {/* Question Content */}
                <div className="bg-gray-50 rounded p-4 mb-4">
                  <p className="text-sm whitespace-pre-wrap">{inquiry.content}</p>
                </div>

                {/* Answer Section */}
                {inquiry.answer ? (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-blue-900">관리자 답변</span>
                      <span className="text-xs text-blue-600">
                        {new Date(inquiry.answer.answeredAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-blue-900">{inquiry.answer.content}</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold mb-2">답변 작성</label>
                    <textarea
                      value={answerText[inquiry.id] || ""}
                      onChange={(e) => setAnswerText({ ...answerText, [inquiry.id]: e.target.value })}
                      className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black min-h-[120px]"
                      placeholder="고객에게 전달할 답변을 입력하세요"
                    />
                    <button
                      onClick={() => handleAnswerSubmit(inquiry.id)}
                      className="mt-2 bg-black text-white rounded px-6 py-2 font-bold hover:bg-gray-800"
                    >
                      답변 등록
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            이전
          </button>
          <span className="px-4 py-2 font-bold">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
