import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, isApiConfigured } from "@/utils/api";

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
  const [pages, setPages] = useState<ProductsResponse[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isError, setIsError] = useState(false);

  const hasNextPage = pages.at(-1)?.pagination?.hasMore ?? false;

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      if (!enabled || !isApiConfigured) return;

      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsFetchingNextPage(true);
      }
      setIsError(false);

      try {
        const params = new URLSearchParams({
          page: String(pageToLoad),
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

        const data = (await response.json()) as ProductsResponse;
        setPages((prev) => (pageToLoad === 1 ? [data] : [...prev, data]));
        setPage(pageToLoad);
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [category, enabled, perPage, search, sortBy, sortOrder]
  );

  useEffect(() => {
    setPages([]);
    setPage(1);
    void loadPage(1);
  }, [loadPage]);

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void loadPage(page + 1);
  }, [hasNextPage, isFetchingNextPage, loadPage, page]);

  return useMemo(
    () => ({
      data: { pages },
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      isError,
    }),
    [fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading, pages]
  );
}

// 모든 페이지의 상품을 플랫하게 변환하는 유틸리티
export function flattenProducts(
  pages: ProductsResponse[] | undefined
): Product[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.products);
}
