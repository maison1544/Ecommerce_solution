export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  hasDiscount: boolean;
  images?: string[]; // 최대 4개의 이미지 URL
  rating?: number;
  reviewCount?: number;
  description?: string;
  specs?: string[];
  discount?: number;
}

// 배포용 - 빈 배열로 시작 (관리자가 직접 상품을 추가해야 함)
export const products: Product[] = [];

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category);
}

export function getProductById(id: number): Product | undefined {
  return products.find(p => p.id === id);
}
