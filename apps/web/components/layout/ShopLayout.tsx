"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Search,
  Shield,
  ShoppingBag,
  User,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { categoryList } from "@/data/categories";
import { useCategoryNavLabels } from "@/hooks/useCategoryNavLabels";

function createMenuItems(labels: Array<{ slug: string; label: string; categoryKey?: string }>) {
  return [
    ...labels.map((category) => ({
      label: category.label,
      path: `/category/${category.slug}`,
      highlight: category.categoryKey === "special-deals",
    })),
    { label: "고객센터", path: "/customer-service", highlight: false },
  ];
}

const fallbackMenuItems = [
  ...categoryList.map((category, index) => ({
    label: category.value === "special-deals" ? "특가할인상품" : category.label,
    path: `/category/${index + 1}`,
    highlight: category.value === "special-deals",
  })),
  { label: "고객센터", path: "/customer-service", highlight: false },
];

function Logo() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-2xl lg:text-4xl font-bold tracking-tight">
        <span className="text-black">Solution</span>
        <span className="text-[#b78b1f]"> Studio</span>
      </div>
      <div className="text-[8px] lg:text-[10px] tracking-[0.3em] text-gray-600 mt-0.5 lg:mt-1 uppercase">
        Premium Shopping
      </div>
    </div>
  );
}

function Header() {
  const router = useRouter();
  const { cartCount } = useCart();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();

    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header className="bg-white border-b border-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:items-center gap-4 py-4 lg:py-6">
          <div className="order-2 lg:order-1">
            <form
              onSubmit={handleSearch}
              className="bg-[#eeeeee] rounded border border-[#eeeeee] flex items-center h-11 px-1"
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="상품명을 입력하세요!"
                className="flex-1 bg-transparent px-3 text-sm text-[#616161] outline-none"
              />
              <button
                type="submit"
                className="p-2 min-w-11 flex items-center justify-center"
                aria-label="검색"
              >
                <Search className="size-6 text-black" />
              </button>
            </form>
          </div>

          <Link href="/" className="order-1 lg:order-2 flex justify-center">
            <Logo />
          </Link>

          <div className="hidden lg:flex order-3 items-center gap-4 justify-end">
            {currentUser?.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="p-2 hover:bg-gray-800 rounded flex items-center gap-2 bg-black text-white px-3"
                title="관리자 대시보드"
              >
                <Shield size={18} />
                <span className="text-sm font-bold">관리자</span>
              </button>
            )}
            <button
              onClick={() => router.push("/account")}
              className="p-2 hover:bg-gray-100 rounded"
              aria-label="내 계정"
            >
              <User className="size-6 text-black" />
            </button>
            <button
              onClick={() => router.push("/cart")}
              className="p-2 hover:bg-gray-100 rounded relative"
              aria-label="장바구니"
            >
              <ShoppingBag className="size-6 text-black" />
              <span className="absolute top-1 right-1 bg-white text-black text-[10px] font-bold px-1 rounded-full">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const { labels, reload } = useCategoryNavLabels();
  const menuItems = labels.length > 0 ? createMenuItems(labels) : fallbackMenuItems;

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY < 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleUpdated = () => {
      void reload();
    };

    window.addEventListener("ecommerce-category-nav-labels-updated", handleUpdated);
    return () => window.removeEventListener("ecommerce-category-nav-labels-updated", handleUpdated);
  }, [reload]);

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="hidden lg:block overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 lg:gap-4 min-w-max lg:justify-center py-2.5">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-2 py-1 text-sm lg:text-[14px] tracking-wider uppercase whitespace-nowrap flex-shrink-0 ${
                  item.highlight
                    ? "text-[#b78b1f] font-bold"
                    : "text-black font-bold hover:text-[#b78b1f]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <div
            className="overflow-x-auto overflow-y-hidden"
            style={
              isAtTop
                ? { scrollbarWidth: "thin", scrollbarColor: "#d1d5db #f3f4f6" }
                : { scrollbarWidth: "none" }
            }
          >
            <div className="flex items-center gap-2 min-w-max py-2.5 px-2">
              {menuItems.slice(0, 6).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-1 text-sm tracking-wider uppercase whitespace-nowrap ${
                    item.highlight
                      ? "text-[#b78b1f] font-bold"
                      : "text-black font-bold hover:text-[#b78b1f]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full flex items-center justify-center gap-2 py-2 border-t border-gray-200 text-sm font-bold text-black"
          >
            전체 카테고리 보기
            {isMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isMenuOpen && (
            <div className="border-t border-gray-200 py-2 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 px-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-2 py-1.5 text-xs tracking-wider uppercase text-center rounded hover:bg-gray-100 whitespace-nowrap ${
                      item.highlight ? "text-[#b78b1f] font-bold" : "text-black font-bold"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function FooterCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 p-3 hover:bg-gray-900 rounded">
      {icon}
      <div>
        <h3 className="text-xs font-bold mb-1">{title}</h3>
        <p className="text-[11px] text-gray-300">{description}</p>
      </div>
    </Link>
  );
}

function Footer() {
  const { isLoggedIn } = useAuth();
  const { labels } = useCategoryNavLabels();
  const footerCategories = labels.length > 0 ? labels : categoryList.map((category, index) => ({
    slug: String(index + 1),
    label: category.value === "special-deals" ? "특가할인상품" : category.label,
  }));

  return (
    <footer className="bg-black text-white border-t border-[#333333]">
      {!isLoggedIn && (
        <div className="border-b border-[#333333]">
          <div className="container mx-auto px-4 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <FooterCard
                href="/login"
                icon={<User className="size-6 shrink-0 text-white" />}
                title="내 계정"
                description="계정 로그인 바로가기"
              />
              <FooterCard
                href="/customer-service"
                icon={<MessageCircle className="size-6 shrink-0 text-white" />}
                title="고객센터"
                description="24시간 고객센터 바로가기"
              />
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-[#333333]">
        <div className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div>
              <h3 className="text-xs font-bold mb-4">상품 카테고리</h3>
              <ul className="space-y-2 text-xs text-gray-300">
                {footerCategories.map((category) => (
                  <li key={category.slug}>
                    <Link href={`/category/${category.slug}`} className="hover:text-white">
                      {category.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold mb-4">About</h3>
              <ul className="space-y-2 text-xs text-gray-300">
                <li>
                  <Link href="/terms" className="hover:text-white">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link href="/guide" className="hover:text-white">
                    이용안내
                  </Link>
                </li>
                <li>
                  <Link href="/customer-service" className="hover:text-white">
                    고객센터
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold mb-4">Company</h3>
              <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
                <p>법인명(상호) : 솔루션 스튜디오</p>
                <p>대표자(성명) : 솔루션 스튜디오</p>
                <p>전화 : 010-9999-9999</p>
                <p>주소 : 서울특별시 은평구 35678</p>
                <p>사업자 등록번호 안내 : 999-99-99999</p>
                <p>통신판매업 신고 : 제2025-서울은평-9999호</p>
                <p>
                  개인정보보호책임 : 솔루션 스튜디오{" "}
                  <a href="mailto:solution@gmail.com" className="underline hover:text-white">
                    (solution@gmail.com)
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MobileBottomNav() {
  const router = useRouter();
  const { cartCount } = useCart();
  const { currentUser } = useAuth();
  const { resolveCategory } = useCategoryNavLabels();
  const specialDealsSlug = resolveCategory("special-deals")?.slug || "13";

  const handleSpecialDeals = () => {
    router.push(`/category/${specialDealsSlug}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div
        className={`grid ${
          currentUser?.role === "admin" ? "grid-cols-4" : "grid-cols-3"
        } gap-1 p-2`}
      >
        {currentUser?.role === "admin" && (
          <button onClick={() => router.push("/admin")} className="flex flex-col items-center gap-1 p-2">
            <Shield size={20} className="text-black" />
            <span className="text-[10px]">관리자</span>
          </button>
        )}
        <button onClick={handleSpecialDeals} className="flex flex-col items-center gap-1 p-2">
          <Heart className="size-6 text-black" />
          <span className="text-[10px]">특가할인</span>
        </button>
        <button onClick={() => router.push("/account")} className="flex flex-col items-center gap-1 p-2">
          <User className="size-6 text-black" />
          <span className="text-[10px]">계정</span>
        </button>
        <button
          onClick={() => router.push("/cart")}
          className="flex flex-col items-center gap-1 p-2 relative"
        >
          <ShoppingBag className="size-6 text-black" />
          <span className="text-[10px]">장바구니</span>
          <span className="absolute top-1 right-1 bg-black text-white text-[8px] font-bold px-1 rounded-full">
            {cartCount}
          </span>
        </button>
      </div>
    </div>
  );
}

export function ShopLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="bg-white min-h-screen pb-16 lg:pb-0">
      <div className="sticky top-0 z-50 bg-white">
        <Header />
        <Navigation />
      </div>
      {children}
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
