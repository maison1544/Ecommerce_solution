import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Shield, Truck } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { products } from "../data/products";
import { useAuth } from "../context/AuthContext";

export default function MainPage() {
  const { isLoggedIn } = useAuth();
  
  // 특가 상품 4개만 표시
  const featuredProducts = products.filter(p => p.category === "special-deals").slice(0, 4);

  return (
    <main>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#f5f5f5] to-[#e8e8e8] py-16 lg:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl lg:text-5xl font-bold tracking-wider uppercase mb-6">
              <span className="text-[#b78b1f]">SPECIAL DEALS</span>
              <br />
              최대 50% 할인
            </h1>
            <p className="text-base lg:text-xl text-gray-700 mb-8 font-bold">
              프리미엄 상품을 특별한 가격으로 만나보세요
            </p>
            <Link
              to="/category/special-deals"
              className="inline-flex items-center gap-2 bg-black text-white rounded-[10px] px-8 py-4 font-bold tracking-wider uppercase hover:bg-gray-800 transition-colors"
            >
              지금 쇼핑하기
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 lg:py-16 bg-white border-y">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
                <TrendingUp size={32} className="text-white" />
              </div>
              <h3 className="font-bold mb-2">최저가 보장</h3>
              <p className="text-sm text-gray-600">
                동일 상품 최저가를 보장합니다
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h3 className="font-bold mb-2">정품 보증</h3>
              <p className="text-sm text-gray-600">
                100% 정품만을 판매합니다
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
                <Truck size={32} className="text-white" />
              </div>
              <h3 className="font-bold mb-2">빠른 배송</h3>
              <p className="text-sm text-gray-600">
                당일 출고, 익일 도착 서비스
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl lg:text-3xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
              오늘의 특가
            </h2>
            <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
              놓치면 후회할 특별 할인 상품
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featuredProducts.map((product) => (
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

          <div className="text-center mt-8">
            <Link
              to="/category/special-deals"
              className="inline-flex items-center gap-2 bg-white border-2 border-black text-black rounded-[10px] px-8 py-3 font-bold tracking-wider uppercase hover:bg-black hover:text-white transition-colors"
            >
              모든 특가 상품 보기
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl lg:text-3xl text-black font-bold tracking-wider uppercase mb-2">
              카테고리
            </h2>
            <p className="text-sm lg:text-base text-gray-600 font-bold">
              다양한 카테고리의 상품을 만나보세요
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {[
              { name: "디지털/가전", path: "/category/digital" },
              { name: "패션", path: "/category/fashion" },
              { name: "식품", path: "/category/food" },
              { name: "뷰티", path: "/category/beauty" },
              { name: "생활용품", path: "/category/living" },
              { name: "출산/육아", path: "/category/baby" },
              { name: "스포츠", path: "/category/sports" },
              { name: "자동차용품", path: "/category/car" },
              { name: "도서", path: "/category/books" },
              { name: "완구/취미", path: "/category/toys" },
              { name: "문구/사무용품", path: "/category/office" },
              { name: "반려동물", path: "/category/pet" },
            ].map((category) => (
              <Link
                key={category.path}
                to={category.path}
                className="bg-white border-2 border-gray-200 rounded-lg p-6 text-center font-bold hover:border-[#b78b1f] hover:text-[#b78b1f] transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - 로그인하지 않은 사용자에게만 표시 */}
      {!isLoggedIn && (
        <section className="py-16 lg:py-20 bg-black text-white">
          <div className="container mx-auto px-4 lg:px-8 text-center">
            <h2 className="text-2xl lg:text-4xl font-bold tracking-wider uppercase mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-base lg:text-lg mb-8 text-gray-300">
              회원가입하고 첫 구매 시 10% 추가 할인 혜택을 받으세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 bg-[#b78b1f] text-white rounded-[10px] px-8 py-4 font-bold tracking-wider uppercase hover:bg-[#9a7319] transition-colors"
              >
                회원가입하기
              </Link>
              <Link
                to="/category/special-deals"
                className="inline-flex items-center justify-center gap-2 bg-white text-black rounded-[10px] px-8 py-4 font-bold tracking-wider uppercase hover:bg-gray-100 transition-colors"
              >
                특가 상품 보기
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}