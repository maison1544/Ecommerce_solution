-- ============================================
-- Solution Studio E-commerce Database Schema
-- ============================================
-- 이 파일은 새로운 Supabase 프로젝트에 실행하세요
-- Supabase Dashboard > SQL Editor에서 실행

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PRODUCTS 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(name) <= 200),
    price NUMERIC NOT NULL CHECK (price >= 0),
    original_price NUMERIC CHECK (original_price >= 0),
    category TEXT NOT NULL,
    has_discount BOOLEAN DEFAULT false,
    discount INTEGER CHECK (discount >= 0 AND discount <= 100),
    images TEXT[] DEFAULT '{}',
    rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    description TEXT CHECK (char_length(description) <= 10000),
    specs TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. USER_ACCOUNTS 테이블 (일반 사용자)
-- ============================================
CREATE TABLE IF NOT EXISTS user_accounts (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '이름 없음',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    default_address_id BIGINT,
    signup_ip TEXT,
    last_login_ip TEXT,
    last_login_at TIMESTAMPTZ,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMPTZ
);

-- ============================================
-- 3. ADMIN_ACCOUNTS 테이블 (관리자)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_accounts (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '이름 없음',
    created_at TIMESTAMPTZ DEFAULT now(),
    signup_ip TEXT,
    last_login_ip TEXT,
    last_login_at TIMESTAMPTZ,
    created_by_email TEXT,
    created_by_ip TEXT,
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMPTZ
);

-- ============================================
-- 4. ADDRESSES 테이블 (배송지)
-- ============================================
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    recipient TEXT NOT NULL CHECK (char_length(recipient) <= 100),
    phone TEXT NOT NULL CHECK (char_length(phone) <= 20),
    address TEXT NOT NULL CHECK (char_length(address) <= 500),
    detail_address TEXT,
    postal_code TEXT NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_accounts의 default_address_id FK 추가
ALTER TABLE user_accounts 
ADD CONSTRAINT user_accounts_default_address_id_fkey 
FOREIGN KEY (default_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

-- ============================================
-- 5. CART_ITEMS 테이블 (장바구니)
-- ============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    product_name TEXT,
    price NUMERIC CHECK (price >= 0),
    original_price NUMERIC CHECK (original_price >= 0),
    image TEXT,
    discount INTEGER DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    has_discount BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- ============================================
-- 6. ORDERS 테이블 (주문)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_date TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL DEFAULT '배송 준비 중' CHECK (status IN ('배송 준비 중', '배송 중', '배송 완료', '취소')),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    recipient TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    detail_address TEXT,
    postal_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. ORDER_ITEMS 테이블 (주문 상품)
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC NOT NULL CHECK (price >= 0),
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. REVIEWS 테이블 (리뷰)
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author TEXT NOT NULL CHECK (char_length(author) <= 100),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    likes INTEGER DEFAULT 0,
    review_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. REVIEW_HELPFUL 테이블 (리뷰 도움됨)
-- ============================================
CREATE TABLE IF NOT EXISTS review_helpful (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(review_id, user_id)
);

-- ============================================
-- 10. INQUIRIES 테이블 (문의)
-- ============================================
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    content TEXT NOT NULL CHECK (char_length(content) <= 20000),
    category TEXT NOT NULL CHECK (category IN ('주문/배송', '교환/환불', '회원정보', '상품문의', '배송문의', '교환/반품', '결제문의', '기타')),
    status TEXT NOT NULL DEFAULT '대기' CHECK (status IN ('대기', '답변완료')),
    answer_content TEXT,
    answered_at TIMESTAMPTZ,
    answered_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. LOGIN_ATTEMPTS 테이블 (로그인 시도)
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS (Row Level Security) 활성화
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Products: 모든 사용자가 읽기 가능
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Products are editable by service role" ON products FOR ALL USING (true);

-- User Accounts: 본인만 접근
CREATE POLICY "Users can view own account" ON user_accounts FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own account" ON user_accounts FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access to user_accounts" ON user_accounts FOR ALL USING (true);

-- Admin Accounts: 관리자만 접근
CREATE POLICY "Admins can view own account" ON admin_accounts FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service role full access to admin_accounts" ON admin_accounts FOR ALL USING (true);

-- Addresses: 본인만 접근
CREATE POLICY "Users can view own addresses" ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON addresses FOR DELETE USING (auth.uid() = user_id);

-- Cart Items: 본인만 접근
CREATE POLICY "Users can view own cart" ON cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cart" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart" ON cart_items FOR DELETE USING (auth.uid() = user_id);

-- Orders: 본인만 접근
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access to orders" ON orders FOR ALL USING (true);

-- Order Items: 주문 소유자만 접근
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Service role full access to order_items" ON order_items FOR ALL USING (true);

-- Reviews: 모두 읽기 가능, 본인만 수정/삭제
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Review Helpful: 본인만 접근
CREATE POLICY "Users can view own helpful" ON review_helpful FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own helpful" ON review_helpful FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own helpful" ON review_helpful FOR DELETE USING (auth.uid() = user_id);

-- Inquiries: 본인만 접근
CREATE POLICY "Users can view own inquiries" ON inquiries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inquiries" ON inquiries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access to inquiries" ON inquiries FOR ALL USING (true);

-- Login Attempts: Service role만 접근
CREATE POLICY "Service role full access to login_attempts" ON login_attempts FOR ALL USING (true);

-- ============================================
-- INDEXES (성능 최적화)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);

-- ============================================
-- 완료 메시지
-- ============================================
-- 스키마 생성 완료!
-- 다음 단계:
-- 1. Edge Function 배포: supabase functions deploy shop-api
-- 2. 환경 변수 설정
-- 3. 관리자 계정 생성 (Edge Function API 통해)
