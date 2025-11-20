import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { createClient } from "../utils/supabase/client";
import { projectId } from "../utils/supabase/info";

interface CartContextType {
  cartCount: number;
  addToCart: (productId: number, name: string, price: number, originalPrice: number | undefined, image: string, quantity?: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  setCartCount: (count: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ✅ Edge Function 이름 설정
// 실제 함수 slug는 'make-server-94a0507e'입니다
// (Dashboard의 "Name"이 아닌 "Slug"가 실제 URL에 사용됨)
const EDGE_FUNCTION_NAME = 'make-server-94a0507e'; // 👈 실제 함수 slug

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      // Lazy create client only when needed
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setCartCount(0);
        return;
      }
      
      if (!session) {
        setCartCount(0);
        return;
      }

      console.log('🛒 Refreshing cart...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}/api/cart`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const totalCount = data.cart?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
        setCartCount(totalCount);
        console.log('✅ Cart loaded, count:', totalCount);
      } else {
        console.error('❌ Failed to load cart:', response.status, await response.text());
        setCartCount(0);
      }
    } catch (error) {
      console.error('❌ Failed to refresh cart:', error);
      setCartCount(0);
    }
  }, []);

  const addToCart = useCallback(async (
    productId: number, 
    name: string, 
    price: number, 
    originalPrice: number | undefined, 
    image: string, 
    quantity: number = 1
  ) => {
    try {
      // Lazy create client only when needed
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }
      
      if (!session) {
        console.error('User not authenticated');
        return;
      }

      console.log('🛒 Adding to cart...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${EDGE_FUNCTION_NAME}/api/cart`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cart: [
              {
                productId,
                name,
                price,
                originalPrice,
                image,
                quantity
              }
            ]
          })
        }
      );

      if (response.ok) {
        await refreshCart();
        console.log('✅ Added to cart successfully');
      } else {
        console.error('❌ Failed to add to cart:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  }, [refreshCart]);

  // 초기 로드 시 장바구니 개수 설정 - DISABLED to prevent fetch errors
  // Cart will only load when user explicitly logs in or adds items
  useEffect(() => {
    // Don't automatically load cart to avoid failed fetch errors
    // Cart count will be 0 until user logs in and performs an action
    setCartCount(0);
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, addToCart, refreshCart, setCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
