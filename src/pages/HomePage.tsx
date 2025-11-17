import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, TrendingUp, Star, Sparkles, Package } from "lucide-react";
import { products, getProductsByCategory, Product } from "../data/products";
import { categoryMap } from "../data/categories";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner@2.0.3";
import { useCart } from "../context/CartContext";
import { ProductCard } from "../components/ProductCard";

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser, getAccessToken } = useAuth();
  const { addToCart } = useCart();

  // 특가 상품만 가져오기 - useMemo로 최적화
  const specialDealsProducts = useMemo(() => {
    return products.filter(p => p.category === "special-deals");
  }, []);

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