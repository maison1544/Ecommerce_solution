import { useState, useEffect, useMemo } from "react";
import { ProductCard } from "../components/ProductCard";
import { products, Product } from "../data/products";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export default function HomePage() {
  const [productList, setProductList] = useState<Product[]>(products);
  const [loading, setLoading] = useState(true);

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
        setProductList(data.products || products); // Fallback to local data
      } catch (error) {
        console.error('Failed to load products:', error);
        setProductList(products); // Fallback to local data
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // 특가 상품만 가져오기 - useMemo로 최적화
  const specialDealsProducts = useMemo(() => {
    return productList.filter(p => p.category === "special-deals");
  }, [productList]);

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
      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 xl:gap-8">
        {specialDealsProducts.map((product) => (
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
    </main>
  );
}
