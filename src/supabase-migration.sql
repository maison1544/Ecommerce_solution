-- ================================================
-- E-COMMERCE DATABASE SCHEMA
-- Supabase PostgreSQL Migration
-- ================================================

-- 1. Users Table (회원)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birth_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_ip VARCHAR(50)
);

-- 2. Products Table (상품)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  original_price INTEGER,
  category VARCHAR(50) NOT NULL,
  has_discount BOOLEAN DEFAULT FALSE,
  images TEXT[], -- 최대 4개 이미지 URL 배열
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,
  description TEXT,
  specs TEXT[],
  discount INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Addresses Table (배송지)
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  recipient VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  detail_address TEXT,
  postal_code VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Cart Items Table (장바구니)
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id) -- 같은 상품 중복 방지
);

-- 5. Orders Table (주문)
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT '배송 준비 중' CHECK (status IN ('배송 준비 중', '배송 중', '배송 완료', '취소')),
  total_amount INTEGER NOT NULL,
  tracking_number VARCHAR(50),
  -- 배송지 정보 (JSON으로 저장)
  recipient VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  detail_address TEXT,
  postal_code VARCHAR(10) NOT NULL
);

-- 6. Order Items Table (주문 상세)
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  image TEXT
);

-- 7. Reviews Table (리뷰)
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_date DATE DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  images TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Inquiries Table (고객센터 문의)
CREATE TABLE IF NOT EXISTS inquiries (
  id VARCHAR(50) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('상품문의', '배송문의', '교환/반품', '결제문의', '기타')),
  status VARCHAR(20) DEFAULT '대기' CHECK (status IN ('대기', '답변완료')),
  created_at TIMESTAMP DEFAULT NOW(),
  -- 답변 정보
  answer_content TEXT,
  answered_at TIMESTAMP,
  answered_by INTEGER REFERENCES users(id)
);

-- ================================================
-- INDEXES (성능 최적화)
-- ================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- ================================================
-- ROW LEVEL SECURITY (RLS) - 보안 정책
-- ================================================

-- Users: 자신의 정보만 조회/수정 가능
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Products: 모두 조회 가능
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- Addresses: 자신의 배송지만 조회/수정
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Cart: 자신의 장바구니만 조회/수정
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Orders: 자신의 주문만 조회
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Reviews: 모두 조회 가능, 작성은 로그인 필요
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);

-- Inquiries: 자신의 문의만 조회
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 완료 메시지
-- ================================================

SELECT 'Database schema created successfully! 🎉' AS message;
