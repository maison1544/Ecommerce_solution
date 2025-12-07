import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Star,
  MessageCircle,
  ThumbsUp,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/api";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { products } from "../data/products";

const img1 =
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400";

// Type definitions
interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  images?: string[];
  category: string;
  description?: string;
  hasDiscount?: boolean;
  discount?: number;
  rating?: number;
  reviewCount?: number;
  specs?: string[];
  isActive?: boolean;
}

interface Review {
  id: string; // reviewId format: ${Date.now()}_${userId}
  productId: number;
  userId: string; // 작성자 ID
  author: string;
  rating: number;
  date: string;
  content: string;
  likes: number;
  helpful?: number; // helpfulCount
  helpfulCount?: number;
  images?: string[];
  isHelpful?: boolean; // 현재 사용자가 도움이 돼요를 눌렀는지
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isLoggedIn, currentUser, getAccessToken } = useAuth();

  // ⚠️ ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [quantity, setQuantity] = useState(1);
  const [selectedTab, setSelectedTab] = useState<"details" | "reviews">(
    "details"
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    content: "",
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isHelpfulProcessing, setIsHelpfulProcessing] = useState<Set<string>>(
    new Set()
  );

  // 상품 데이터 API에서 가져오기
  useEffect(() => {
    const loadProduct = async () => {
      setIsLoadingProduct(true);
      try {
        // API에서 상품 로드
        const API_BASE = `${API_BASE_URL}`;
        const response = await fetch(`${API_BASE}/api/products`);

        let allProducts = products;
        if (response.ok) {
          const data = await response.json();
          const apiProducts = data.products || [];
          const allProductsList = [...products, ...apiProducts];
          const uniqueProducts = allProductsList.filter(
            (product, index, self) =>
              index === self.findIndex((p) => p.id === product.id)
          );
          allProducts = uniqueProducts;
        }

        const foundProduct = allProducts.find(
          (p: Product) => p.id === Number(id)
        );

        if (!foundProduct) {
          console.error("Product not found, redirecting to home");
          navigate("/");
          return;
        }

        setProduct(foundProduct);
      } catch (error) {
        console.error("Failed to load product:", error);
        // Fallback to local data
        const foundProduct = products.find((p: Product) => p.id === Number(id));
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          navigate("/");
        }
      }
      setIsLoadingProduct(false);
    };

    if (id) {
      loadProduct();
    }
  }, [id, navigate]);

  // 상품 ID가 변경되면 selectedImageIndex 초기화
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [id]);

  // Supabase에서 후기 로드
  useEffect(() => {
    const loadReviews = async () => {
      if (!id) return;

      setIsLoadingReviews(true);
      try {
        const token = await getAccessToken();
        if (!token) {
          setReviews([]);
          setIsLoadingReviews(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/reviews/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error("Failed to load reviews:", error);
        setReviews([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    if (isLoggedIn) {
      loadReviews();
    } else {
      setReviews([]);
      setIsLoadingReviews(false);
    }
  }, [id, isLoggedIn, getAccessToken]);

  // ⚠️ CONDITIONAL RETURNS MUST BE AFTER ALL HOOKS
  // 로딩 중이거나 상품이 없으면 null 반환
  if (isLoadingProduct) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b78b1f]"></div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">상품을 찾을 수 없습니다</p>
          <button
            onClick={() => navigate("/")}
            className="bg-black text-white px-6 py-2 rounded-lg font-bold"
          >
            홈으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const increaseQuantity = () => setQuantity((prev) => prev + 1);
  const decreaseQuantity = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
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

    addToCart(
      product.id,
      product.name,
      product.price,
      product.originalPrice,
      product.images && product.images.length > 0 ? product.images[0] : img1,
      quantity
    );
    toast.success(
      `${product.name}을(를) ${quantity}개 장바구니에 추가했습니다!`
    );
  };

  const handleBuyNow = () => {
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

    // 바로 구매 페이지로 이동
    navigate("/checkout", {
      state: {
        type: "direct",
        productId: product.id,
        quantity,
      },
    });
  };

  const totalPrice = product.price * quantity;
  const totalSavings =
    product.hasDiscount && product.originalPrice
      ? (product.originalPrice - product.price) * quantity
      : 0;

  // 기본값 설정
  const productImages = product.images || [img1, img1, img1];
  const productRating = product.rating || 4.5;
  const productReviewCount = product.reviewCount || 128;
  const productDescription =
    product.description ||
    `${product.name}은(는) 최고의 품질과 성능을 자랑하는 프리미엄 제품입니다. 합리적인 가격으로 만나보세요.`;
  const productSpecs = product.specs || [
    "정품 인증 완료",
    "1년 무상 품질 보증",
    "전국 무료 배송",
    "구매 후 7일 이내 무료 반품 가능",
  ];
  const productDiscount =
    product.hasDiscount && product.originalPrice
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100
        )
      : 0;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  // 리뷰수는 실제 reviews 배열의 length를 사용
  const actualReviewCount = reviews.length;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    // 중복 클릭 방지
    if (isSubmittingReview) {
      toast.info("후기 등록 중입니다...");
      return;
    }

    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      return;
    }

    // 리뷰 내용 유효성 검증
    const trimmedContent = newReview.content.trim();
    if (!trimmedContent) {
      toast.error("후기 내용을 입력해주세요");
      return;
    }

    if (trimmedContent.length < 10) {
      toast.error("리뷰 내용은 최소 10자 이상이어야 합니다");
      return;
    }

    if (trimmedContent.length > 1000) {
      toast.error("리뷰 내용은 최대 1000자까지 가능합니다");
      return;
    }

    setIsSubmittingReview(true);

    try {
      // 사용자 토큰 가져오기
      const token = await getAccessToken();
      if (!token) {
        toast.error("로그인이 필요합니다");
        setIsSubmittingReview(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/save-review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product?.id,
          rating: newReview.rating,
          content: newReview.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save review");
      }

      const data = await response.json();

      // 새 리뷰를 목록에 추가
      const newReviewItem: Review = {
        id: data.review.id, // API에서 반환한 reviewId 사용
        productId: data.review.productId,
        userId: data.review.userId || currentUser?.id || "",
        author: data.review.author,
        rating: data.review.rating,
        date: data.review.date,
        content: data.review.content,
        likes: data.review.likes || 0,
        helpful: data.review.helpfulCount || 0,
        helpfulCount: data.review.helpfulCount || 0,
        images: data.review.images || [],
      };

      setReviews([newReviewItem, ...reviews]);
      setNewReview({ rating: 5, content: "" });
      toast.success("후기가 등록되었습니다!");

      // 1.5초 후 버튼 재활성화
      setTimeout(() => {
        setIsSubmittingReview(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to save review:", error);
      const errorMessage =
        error instanceof Error ? error.message : "리뷰 등록에 실패했습니다";
      toast.error(errorMessage);
      setIsSubmittingReview(false); // ✅ 에러 시에도 상태 초기화
    }
  };

  const handleHelpfulClick = async (review: Review) => {
    // 로그인 확인
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      return;
    }

    // 이미 처리 중이면 무시
    if (isHelpfulProcessing.has(review.id)) {
      return;
    }

    // 처리 중 상태로 설정
    setIsHelpfulProcessing((prev) => new Set(prev).add(review.id));

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        setIsHelpfulProcessing((prev) => {
          const next = new Set(prev);
          next.delete(review.id);
          return next;
        });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/reviews/${review.id}/helpful`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ helpful: true }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to like review");
      }

      const data = await response.json();

      // Update local state with new review data
      if (data.review) {
        setReviews((prevReviews) =>
          prevReviews.map((r) =>
            r.id === review.id
              ? {
                  ...r,
                  likes:
                    data.review?.helpfulCount ??
                    data.review?.likes ??
                    r.likes ??
                    0,
                  helpful:
                    data.review?.helpfulCount ??
                    data.review?.helpful ??
                    r.helpful ??
                    0,
                  helpfulCount: data.review?.helpfulCount ?? 0,
                  isHelpful: data.isHelpful ?? !r.isHelpful,
                }
              : r
          )
        );
      } else {
        // review가 없어도 isHelpful 상태는 업데이트
        setReviews((prevReviews) =>
          prevReviews.map((r) =>
            r.id === review.id
              ? {
                  ...r,
                  isHelpful: data.isHelpful ?? !r.isHelpful,
                  likes: data.isHelpful
                    ? (r.likes ?? 0) + 1
                    : Math.max((r.likes ?? 0) - 1, 0),
                }
              : r
          )
        );
      }

      // 토글 상태에 따라 메시지 표시
      if (data.isHelpful) {
        toast.success("도움이 돼요!");
      } else {
        toast.info("도움이 돼요를 취소했습니다");
      }
    } catch (error) {
      console.error("Failed to mark as helpful:", error);
      const errorMessage =
        error instanceof Error ? error.message : "도움돼요 표시에 실패했습니다";
      toast.error(errorMessage);
    } finally {
      // 처리 완료 후 상태 제거
      setIsHelpfulProcessing((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("리뷰를 삭제하시겠습니까?")) return;

    if (!reviewId) {
      toast.error("리뷰 ID가 없습니다");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete review");
      }

      // Remove review from local state
      setReviews(reviews.filter((review) => review.id !== reviewId));
      toast.success("후기가 삭제되었습니다");
    } catch (error) {
      console.error("Delete review error:", error);
      toast.error(
        `후기 삭제 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
    }
  };

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-600 mb-6">
        <button onClick={() => navigate("/")} className="hover:text-black">
          홈
        </button>
        <span className="mx-2">/</span>
        <span className="text-black font-bold">상품 상세</span>
      </div>

      {/* Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div>
          {/* Main Image */}
          <div
            className="relative rounded-lg shadow-lg bg-gradient-to-b from-white to-[#e8e7e7] aspect-square mb-4 overflow-hidden cursor-pointer"
            onClick={() => setSelectedImageIndex(0)}
          >
            {product.hasDiscount && product.originalPrice > product.price && (
              <div className="absolute top-4 left-4 bg-red-500 text-white rounded px-3 py-2 flex items-center gap-1 shadow-lg z-10">
                <span className="font-bold">
                  {Math.round(
                    ((product.originalPrice - product.price) /
                      product.originalPrice) *
                      100
                  )}
                  % 할인
                </span>
              </div>
            )}
            <ImageWithFallback
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
              src={productImages[selectedImageIndex]}
            />
          </div>

          {/* All Thumbnail Images (모든 이미지 표시) */}
          {productImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {productImages.slice(0, 4).map((img, index) => (
                <div
                  key={index}
                  className={`relative rounded-lg shadow bg-gradient-to-b from-white to-[#e8e7e7] aspect-square overflow-hidden cursor-pointer hover:opacity-80 transition-all ${
                    selectedImageIndex === index ? "ring-4 ring-[#b78b1f]" : ""
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <ImageWithFallback
                    alt={`Product ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    src={img}
                  />
                  {selectedImageIndex === index && (
                    <div className="absolute inset-0 bg-black bg-opacity-10" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-4">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={
                    star <= averageRating
                      ? "fill-[#b78b1f] text-[#b78b1f]"
                      : "fill-gray-300 text-gray-300"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {averageRating.toFixed(1)} ({actualReviewCount} 리뷰)
            </span>
          </div>

          {/* Price */}
          <div className="mb-6">
            {(product.originalPrice ?? 0) > (product.price ?? 0) && (
              <p className="text-lg text-gray-400 line-through mb-1">
                {(product.originalPrice ?? 0).toLocaleString()}원
              </p>
            )}
            <p className="text-3xl font-bold text-black">
              {(product.price ?? 0).toLocaleString()}
            </p>
          </div>

          {/* Description */}
          <p className="text-gray-700 mb-6 leading-relaxed">
            {productDescription}
          </p>

          {/* Specs */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold mb-3">주요 사양</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {productSpecs.map((spec, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-[#b78b1f] mr-2">•</span>
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4 mb-6">
            <span className="font-bold">수량:</span>
            <div className="flex items-center border border-gray-300 rounded">
              <button
                onClick={decreaseQuantity}
                className="p-2 hover:bg-gray-100"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold">{quantity}</span>
              <button
                onClick={increaseQuantity}
                className="p-2 hover:bg-gray-100"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-white border-2 border-black text-black rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-4 font-bold tracking-wider uppercase hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} />
              장바구니 담기
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center bg-black text-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-4 font-bold tracking-wider uppercase hover:bg-gray-800"
            >
              바로 구매하기
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setSelectedTab("details")}
            className={`pb-4 font-bold transition-colors ${
              selectedTab === "details"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            상세 정보
          </button>
          <button
            onClick={() => setSelectedTab("reviews")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 ${
              selectedTab === "reviews"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <MessageCircle size={18} />
            상품 후기 ({reviews.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === "details" ? (
        <div className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-xl font-bold mb-4">상세 정보</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            {productDescription}
          </p>
          <div className="space-y-4">
            <h3 className="font-bold">제품 사양</h3>
            <ul className="space-y-2 text-gray-700">
              {productSpecs.map((spec, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-[#b78b1f] mr-2">•</span>
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          {/* Review Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#b78b1f] mb-1">
                    {averageRating.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= averageRating
                            ? "fill-[#b78b1f] text-[#b78b1f]"
                            : "fill-gray-300 text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-600">
                    {reviews.length}개의 후기
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                구매하신 고객님들의 실제 후기입니다
              </div>
            </div>
          </div>

          {/* Write Review Form - Only show when logged in */}
          {isLoggedIn && (
            <div className="bg-white border rounded-lg p-6 mb-8">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MessageCircle size={20} />
                후기 작성하기
              </h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">별점</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setNewReview({ ...newReview, rating: star })
                        }
                        className="p-1"
                      >
                        <Star
                          size={28}
                          className={
                            star <= newReview.rating
                              ? "fill-[#b78b1f] text-[#b78b1f]"
                              : "fill-gray-300 text-gray-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="review-content"
                    className="block text-sm font-bold mb-2"
                  >
                    후기 내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="review-content"
                    value={newReview.content}
                    onChange={(e) =>
                      setNewReview({ ...newReview, content: e.target.value })
                    }
                    className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black min-h-[120px]"
                    placeholder="상품에 대한 후기를 작성해주세요"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-black text-white rounded px-6 py-3 font-bold hover:bg-gray-800"
                >
                  후기 등록
                </button>
              </form>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            <h3 className="font-bold">전체 후기 ({reviews.length})</h3>
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold">{review.author}</span>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={
                              star <= review.rating
                                ? "fill-[#b78b1f] text-[#b78b1f]"
                                : "fill-gray-300 text-gray-300"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{review.date}</p>
                  </div>
                  {currentUser && review.userId === currentUser.id && (
                    <div>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#b78b1f]"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {review.content}
                </p>

                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {review.images.map((img, index) => (
                      <div
                        key={index}
                        className="w-20 h-20 bg-gray-100 rounded overflow-hidden"
                      >
                        <img
                          src={img}
                          alt={`Review ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleHelpfulClick(review)}
                  className={`flex items-center gap-1 text-sm ${
                    review.isHelpful
                      ? "text-[#b78b1f] font-semibold"
                      : "text-gray-600 hover:text-[#b78b1f]"
                  }`}
                  disabled={isHelpfulProcessing.has(review.id)}
                >
                  <ThumbsUp
                    size={14}
                    fill={review.isHelpful ? "#b78b1f" : "none"}
                  />
                  도움이 돼요 ({review.helpfulCount || review.likes || 0})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
