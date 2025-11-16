export interface OrderItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  userId: number;
  date: string;
  status: "배송 준비 중" | "배송 중" | "배송 완료" | "취소";
  items: OrderItem[];
  totalAmount: number;
  trackingNumber?: string;
  shippingAddress: {
    recipient: string;
    phone: string;
    address: string;
    detailAddress: string;
    postalCode: string;
  };
}

// 배포용 - 빈 배열로 시작
export const orders: Order[] = [];

export function getOrdersByUserId(userId: number): Order[] {
  return orders.filter(o => o.userId === userId);
}

export function getOrderById(orderId: string): Order | undefined {
  return orders.find(o => o.id === orderId);
}

export function updateOrderStatus(orderId: string, status: Order["status"]): boolean {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    return true;
  }
  return false;
}
