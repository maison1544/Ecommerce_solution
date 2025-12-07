import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  TrendingUp,
  Star,
  Sparkles,
  Package,
} from "lucide-react";
import { products, getProductsByCategory, Product } from "../data/products";
import { categoryMap } from "../data/categories";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { ProductCard } from "../components/ProductCard";
import { API_BASE_URL } from "../utils/api";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, getAccessToken } = useAuth();
  const { addToCart } = useCart();
  const [allProducts, setAllProducts] = useState<Product[]>(products);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const API_BASE = `${API_BASE_URL}`;
        const response = await fetch(`${API_BASE}/api/products`);

        if (response.ok) {
          const data = await response.json();
          const apiProducts = data.products || [];
          // 로컬 상품과 API 상품 합치기
          const allProductsList = [...products, ...apiProducts];
          // 중복 제거
          const uniqueProducts = allProductsList.filter(
            (product, index, self) =>
              index === self.findIndex((p) => p.id === product.id)
          );
          setAllProducts(uniqueProducts);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };

    loadProducts();
  }, []);

  // 특가 상품만 가져오기 - useMemo로 최적화
  const specialDealsProducts = useMemo(() => {
    return allProducts.filter((p) => p.category === "special-deals");
  }, [allProducts]);

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
                reviewCount={product.reviewCount}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
