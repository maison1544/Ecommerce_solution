import svgPaths from "../imports/svg-icons";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

// Logo Component
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

// Header Icons
function SearchIcon() {
  return (
    <svg
      className="block size-6"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 20 20"
    >
      <path d={svgPaths.search} fill="black" />
    </svg>
  );
}

function FavouritesIcon() {
  return (
    <svg
      className="block size-6"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 24 20"
    >
      <path d={svgPaths.heart} fill="black" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      className="block size-6"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 20 20"
    >
      <path
        clipRule="evenodd"
        d={svgPaths.user}
        fill="black"
        fillRule="evenodd"
      />
    </svg>
  );
}

function ShoppingBagIcon() {
  return (
    <svg
      className="block size-6"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 22 20"
    >
      <path d={svgPaths.bag} fill="black" />
    </svg>
  );
}

// Header Component
export function Header() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:items-center gap-4 py-4 lg:py-6">
          {/* Search - Desktop Left */}
          <div className="order-2 lg:order-1">
            <form
              onSubmit={handleSearch}
              className="bg-[#eeeeee] rounded border border-[#eeeeee] flex items-center h-11 px-1"
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="상품명을 입력하세요!"
                className="flex-1 bg-transparent px-3 text-sm text-[#616161] outline-none"
              />
              <button
                type="submit"
                className="p-2 min-w-11 flex items-center justify-center"
              >
                <SearchIcon />
              </button>
            </form>
          </div>

          {/* Logo - Center */}
          <Link to="/" className="order-1 lg:order-2 flex justify-center">
            <Logo />
          </Link>

          {/* Icons - Desktop Right */}
          <div className="hidden lg:flex order-3 items-center gap-4 justify-end">
            {currentUser?.role === "admin" && (
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-gray-800 rounded flex items-center gap-2 bg-black text-white px-3"
                title="관리자 대시보드"
              >
                <Shield size={18} />
                <span className="text-sm font-bold">관리자</span>
              </button>
            )}
            <button
              onClick={() => navigate("/account")}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <AccountIcon />
            </button>
            <button
              onClick={() => navigate("/cart")}
              className="p-2 hover:bg-gray-100 rounded relative"
            >
              <ShoppingBagIcon />
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

// Navigation Menu
export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY < 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { label: "디지털/가전", path: "/category/digital" },
    { label: "패션", path: "/category/fashion" },
    { label: "식품", path: "/category/food" },
    { label: "뷰티", path: "/category/beauty" },
    { label: "생활용품", path: "/category/living" },
    { label: "특가할인상품", path: "/category/special-deals", highlight: true },
    { label: "출산/육아", path: "/category/baby" },
    { label: "스포츠", path: "/category/sports" },
    { label: "자동차용품", path: "/category/car" },
    { label: "도서", path: "/category/books" },
    { label: "완구/취미", path: "/category/toys" },
    { label: "문구/사무용품", path: "/category/office" },
    { label: "반려동물", path: "/category/pet" },
    { label: "고객센터", path: "/customer-service" },
  ];

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Desktop Menu */}
        <div className="hidden lg:block overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 lg:gap-4 min-w-max lg:justify-center py-2.5">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
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

        {/* Mobile Menu */}
        <div className="lg:hidden">
          {/* Horizontal Scroll Menu */}
          <div
            className="overflow-x-auto overflow-y-hidden"
            style={
              isAtTop
                ? { scrollbarWidth: "thin", scrollbarColor: "#d1d5db #f3f4f6" }
                : { scrollbarWidth: "none" }
            }
          >
            <div className="flex items-center gap-2 min-w-max py-2.5 px-2">
              {menuItems.slice(0, 6).map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
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

          {/* Accordion Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full flex items-center justify-center gap-2 py-2 border-t border-gray-200 text-sm font-bold text-black"
          >
            전체 카테고리 보기
            {isMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Accordion Menu */}
          {isMenuOpen && (
            <div className="border-t border-gray-200 py-2 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 px-2">
                {menuItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.path}
                    className={`px-2 py-1.5 text-xs tracking-wider uppercase text-center rounded hover:bg-gray-100 whitespace-nowrap ${
                      item.highlight
                        ? "text-[#b78b1f] font-bold"
                        : "text-black font-bold"
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

// Footer Component
export function Footer() {
  const { isLoggedIn } = useAuth();

  return (
    <footer className="bg-black text-white border-t border-[#333333]">
      {/* Footer Top Section */}
      {!isLoggedIn && (
        <div className="border-b border-[#333333]">
          <div className="container mx-auto px-4 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* My Account */}
              <Link
                to="/login"
                className="flex items-center gap-4 p-3 hover:bg-gray-900 rounded"
              >
                <svg
                  className="size-6 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    clipRule="evenodd"
                    d={svgPaths.profile}
                    fill="white"
                    fillRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-xs font-bold mb-1">내 계정</h3>
                  <p className="text-[11px] text-gray-300">
                    계정 로그인 바로가기
                  </p>
                </div>
              </Link>

              {/* Store Info */}
              <Link
                to="/about"
                className="flex items-center gap-4 p-3 hover:bg-gray-900 rounded"
              >
                <svg
                  className="size-6 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    clipRule="evenodd"
                    d={svgPaths.store}
                    fill="white"
                    fillRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-xs font-bold mb-1">스토어 정보</h3>
                  <p className="text-[11px] text-gray-300">
                    스토어 정보 바로가기
                  </p>
                </div>
              </Link>

              {/* Customer Service */}
              <Link
                to="/customer-service"
                className="flex items-center gap-4 p-3 hover:bg-gray-900 rounded"
              >
                <svg
                  className="size-6 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    clipRule="evenodd"
                    d={svgPaths.chat}
                    fill="white"
                    fillRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-xs font-bold mb-1">고객센터</h3>
                  <p className="text-[11px] text-gray-300">
                    24시간 고객센터 바로가기
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer Bottom Section */}
      <div className="border-t border-[#333333]">
        <div className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Categories */}
            <div>
              <h3 className="text-xs font-bold mb-4">상품 카테고리</h3>
              <ul className="space-y-2 text-xs text-gray-300">
                <li>
                  <Link to="/category/digital" className="hover:text-white">
                    디지털/가전
                  </Link>
                </li>
                <li>
                  <Link to="/category/fashion" className="hover:text-white">
                    패션
                  </Link>
                </li>
                <li>
                  <Link to="/category/food" className="hover:text-white">
                    식품
                  </Link>
                </li>
                <li>
                  <Link to="/category/beauty" className="hover:text-white">
                    뷰티
                  </Link>
                </li>
                <li>
                  <Link to="/category/living" className="hover:text-white">
                    생활용품
                  </Link>
                </li>
                <li>
                  <Link
                    to="/category/special-deals"
                    className="hover:text-white"
                  >
                    특가할인상품
                  </Link>
                </li>
                <li>
                  <Link to="/category/baby" className="hover:text-white">
                    출산/육아
                  </Link>
                </li>
                <li>
                  <Link to="/category/sports" className="hover:text-white">
                    스포츠
                  </Link>
                </li>
                <li>
                  <Link to="/category/car" className="hover:text-white">
                    자동차용품
                  </Link>
                </li>
                <li>
                  <Link to="/category/books" className="hover:text-white">
                    도서
                  </Link>
                </li>
                <li>
                  <Link to="/category/toys" className="hover:text-white">
                    완구/취미
                  </Link>
                </li>
                <li>
                  <Link to="/category/office" className="hover:text-white">
                    문구/사무용품
                  </Link>
                </li>
                <li>
                  <Link to="/category/pet" className="hover:text-white">
                    반려동물
                  </Link>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h3 className="text-xs font-bold mb-4">About</h3>
              <ul className="space-y-2 text-xs text-gray-300">
                <li>
                  <Link to="/about" className="hover:text-white">
                    회사소개
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white">
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link to="/guide" className="hover:text-white">
                    이용안내
                  </Link>
                </li>
                <li>
                  <Link to="/customer-service" className="hover:text-white">
                    고객센터
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Info */}
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
                  <a
                    href="mailto:solution@gmail.com"
                    className="underline hover:text-white"
                  >
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

// Mobile Bottom Navigation
export function MobileBottomNav() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { currentUser } = useAuth();

  const handleSpecialDeals = () => {
    navigate("/category/special-deals");
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
          <button
            onClick={() => navigate("/admin")}
            className="flex flex-col items-center gap-1 p-2"
          >
            <Shield size={20} className="text-black" />
            <span className="text-[10px]">관리자</span>
          </button>
        )}
        <button
          onClick={handleSpecialDeals}
          className="flex flex-col items-center gap-1 p-2"
        >
          <FavouritesIcon />
          <span className="text-[10px]">특가할인</span>
        </button>
        <button
          onClick={() => navigate("/account")}
          className="flex flex-col items-center gap-1 p-2"
        >
          <AccountIcon />
          <span className="text-[10px]">계정</span>
        </button>
        <button
          onClick={() => navigate("/cart")}
          className="flex flex-col items-center gap-1 p-2 relative"
        >
          <ShoppingBagIcon />
          <span className="text-[10px]">장바구니</span>
          <span className="absolute top-1 right-1 bg-black text-white text-[8px] font-bold px-1 rounded-full">
            {cartCount}
          </span>
        </button>
      </div>
    </div>
  );
}
