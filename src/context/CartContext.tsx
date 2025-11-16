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

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const supabase = createClient();

  const refreshCart = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCartCount(0);
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
        const totalCount = data.cart?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
        setCartCount(totalCount);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error('Failed to refresh cart:', error);
      setCartCount(0);
    }
  }, [supabase]);

  const addToCart = useCallback(async (
    productId: number, 
    name: string, 
    price: number, 
    originalPrice: number | undefined, 
    image: string, 
    quantity: number = 1
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('User not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/api/cart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            productId,
            name,
            price,
            originalPrice,
            image,
            quantity
          })
        }
      );

      if (response.ok) {
        await refreshCart();
      } else {
        console.error('Failed to add to cart:', await response.text());
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  }, [supabase, refreshCart]);

  // 초기 로드 시 장바구니 개수 설정
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

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
