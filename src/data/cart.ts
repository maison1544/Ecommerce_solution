export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
}

// 배포용 - 빈 배열로 시작
export const cartItems: CartItem[] = [];

export function getCartItemsByUserId(userId: number): CartItem[] {
  return cartItems.filter(item => item.userId === userId);
}

export function addCartItem(userId: number, productId: number, name: string, price: number, originalPrice: number | undefined, image: string): CartItem {
  console.log("🔧 addCartItem 함수 호출:", { userId, productId, name });
  
  const existingItem = cartItems.find(item => item.userId === userId && item.productId === productId);
  
  if (existingItem) {
    console.log("  ✓ 기존 아이템 발견, 수량 증가:", existingItem);
    existingItem.quantity += 1;
    console.log("  ✓ 업데이트된 수량:", existingItem.quantity);
    return existingItem;
  }
  
  const newItem: CartItem = {
    id: Math.max(...cartItems.map(i => i.id), 0) + 1,
    userId,
    productId,
    name,
    price,
    originalPrice,
    quantity: 1,
    image
  };
  
  console.log("  ✓ 새 아이템 생성:", newItem);
  cartItems.push(newItem);
  console.log("  ✓ cartItems 배열에 추가 완료. 총 아이템 수:", cartItems.length);
  
  return newItem;
}

export function updateCartItemQuantity(itemId: number, quantity: number): boolean {
  const item = cartItems.find(i => i.id === itemId);
  if (item) {
    item.quantity = quantity;
    return true;
  }
  return false;
}

export function removeCartItem(itemId: number): boolean {
  const index = cartItems.findIndex(i => i.id === itemId);
  if (index !== -1) {
    cartItems.splice(index, 1);
    return true;
  }
  return false;
}
