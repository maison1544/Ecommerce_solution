/**
 * 기존 products.ts의 상품 데이터를 Supabase DB로 마이그레이션하는 스크립트
 * 
 * 사용법:
 * 1. 새 Supabase 프로젝트의 정보를 /utils/supabase/info.tsx에 설정
 * 2. 관리자 계정으로 로그인하여 access_token 획득
 * 3. 아래 ACCESS_TOKEN 상수에 토큰 입력
 * 4. 터미널에서 실행: npx tsx scripts/migrate-products-to-db.ts
 */

import { products } from '../data/products';

// ⚠️ 여기에 관리자 access_token을 입력하세요
const ACCESS_TOKEN = 'YOUR_ADMIN_ACCESS_TOKEN_HERE';

// ⚠️ 여기에 프로젝트 ID를 입력하세요
const PROJECT_ID = 'YOUR_PROJECT_ID_HERE';

async function migrateProducts() {
  console.log('🚀 상품 데이터 마이그레이션 시작...');
  console.log(`📦 총 ${products.length}개의 상품을 마이그레이션합니다.`);

  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    try {
      const response = await fetch(
        `https://${PROJECT_ID}.supabase.co/functions/v1/api/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(product)
        }
      );

      if (response.ok) {
        successCount++;
        console.log(`✅ [${successCount}/${products.length}] ${product.name} 추가 성공`);
      } else {
        failCount++;
        const error = await response.json();
        console.error(`❌ [${failCount}] ${product.name} 추가 실패:`, error);
      }
    } catch (error) {
      failCount++;
      console.error(`❌ [${failCount}] ${product.name} 추가 실패:`, error);
    }

    // API Rate Limiting 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 마이그레이션 완료!');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
}

// 실행
migrateProducts().catch(console.error);
