export interface Review {
  id: number;
  productId: number;
  author: string;
  rating: number;
  date: string;
  content: string;
  likes: number;
  images: string[];
  reviewKey?: string; // Optional review key for KV Store
}

// 배포용 - 빈 배열로 시작
export const reviews: Review[] = [];

export function getReviewsByProductId(productId: number): Review[] {
  return reviews.filter(r => r.productId === productId);
}

export function getAverageRating(productId: number): number {
  const productReviews = getReviewsByProductId(productId);
  if (productReviews.length === 0) return 0; // 리뷰가 없으면 0 반환
  return productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;
}