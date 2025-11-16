import { useMemo, useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Product } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/api/products`,
          {
            headers: {
              "Authorization": `Bearer ${publicAnonKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // useMemo로 검색 결과 최적화
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

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
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}