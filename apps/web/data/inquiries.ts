export interface Inquiry {
  id: string;
  userId: number;
  title: string;
  content: string;
  category: "ìƒí’ˆë¬¸ì˜" | "ë°°ì†¡ë¬¸ì˜" | "êµí™˜/ë°˜í’ˆ" | "ê²°ì œë¬¸ì˜" | "ê¸°íƒ€";
  status: "ëŒ€ê¸°" | "ë‹µë³€ì™„ë£Œ";
  createdAt: string;
  answer?: {
    content: string;
    answeredAt: string;
    answeredBy: number; // ê´€ë¦¬ìž ID
  };
}

// ë°°í¬ìš© - ë¹ˆ ë°°ì—´ë¡œ ì‹œìž‘
export const inquiries: Inquiry[] = [];

// ë¬¸ì˜ ë‹µë³€ ì¶”ê°€
export function addInquiryAnswer(inquiryId: string, content: string, adminId: number): boolean {
  const inquiry = inquiries.find(i => i.id === inquiryId);
  if (!inquiry) return false;

  inquiry.answer = {
    content,
    answeredAt: new Date().toISOString().split('T')[0],
    answeredBy: adminId
  };
  inquiry.status = "ë‹µë³€ì™„ë£Œ";

  console.log("ë¬¸ì˜ ë‹µë³€ ì¶”ê°€:", { inquiryId, adminId });
  // TODO: SQL UPDATE inquiries SET answer = ?, answered_at = ?, answered_by = ?, status = 'ë‹µë³€ì™„ë£Œ' WHERE id = ?

  return true;
}

// ë¬¸ì˜ ì¶”ê°€
export function addInquiry(userId: number, title: string, content: string, category: Inquiry["category"]): Inquiry {
  const newId = `INQ-${new Date().getFullYear()}-${String(inquiries.length + 1).padStart(3, '0')}`;

  const newInquiry: Inquiry = {
    id: newId,
    userId,
    title,
    content,
    category,
    status: "ëŒ€ê¸°",
    createdAt: new Date().toISOString().split('T')[0]
  };

  inquiries.push(newInquiry);

  console.log("ë¬¸ì˜ ì¶”ê°€:", newInquiry);
  // TODO: SQL INSERT INTO inquiries (id, user_id, title, content, category, status, created_at) VALUES (...)

  return newInquiry;
}

// ì‚¬ìš©ìžë³„ ë¬¸ì˜ ì¡°íšŒ
export function getInquiriesByUserId(userId: number): Inquiry[] {
  return inquiries.filter(i => i.userId === userId);
}
