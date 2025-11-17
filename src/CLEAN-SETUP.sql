-- ================================================
-- 🔄 CLEAN SETUP - 기존 것 제거 후 새로 생성
-- ================================================
-- 이 SQL은 기존 테이블/정책을 모두 제거하고 새로 생성합니다.
-- ⚠️ 주의: 기존 데이터가 모두 삭제됩니다!
-- ================================================

-- ==================== 1. 기존 것 모두 제거 ====================

-- 테이블 삭제 (CASCADE로 의존성 모두 제거)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS kv_store_94a0507e CASCADE;

-- 함수 삭제
DROP FUNCTION IF EXISTS cleanup_expired_kv() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_audit() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_user_blocked() CASCADE;

-- 확장 삭제 (필요시)
-- DROP EXTENSION IF EXISTS pgcrypto CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

SELECT '✅ Cleanup completed!' AS status;

-- ==================== 2. KV Store만 생성 (필수) ====================

-- 현재 시스템은 KV Store 기반이므로 이것만 필요합니다
CREATE TABLE kv_store_94a0507e (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_kv_store_key ON kv_store_94a0507e(key);
CREATE INDEX idx_kv_store_created_at ON kv_store_94a0507e(created_at);

-- ⚠️ RLS 비활성화 (Edge Function 전용)
ALTER TABLE kv_store_94a0507e DISABLE ROW LEVEL SECURITY;

SELECT '✅ KV Store created successfully!' AS status;

-- ==================== 완료 ====================

SELECT '🎉 Setup completed!' AS message;
SELECT 'KV Store 테이블만 생성되었습니다.' AS note;
SELECT 'Postgres 테이블은 /supabase-secure-migration.sql 참고' AS optional;
