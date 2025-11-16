import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ProductCard } from "../components/ProductCard";
import { getProductsByCategory, Product } from "../data/products";
import { projectId, publicAnonKey } from "../utils/supabase/info";

const categoryInfo: Record<string, { title: string; description: string }> = {
  'digital': { title: '디지털/가전', description: '최신 디지털 기기와 가전제품을 만나보세요' },
  'fashion': { title: '패션', description: '트렌디한 의류와 신발, 액세서리' },
  'food': { title: '식품', description: '신선하고 건강한 식품' },
  'beauty': { title: '뷰티', description: '프리미엄 뷰티 & 스킨케어' },
  'living': { title: '생활용품', description: '편리한 생활을 위한 필수 용품' },
  'baby': { title: '출산/육아', description: '아이를 위한 안전한 제품' },
  'sports': { title: '스포츠', description: '건강한 라이프스타일을 위한 운동용품' },
  'car': { title: '자동차용품', description: '안전하고 편리한 드라이빙' },
  'books': { title: '도서', description: '베스트셀러와 스테디셀러' },
  'toys': { title: '완구/취미', description: '재미있는 장난감과 취미용품' },
  'office': { title: '문구/사무용품', description: '업무 효율을 높이는 문구류' },
  'pet': { title: '반려동물', description: '반려동물을 위한 모든 것' },
  'special-deals': { title: '특가할인상품', description: '최대 50%까지 절찬 인 중인 상품을 만나보세요!' },
};

type SortType = "all" | "low-price" | "high-price";

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [sortType, setSortType] = useState<SortType>("all");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const info = categoryInfo[category || ''] || { title: '카테고리', description: '다양한 상품을 만나보세요' };

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/api/products`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load products');
        }

        const data = await response.json();
        setAllProducts(data.products || []); // Fallback to local data
      } catch (error) {
        console.error('Failed to load products:', error);
        setAllProducts(getProductsByCategory(category || '')); // Fallback to local data
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category]);

  // Get products for this category
  const categoryProducts = useMemo(() => {
    return allProducts.filter(p => p.category === category);
  }, [allProducts, category]);

  // Sort products - useMemo로 최적화
  const sortedProducts = useMemo(() => {
    return [...categoryProducts].sort((a, b) => {
      if (sortType === "low-price") {
        return a.price - b.price;
      } else if (sortType === "high-price") {
        return b.price - a.price;
      }
      return 0; // "all" - keep original order
    });
  }, [categoryProducts, sortType]);

  useEffect(() => {
    // Scroll to top when category changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [category]);

  if (loading) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600 font-bold">로딩 중...</p>
          </div>
        </div>
      </main>
    );
  }

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
          <p className="text-gray-500 font-bold text-lg">등록된 상품이 없습니다.</p>
        </div>
      ) : (
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
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
