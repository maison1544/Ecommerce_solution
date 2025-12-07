import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Product, products as localProducts } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { useDebounce } from "../utils/performance";
import { API_BASE_URL } from "../utils/api";

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 디바운싱된 검색어
  const debouncedSearch = useDebounce(searchQuery, 300);

  // 서버에서 검색 결과 로드
  useEffect(() => {
    const loadProducts = async () => {
      if (!debouncedSearch) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const API_BASE = `${API_BASE_URL}`;
        const params = new URLSearchParams({
          search: debouncedSearch,
        });
        const response = await fetch(`${API_BASE}/api/products?${params}`);

        if (response.ok) {
          const data = await response.json();
          const apiProducts = data.products || [];
          // 로컬 상품에서도 검색
          const localResults = localProducts.filter((p) =>
            p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
          );
          const allProductsList = [...localResults, ...apiProducts];
          const uniqueProducts = allProductsList.filter(
            (product, index, self) =>
              index === self.findIndex((p) => p.id === product.id)
          );
          setProducts(uniqueProducts);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        // 에러 시 로컬 상품에서만 검색
        const localResults = localProducts.filter((p) =>
          p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
        setProducts(localResults);
      }
      setIsLoading(false);
    };

    loadProducts();
  }, [debouncedSearch]);

  // 검색 결과
  const filteredProducts = products;

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
          검색 결과
        </h1>
        <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
          '{searchQuery}' 검색 결과 {filteredProducts.length}개
        </p>
        <div className="h-px bg-black mt-5" />
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">로딩 중입니다...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">검색 결과가 없습니다.</p>
          <Link to="/" className="text-[#b78b1f] font-bold hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="flex justify-center">
              <div className="w-full max-w-[263px]">
                <ProductCard
                  hasDiscount={product.hasDiscount}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  images={product.images}
                  discount={product.discount}
                  reviewCount={product.reviewCount}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
