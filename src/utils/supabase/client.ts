import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Supabase 클라이언트 싱글톤 인스턴스
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseInstance) {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    supabaseInstance = createSupabaseClient(supabaseUrl, publicAnonKey, {
      auth: {
        autoRefreshToken: false, // Disable automatic token refresh to prevent fetch errors
        persistSession: true, // Keep sessions in localStorage
        detectSessionInUrl: false, // Don't check URL for session
      }
    });
  }
  return supabaseInstance;
}

// 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          name: string;
          email: string;
          password: string;
          phone: string | null;
          birth_date: string | null;
          created_at: string;
          role: 'customer' | 'admin';
          is_blocked: boolean;
          blocked_ip: string | null;
        };
        Insert: {
          name: string;
          email: string;
          password: string;
          phone?: string;
          birth_date?: string;
          role?: 'customer' | 'admin';
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          price: number;
          original_price: number | null;
          category: string;
          has_discount: boolean;
          images: string[] | null;
          rating: number | null;
          review_count: number;
          description: string | null;
          specs: string[] | null;
          discount: number | null;
          created_at: string;
        };
        Insert: {
          name: string;
          price: number;
          original_price?: number;
          category: string;
          has_discount?: boolean;
          images?: string[];
          rating?: number;
          review_count?: number;
          description?: string;
          specs?: string[];
          discount?: number;
        };
      };
      addresses: {
        Row: {
          id: number;
          user_id: number;
          name: string;
          recipient: string;
          phone: string;
          address: string;
          detail_address: string | null;
          postal_code: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          user_id: number;
          name: string;
          recipient: string;
          phone: string;
          address: string;
          detail_address?: string;
          postal_code: string;
          is_default?: boolean;
        };
      };
      cart_items: {
        Row: {
          id: number;
          user_id: number;
          product_id: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          user_id: number;
          product_id: number;
          quantity?: number;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: number;
          order_date: string;
          status: '배송 준비 중' | '배송 중' | '배송 완료' | '취소';
          total_amount: number;
          tracking_number: string | null;
          recipient: string;
          phone: string;
          address: string;
          detail_address: string | null;
          postal_code: string;
        };
        Insert: {
          id: string;
          user_id: number;
          status?: '배송 준비 중' | '배송 중' | '배송 완료' | '취소';
          total_amount: number;
          tracking_number?: string;
          recipient: string;
          phone: string;
          address: string;
          detail_address?: string;
          postal_code: string;
        };
      };
      order_items: {
        Row: {
          id: number;
          order_id: string;
          product_id: number;
          product_name: string;
          quantity: number;
          price: number;
          image: string | null;
        };
        Insert: {
          order_id: string;
          product_id: number;
          product_name: string;
          quantity: number;
          price: number;
          image?: string;
        };
      };
      reviews: {
        Row: {
          id: number;
          product_id: number;
          author: string;
          rating: number;
          review_date: string;
          content: string;
          likes: number;
          images: string[] | null;
          created_at: string;
        };
        Insert: {
          product_id: number;
          author: string;
          rating: number;
          content: string;
          likes?: number;
          images?: string[];
        };
      };
      inquiries: {
        Row: {
          id: string;
          user_id: number;
          title: string;
          content: string;
          category: '상품문의' | '배송문의' | '교환/반품' | '결제문의' | '기타';
          status: '대기' | '답변완료';
          created_at: string;
          answer_content: string | null;
          answered_at: string | null;
          answered_by: number | null;
        };
        Insert: {
          id: string;
          user_id: number;
          title: string;
          content: string;
          category: '상품문의' | '배송문의' | '교환/반품' | '결제문의' | '기타';
          status?: '대기' | '답변완료';
          answer_content?: string;
          answered_at?: string;
          answered_by?: number;
        };
      };
    };
  };
}
