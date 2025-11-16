export interface Inquiry {
  id: string;
  userId: number;
  title: string;
  content: string;
  category: "상품문의" | "배송문의" | "교환/반품" | "결제문의" | "기타";
  status: "대기" | "답변완료";
  createdAt: string;
  answer?: {
    content: string;
    answeredAt: string;
    answeredBy: number; // 관리자 ID
  };
}

// 배포용 - 빈 배열로 시작
export const inquiries: Inquiry[] = [];

// 문의 답변 추가
export function addInquiryAnswer(inquiryId: string, content: string, adminId: number): boolean {
  const inquiry = inquiries.find(i => i.id === inquiryId);
  if (!inquiry) return false;

  inquiry.answer = {
    content,
    answeredAt: new Date().toISOString().split('T')[0],
    answeredBy: adminId
  };
  inquiry.status = "답변완료";

  console.log("문의 답변 추가:", { inquiryId, adminId });
  // TODO: SQL UPDATE inquiries SET answer = ?, answered_at = ?, answered_by = ?, status = '답변완료' WHERE id = ?

  return true;
}

// 문의 추가
export function addInquiry(userId: number, title: string, content: string, category: Inquiry["category"]): Inquiry {
  const newId = `INQ-${new Date().getFullYear()}-${String(inquiries.length + 1).padStart(3, '0')}`;
  
  const newInquiry: Inquiry = {
    id: newId,
    userId,
    title,
    content,
    category,
    status: "대기",
    createdAt: new Date().toISOString().split('T')[0]
  };

  inquiries.push(newInquiry);

  console.log("문의 추가:", newInquiry);
  // TODO: SQL INSERT INTO inquiries (id, user_id, title, content, category, status, created_at) VALUES (...)

  return newInquiry;
}

// 사용자별 문의 조회
export function getInquiriesByUserId(userId: number): Inquiry[] {
  return inquiries.filter(i => i.userId === userId);
}
