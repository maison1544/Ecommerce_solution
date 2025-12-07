import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Header from "./components/Header";
import Footer from "./components/Footer";

// 로딩 컴포넌트
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
  </div>
);

// 코드 스플리팅으로 각 페이지를 별도 번들로 분리
const MainPage = lazy(() => import("./pages/MainPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderCompletePage = lazy(() => import("./pages/OrderCompletePage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const AddressesPage = lazy(() => import("./pages/AddressesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const CustomerServicePage = lazy(() => import("./pages/CustomerServicePage"));

// 프리페치 함수 - 사용자가 링크에 호버할 때 미리 로드
export const prefetchPage = (pageName: string) => {
  switch (pageName) {
    case "cart":
      import("./pages/CartPage");
      break;
    case "checkout":
      import("./pages/CheckoutPage");
      break;
    case "account":
      import("./pages/AccountPage");
      break;
    case "admin":
      import("./pages/AdminPage");
      break;
    default:
      break;
  }
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-white flex flex-col">
            <Header />
            <div className="flex-1">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route
                    path="/category/:category"
                    element={<CategoryPage />}
                  />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route
                    path="/order-complete"
                    element={<OrderCompletePage />}
                  />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/addresses" element={<AddressesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route
                    path="/customer-service"
                    element={<CustomerServicePage />}
                  />
                </Routes>
              </Suspense>
            </div>
            <Footer />
            <Toaster
              position="top-center"
              richColors
              duration={3000}
              toastOptions={{
                style: {
                  background: "white",
                  color: "black",
                  border: "1px solid #e5e5e5",
                },
              }}
            />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
