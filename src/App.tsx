import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { CartProvider, useCart } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { flushPendingUpdates } from "./data/cart";
import {
  Header,
  Navigation,
  Footer,
  MobileBottomNav,
} from "./components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { Toaster } from "sonner";
import { AdminNotification } from "./components/AdminNotification";

// Lazy load pages for better performance
const MainPage = lazy(() => import("./pages/MainPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CustomerServicePage = lazy(() => import("./pages/CustomerServicePage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const AddressesPage = lazy(() => import("./pages/AddressesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const DeliveryPage = lazy(() => import("./pages/DeliveryPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderCompletePage = lazy(() => import("./pages/OrderCompletePage"));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
        <p className="mt-4 text-gray-600 font-bold">로딩 중...</p>
      </div>
    </div>
  );
}

// 🔥 페이지 이동 감지 → 대기 중인 장바구니 업데이트 즉시 플러시
function NavigationFlush() {
  const location = useLocation();
  const { refreshCart } = useCart();

  useEffect(() => {
    // 페이지 이동할 때마다 대기 중인 장바구니 업데이트 즉시 실행
    console.log("🔄 페이지 이동 감지 - 장바구니 플러시");
    flushPendingUpdates();

    // 장바구니 페이지 진입 시 서버에서 최신 데이터 동기화
    if (location.pathname === "/cart" || location.pathname === "/checkout") {
      refreshCart();
    }
  }, [location.pathname, refreshCart]);

  return null;
}

export default function App() {
  // Suppress all unhandled promise rejections and fetch errors globally
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress "Failed to fetch" and Auth errors silently
      if (
        event.reason?.message?.includes("Failed to fetch") ||
        event.reason?.message?.includes("AuthRetryableFetchError")
      ) {
        event.preventDefault();
        // Don't log to console to keep it clean
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <NavigationFlush /> {/* 🔥 페이지 이동 시 장바구니 자동 플러시 */}
          <ScrollToTop />
          <div className="bg-white min-h-screen pb-16 lg:pb-0">
            {/* Sticky Header + Navigation Container */}
            <div className="sticky top-0 z-50 bg-white">
              <Header />
              <Navigation />
            </div>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/category/:category" element={<CategoryPage />} />
                <Route
                  path="/customer-service"
                  element={<CustomerServicePage />}
                />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/addresses" element={<AddressesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/guide" element={<GuidePage />} />
                <Route path="/delivery" element={<DeliveryPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-complete" element={<OrderCompletePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Footer />
            <MobileBottomNav />
            <Toaster position="top-center" richColors />
            {/* 관리자 알림 시스템 - 모든 페이지에서 작동 */}
            <AdminNotification />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
