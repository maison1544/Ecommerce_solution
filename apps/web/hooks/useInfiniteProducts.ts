import { useInfiniteQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/utils/api";

const API_BASE = `${API_BASE_URL}`;

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  discount?: number;
  category: string;
  description?: string;
  images: string[];
  specs?: string[];
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
}

interface ProductsResponse {
  products: Product[];
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface UseInfiniteProductsOptions {
  category?: string;
  search?: string;
  sortBy?: "created_at" | "price" | "rating";
  sortOrder?: "asc" | "desc";
  perPage?: number;
  enabled?: boolean;
}

export function useInfiniteProducts({
  category = "",
  search = "",
  sortBy = "created_at",
  sortOrder = "desc",
  perPage = 20,
  enabled = true,
}: UseInfiniteProductsOptions = {}) {
  return useInfiniteQuery<ProductsResponse>({
    queryKey: ["products", category, search, sortBy, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        perPage: String(perPage),
        ...(category && { category }),
        ...(search && { search }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`${API_BASE}/api/products?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      return lastPage.pagination.page + 1;
    },
    staleTime: 5 * 60 * 1000, // 5분
    enabled,
  });
}

// 모든 페이지의 상품을 플랫하게 변환하는 유틸리티
export function flattenProducts(
  pages: ProductsResponse[] | undefined
): Product[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.products);
}
