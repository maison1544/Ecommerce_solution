/**
 * 100개 상품 데이터를 Supabase에 자동 업로드하는 스크립트
 * 
 * 실행 방법:
 * 1. 이 파일을 복사
 * 2. 브라우저 콘솔에서 실행
 * 3. 또는 별도 Node.js 스크립트로 실행
 */

import { createClient } from '../utils/supabase/client';
import { products } from '../data/products';

export async function uploadProducts() {
  const supabase = createClient();
  
  console.log(`🚀 Starting upload of ${products.length} products...`);
  
  // 기존 샘플 데이터 삭제 (ID 1-12)
  console.log('🗑️  Deleting sample products (1-12)...');
  await supabase.from('products').delete().lte('id', 12);
  
  // 상품 데이터 변환 (camelCase → snake_case)
  const productsToInsert = products.map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    original_price: product.originalPrice || null,
    category: product.category,
    has_discount: product.hasDiscount,
    images: product.images || ['figma:asset/cc454a1e63240300c7c08b5cb65efc7338466ddf.png'],
    rating: product.rating || null,
    review_count: product.reviewCount || 0,
    description: product.description || null,
    specs: product.specs || null,
    discount: product.discount || null,
  }));
  
  // 배치로 나눠서 업로드 (50개씩)
  const batchSize = 50;
  for (let i = 0; i < productsToInsert.length; i += batchSize) {
    const batch = productsToInsert.slice(i, i + batchSize);
    console.log(`📦 Uploading batch ${Math.floor(i / batchSize) + 1}...`);
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch);
    
    if (error) {
      console.error('❌ Error uploading batch:', error);
      return { success: false, error };
    }
  }
  
  console.log('✅ All products uploaded successfully!');
  
  // 확인
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Total products in database: ${count}`);
  
  return { success: true, count };
}

// 브라우저 콘솔용 글로벌 함수
if (typeof window !== 'undefined') {
  (window as any).uploadProducts = uploadProducts;
}
