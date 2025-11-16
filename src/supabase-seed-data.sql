-- ================================================
-- E-COMMERCE SEED DATA (샘플 더미 데이터)
-- ================================================

-- 1. Users (테스트 계정 3개)
INSERT INTO users (name, email, password, phone, birth_date, role) VALUES
('홍길동', 'hong@example.com', 'Password123', '010-1234-5678', '1990-01-01', 'customer'),
('김영희', 'kim@example.com', 'Password123', '010-2345-6789', '1992-05-15', 'customer'),
('관리자', 'admin@example.com', 'Admin123!', '010-0000-0000', '1985-01-01', 'admin');

-- 2. Products (상품 샘플 - 카테고리별 2개씩)
INSERT INTO products (name, price, original_price, category, has_discount, images) VALUES
-- 디지털/가전
('Samsung 갤럭시 S25 Ultra 자급제', 1450000, 1590000, 'digital', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),
('Apple 아이폰 17 Pro 256GB', 1500000, 1750000, 'digital', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),

-- 패션
('나이키 에어맥스 270 운동화', 165000, 189000, 'fashion', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),
('아디다스 슈퍼스타 스니커즈', 119000, NULL, 'fashion', false, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),

-- 식품
('CJ 백설 쌀 20kg', 48900, 56000, 'food', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),
('동원 참치 세트 (48캔)', 35000, NULL, 'food', false, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),

-- 뷰티
('설화수 윤조에센스 90ml', 198000, 220000, 'beauty', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),
('LG 생활건강 후 세트', 250000, NULL, 'beauty', false, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),

-- 생활용품
('LG 트롬 드럼세탁기 21kg', 1200000, 1450000, 'living', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),
('다이슨 에어랩', 699000, NULL, 'living', false, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),

-- 특가상품
('Apple 아이폰 16 Pro 128GB 특가', 999000, 1450000, 'special-deals', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']),
('Samsung QLED TV 55인치 특가', 890000, 1290000, 'special-deals', true, ARRAY['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png']);

-- 3. Addresses (배송지)
INSERT INTO addresses (user_id, name, recipient, phone, address, detail_address, postal_code, is_default) VALUES
(1, '집', '홍길동', '010-1234-5678', '서울특별시 강남구 테헤란로 123', 'A동 101호', '06234', true),
(1, '회사', '홍길동', '010-1234-5678', '서울특별시 서초구 강남대로 456', 'B타워 10층', '06789', false),
(2, '집', '김영희', '010-2345-6789', '경기도 성남시 분당구 판교역로 235', '101동 202호', '13494', true);

-- 4. Reviews (리뷰 샘플)
INSERT INTO reviews (product_id, author, rating, review_date, content, likes) VALUES
(1, '김민수', 5, '2025-11-10', '갤럭시 S25 정말 만족합니다! 카메라 성능이 뛰어나요.', 24),
(1, '이지은', 4, '2025-11-08', '배송도 빠르고 제품 상태도 좋았습니다.', 15),
(2, '박준혁', 5, '2025-11-05', '아이폰 17 Pro 기대 이상이네요!', 32),
(3, '정하늘', 5, '2025-11-12', '나이키 에어맥스 착용감이 정말 좋아요!', 28);

-- 5. Cart Items (장바구니 - 홍길동 계정)
INSERT INTO cart_items (user_id, product_id, quantity) VALUES
(1, 2, 1),
(1, 3, 1);

-- 6. Orders (주문 샘플)
INSERT INTO orders (id, user_id, status, total_amount, recipient, phone, address, detail_address, postal_code, tracking_number) VALUES
('20251114-001', 1, '배송 중', 1500000, '홍길동', '010-1234-5678', '서울특별시 강남구 테헤란로 123', 'A동 101호', '06234', '123456789012'),
('20251113-001', 2, '배송 완료', 165000, '김영희', '010-2345-6789', '경기도 성남시 분당구 판교역로 235', '101동 202호', '13494', '123456789013');

-- 7. Order Items (주문 상세)
INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image) VALUES
('20251114-001', 2, 'Apple 아이폰 17 Pro 256GB', 1, 1500000, 'figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png'),
('20251113-001', 3, '나이키 에어맥스 270 운동화', 1, 165000, 'figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png');

-- 8. Inquiries (문의 샘플)
INSERT INTO inquiries (id, user_id, title, content, category, status, answer_content, answered_at, answered_by) VALUES
('INQ-2024-001', 2, '상품 배송은 언제쯤 도착하나요?', '주문한 상품이 아직 배송중인데 언제 도착하는지 궁금합니다.', '배송문의', '답변완료', '안녕하세요. 주문하신 상품은 2-3일 내로 도착 예정입니다. 감사합니다.', NOW() - INTERVAL '1 day', 3),
('INQ-2024-002', 2, '교환 절차가 궁금합니다', '상품을 교환하고 싶은데 어떻게 해야 하나요?', '교환/반품', '대기', NULL, NULL, NULL);

-- ================================================
-- 완료 메시지
-- ================================================

SELECT 'Seed data inserted successfully! 🎉' AS message;
SELECT '테스트 계정:' AS info;
SELECT 'Customer: hong@example.com / Password123' AS customer_account;
SELECT 'Admin: admin@example.com / Admin123!' AS admin_account;
