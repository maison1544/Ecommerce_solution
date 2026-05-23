export interface User {
  id: string;  // Supabase Auth는 UUID string을 사용
  name: string;
  email: string;
  password?: string;  // 선택적으로 변경 (Supabase Auth에서는 반환하지 않음)
  phone: string;
  birthDate?: string;
  createdAt: string;
  role: "customer" | "admin";
  isBlocked?: boolean;
  blockedIp?: string;
}
