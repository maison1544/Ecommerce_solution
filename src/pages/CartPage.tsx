import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Plus, Minus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { createClient } from "../utils/supabase/client";
import { projectId } from "../utils/supabase/info";

interface CartItem {
  id: number;
  userId: string;
  productId: number;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const { isLoggedIn, getAccessToken } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 장바구니 데이터 로드
  const loadCartItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/api/cart`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCartItems(data.cart || []);
      } else {
        console.error('Failed to load cart');
        setCartItems([]);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 로그인 체크 및 데이터 로드
  useEffect(() => {
    if (!isLoggedIn) {
      toast.error("로그인이 필요합니다");
      navigate("/login");
      return;
    }

    loadCartItems();
  }, [isLoggedIn, navigate]);

  const updateQuantity = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/api/cart/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCartItems(data.cart || []);
        await refreshCart();
        toast.success("수량이 변경되었습니다");
      } else {
        toast.error("수량 변경에 실패했습니다");
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error("수량 변경에 실패했습니다");
    }
  };

  const removeItem = async (id: number) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/api/cart/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCartItems(data.cart || []);
        await refreshCart();
        toast.success("상품이 장바구니에서 삭제되었습니다");
      } else {
        toast.error("상품 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast.error("상품 삭제에 실패했습니다");
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="text-center py-20">
          <p className="text-gray-500">장바구니를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 3000;
  const total = subtotal + shipping;

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
          장바구니
        </h1>
        <p className="text-sm lg:text-base text-gray-600">
          총 {cartItems.length}개의 상품이 담겨있습니다
        </p>
        <div className="h-px bg-black mt-5" />
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">장바구니가 비어있습니다</p>
          <Link
            to="/category/special-deals"
            className="inline-block bg-black text-white rounded-[10px] px-8 py-3 font-bold tracking-wider uppercase hover:bg-gray-800"
          >
            쇼핑 계속하기
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="bg-white border rounded-[10px] p-4 shadow-sm">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded bg-gradient-to-b from-white to-[#e8e7e7] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm lg:text-base line-clamp-2">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {item.originalPrice && (
                        <p className="text-xs text-[#ff3c3c] line-through">
                          {item.originalPrice.toLocaleString()}원
                        </p>
                      )}
                      <p className="font-bold">
                        {item.price.toLocaleString()}원
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border rounded-[10px] p-6 sticky top-[200px]">
              <h2 className="font-bold mb-4 uppercase tracking-wider">
                주문 요약
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">소계</span>
                  <span className="font-bold">{subtotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">배송비</span>
                  <span className="font-bold">{shipping.toLocaleString()}원</span>
                </div>
                <div className="h-px bg-gray-300" />
                <div className="flex justify-between">
                  <span className="font-bold">총 금액</span>
                  <span className="font-bold text-[#b78b1f]">
                    {total.toLocaleString()}원
                  </span>
                </div>
              </div>

              <button 
                onClick={() => navigate("/checkout", { state: { type: "cart" } })}
                className="w-full flex items-center justify-center bg-black text-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-4 font-bold tracking-wider uppercase hover:bg-gray-800 mb-3"
              >
                구매하기
              </button>

              <Link
                to="/category/special-deals"
                className="block text-center text-sm text-[#b78b1f] hover:underline"
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
