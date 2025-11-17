import { projectId } from './supabase/info';

// ✅ Centralized API configuration
export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-94a0507e`;

// Helper function to build API URLs
export const getApiUrl = (path: string) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  signup: '/api/auth/signup',
  
  // Products
  products: '/api/products',
  productDetail: (id: string | number) => `/api/products/${id}`,
  
  // Cart
  cart: '/api/cart',
  cartItem: (id: string | number) => `/api/cart/${id}`,
  cartClear: '/api/cart/clear',
  
  // Orders
  orders: '/api/orders',
  orderStatus: (id: string | number) => `/api/orders/${id}/status`,
  
  // Addresses
  addresses: '/api/addresses',
  addressDetail: (id: string | number) => `/api/addresses/${id}`,
  
  // Inquiries
  inquiries: '/api/inquiries',
  myInquiries: '/api/inquiries/my',
  inquiryAnswer: (id: string | number) => `/api/inquiries/${id}/answer`,
  
  // Reviews
  reviews: (productId: string | number) => `/api/reviews/${productId}`,
  reviewHelpful: (id: string | number) => `/api/reviews/${id}/helpful`,
  reviewDelete: (id: string | number) => `/api/reviews/${id}`,
  saveReview: '/api/save-review',
  
  // Admin
  adminUsers: '/api/admin/users',
  adminAdmins: '/api/admin/admins',
  adminOrders: '/api/admin/orders',
  adminInquiries: '/api/admin/inquiries',
  userBlock: (userId: string) => `/api/admin/users/${userId}/block`,
  adminBlock: (adminId: string) => `/api/admin/admins/${adminId}/block`,
  createAdmin: '/api/create-admin',
  
  // Upload
  upload: '/api/upload',
  uploadImage: '/api/upload-image',
  
  // Health
  health: '/api/health',
  api: '/api',
};
