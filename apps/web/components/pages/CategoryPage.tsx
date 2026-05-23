import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { getProductsByCategory, type Product } from "@/data/products";
import { API_BASE_URL, isApiConfigured } from "@/utils/api";
import { useCategoryNavLabels } from "@/hooks/useCategoryNavLabels";

type SortType = "all" | "low-price" | "high-price";

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [sortType, setSortType] = useState<SortType>("all");
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const { resolveCategory } = useCategoryNavLabels();
  const navCategory = resolveCategory(category || "");
  const categoryKey = navCategory?.categoryKey || category || "";

  // 로컬 상품 (API 상품과 병합)
  const localProducts = useMemo(() => {
    return getProductsByCategory(categoryKey);
  }, [categoryKey]);

  // API 상품과 로컬 상품 병합
  const allProducts = useMemo(() => {
    const allProductsList = [...localProducts, ...apiProducts];
    return allProductsList.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );
  }, [apiProducts, localProducts]);

  // 정렬 적용
  const sortedProducts = useMemo(() => {
    return [...allProducts].sort((a, b) => {
      if (sortType === "low-price") {
        return a.price - b.price;
      } else if (sortType === "high-price") {
        return b.price - a.price;
      }
      return 0;
    });
  }, [allProducts, sortType]);

  const info = {
    title: navCategory?.label || "카테고리",
    description: navCategory?.description || "다양한 상품을 만나보세요",
  };

  // 카테고리 변경 시 스크롤 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [category]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!isApiConfigured || !categoryKey) {
        setApiProducts([]);
        return;
      }

      try {
        const params = new URLSearchParams({ category: categoryKey });
        const response = await fetch(`${API_BASE_URL}/api/products?${params}`);
        if (!response.ok) {
          setApiProducts([]);
          return;
        }

        const data = await response.json();
        setApiProducts(data.products || []);
      } catch {
        setApiProducts([]);
      }
    };

    loadProducts();
  }, [categoryKey]);

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      {/* Section Title */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
          {info.title}
        </h1>
        <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
          {info.description}
        </p>
        <div className="h-px bg-black mt-5" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap lg:flex-nowrap gap-4 items-center justify-between">
        <div className="overflow-x-auto scrollbar-hide w-full lg:w-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setSortType("all")}
              className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap ${
                sortType === "all"
                  ? "bg-black text-white"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setSortType("low-price")}
              className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap ${
                sortType === "low-price"
                  ? "bg-black text-white"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              낮은 가격순
            </button>
            <button
              onClick={() => setSortType("high-price")}
              className={`px-4 py-2 rounded text-sm font-bold whitespace-nowrap ${
                sortType === "high-price"
                  ? "bg-black text-white"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              높은 가격순
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 font-bold">
          총 {sortedProducts.length}개 상품
        </div>
      </div>

      {/* Product Grid */}
      {sortedProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 font-bold text-lg">
            등록된 상품이 없습니다.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 xl:gap-8">
            {sortedProducts.map((product) => (
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

          <div className="h-10 flex items-center justify-center mt-8" />
        </>
      )}
    </main>
  );
}
