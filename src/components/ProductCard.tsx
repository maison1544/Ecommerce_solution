import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useCallback, memo, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ImageWithFallback } from "./common/ImageWithFallback";

const img1 =
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400";

// Cart Icon Component
const CartIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16.25 15.625H5.70313L3.75 3.125H18.125L16.25 15.625Z"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.70312 15.625L4.375 18.125H17.5"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 7.5V9.375"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.625 7.5V9.375"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.75 7.5V9.375"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface ProductCardProps {
  hasDiscount?: boolean;
  id?: number;
  name?: string;
  price?: number;
  originalPrice?: number;
  images?: string[];
  discount?: number;
  reviewCount?: number;
  rating?: number;
}

const ProductCardComponent = ({
  hasDiscount = false,
  id = 1,
  name = "Apple 아이폰 17 Pro 자급제 Apple",
  price = 1500000,
  originalPrice = 1750000,
  images,
  discount,
  reviewCount = 0,
}: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();

  // 이미지 URL - useMemo로 최적화
  const productImage = useMemo(() => {
    return images && images.length > 0 ? images[0] : img1;
  }, [images]);

  // 할인율 계산 - useMemo로 최적화
  const discountPercentage = useMemo(() => {
    if (discount) return discount;
    if (hasDiscount && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
    return 0;
  }, [discount, hasDiscount, originalPrice, price]);

  // 🔥 클릭 쓰로틀링용 ref
  const lastClickRef = useRef<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      // 🔥 쓰로틀링: 500ms 내 중복 클릭 방지
      const now = Date.now();
      if (now - lastClickRef.current < 500) {
        console.log("⏳ 쓰로틀링: 너무 빠른 클릭");
        return;
      }
      lastClickRef.current = now;

      if (!isLoggedIn) {
        toast.error("로그인이 필요합니다", {
          description: "로그인 페이지로 이동합니다.",
          duration: 2000,
        });
        setTimeout(() => {
          navigate("/login");
        }, 1000);
        return;
      }

      // 🔥 이미 추가 중이면 무시
      if (isAdding) return;
      setIsAdding(true);

      // 즉시 토스트 표시
      toast.success("장바구니에 추가되었습니다!", {
        description: "장바구니에서 확인하실 수 있습니다.",
        duration: 2000,
      });

      try {
        await addToCart(id, name, price, originalPrice, productImage, 1);
      } finally {
        setIsAdding(false);
      }
    },
    [
      isLoggedIn,
      navigate,
      addToCart,
      id,
      name,
      price,
      originalPrice,
      productImage,
      isAdding,
    ]
  );

  const handleProductClick = useCallback(() => {
    navigate(`/product/${id}`);
  }, [navigate, id]);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Product Image */}
      <div
        className="relative rounded-[10px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] bg-gradient-to-b from-white to-[#e8e7e7] aspect-[252/227] overflow-hidden cursor-pointer group"
        onClick={handleProductClick}
      >
        <ImageWithFallback
          alt={name}
          className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
          src={productImage}
          loading="lazy"
          decoding="async"
        />
        {/* Discount Badge - 좌측 상단 */}
        {hasDiscount && originalPrice > price && (
          <div className="absolute top-2 left-2 bg-red-500 text-white rounded px-2.5 py-1.5 flex items-center gap-1 shadow-lg">
            <span className="text-xs font-bold">
              {discountPercentage}% 할인
            </span>
          </div>
        )}
        {/* Review Icon - 우측 하단 */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white rounded-full px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg">
          <MessageCircle size={16} />
          <span className="text-xs font-bold">{reviewCount}</span>
        </div>
      </div>

      {/* Product Info */}
      <div
        className="bg-gradient-to-r from-[#efefef] to-[#e8e8e8] rounded-[10px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)] p-2 text-center cursor-pointer"
        onClick={handleProductClick}
      >
        <p className="text-xs lg:text-[13px] text-black font-['NanumSquareOTF_ac'] font-bold tracking-wider uppercase mb-1 line-clamp-2 h-[2.5em]">
          {name}
        </p>
        <div className="h-[2.5em] flex flex-col items-center justify-center">
          {hasDiscount ? (
            <>
              <p className="text-xs lg:text-[13px] text-[#ff3c3c] font-['NanumSquareOTF_ac'] font-bold line-through whitespace-nowrap leading-tight">
                {originalPrice.toLocaleString()}원
              </p>
              <p className="text-xs lg:text-[13px] text-black font-['NanumSquareOTF_ac'] font-bold whitespace-nowrap leading-tight">
                {price.toLocaleString()}원
              </p>
            </>
          ) : (
            <p className="text-xs lg:text-[13px] text-black font-['NanumSquareOTF_ac'] font-bold whitespace-nowrap">
              {price.toLocaleString()}원
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleProductClick}
          className="flex-1 flex items-center justify-center bg-black text-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-3 text-xs lg:text-[13px] font-['NanumSquareOTF_ac'] font-bold tracking-wider uppercase"
        >
          바로 구매하기
        </button>
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`bg-white border border-black rounded-full p-1.5 shadow-[0px_2px_2px_0px_rgba(0,0,0,0.3)] hover:bg-gray-50 transition-opacity ${
            isAdding ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isAdding ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <CartIcon />
          )}
        </button>
      </div>
    </div>
  );
};

// React.memo로 컴포넌트를 감싸서 최적화
export const ProductCard = memo(ProductCardComponent);
