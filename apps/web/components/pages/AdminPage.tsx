import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Search,
  Upload,
  X,
  Shield,
  MessageCircle,
  CheckCircle,
  Ban,
  Key,
  MapPin,
  Star,
} from "lucide-react";
import { useDebounce } from "../utils/performance";
import { useAuth } from "@/context/AuthContext";
import { products, Product } from "../data/products";
import { orders, Order } from "../data/orders";
import { categoryMap, categoryList } from "../data/categories";
import { InquiriesTab } from "../components/InquiriesTab";
import { Pagination, TableSkeleton } from "../components/Pagination";
import { API_BASE_URL } from "@/utils/api";

// ✅ API Base URL with correct slug
const API_BASE = `${API_BASE_URL}`;

type TabType =
  | "dashboard"
  | "products"
  | "users"
  | "admins"
  | "orders"
  | "inquiries";

// 새 주문 알림을 위한 전역 상태
let newOrdersCount = 0;

export default function AdminPage() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const { currentUser, isLoggedIn, logout, getAccessToken, isAuthLoading } =
    useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [newOrders, setNewOrders] = useState(0);

  // URL query parameter로 탭 설정
  useEffect(() => {
    const tab = searchParams.get("tab") as TabType | null;
    if (
      tab &&
      [
        "dashboard",
        "products",
        "users",
        "admins",
        "orders",
        "inquiries",
      ].includes(tab)
    ) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 관리자 권한 체크
  useEffect(() => {
    // 🔥 세션 로딩 중이면 체크하지 않음
    if (isAuthLoading) {
      return;
    }

    // currentUser가 로드될 때까지 기다림
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    // currentUser가 아직 로드 중이면 체크하지 않음
    if (currentUser === null) {
      return;
    }

    // currentUser가 로드되었지만 admin이 아니면 리다이렉트
    if (currentUser.role !== "admin") {
      toast.error("관리자 권한이 필요합니다");
      router.push("/");
      return;
    }

    // 최근 30분 내 새 주문 체크
    const recentOrders = orders.filter((order) => {
      const orderDate = new Date(order.date);
      const now = new Date();
      const diff = now.getTime() - orderDate.getTime();
      return diff < 30 * 60 * 1000; // 30분
    });
    setNewOrders(recentOrders.length);
  }, [isLoggedIn, currentUser, navigate, isAuthLoading]);

  // 🔥 로딩 중이면 로딩 표시
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b78b1f]"></div>
      </div>
    );
  }

  // 로딩 중이거나 권한 없으면 표시하지 않음
  if (!isLoggedIn || !currentUser || currentUser.role !== "admin") {
    return null;
  }

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
              관리자 대시보드
            </h1>
            <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
              상품, 유저, 주문을 관리하세요
            </p>
          </div>
        </div>
        <div className="h-px bg-black mt-5" />
      </div>

      {/* Tabs */}
      <div className="border-b mb-8">
        <div className="flex gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "dashboard"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <TrendingUp size={18} />
            대시보드
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "products"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Package size={18} />
            상품 관리
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "users"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={18} />
            유저 관리
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "admins"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Shield size={18} />
            관리자 관리
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 whitespace-nowrap relative ${
              activeTab === "orders"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ShoppingCart size={18} />
            주문/배송 관리
            {newOrders > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {newOrders}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`pb-4 font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "inquiries"
                ? "text-black border-b-2 border-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <MessageCircle size={18} />
            문의 관리
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "products" && <ProductsTab />}
      {activeTab === "users" && <UsersTab logout={logout} />}
      {activeTab === "admins" && <AdminsTab />}
      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "inquiries" && <InquiriesTab />}
    </main>
  );
}

// 대시보드 탭
function DashboardTab() {
  const { getAccessToken, currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = await getAccessToken();

        // Fetch products from API
        const productsRes = await fetch(`${API_BASE}/api/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch users from API
        const usersRes = await fetch(`${API_BASE}/api/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Fetch orders from API
        const ordersRes = await fetch(`${API_BASE}/api/admin/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (productsRes.ok && usersRes.ok && ordersRes.ok) {
          const productsData = await productsRes.json();
          const usersData = await usersRes.json();
          const ordersData = await ordersRes.json();

          const totalProducts = productsData.products?.length || 0;
          const totalUsers = usersData.users?.length || 0;
          const totalOrders = ordersData.orders?.length || 0;
          const totalRevenue =
            ordersData.orders
              ?.filter((order: any) => order.status !== "취소")
              .reduce(
                (sum: number, order: any) => sum + (order.totalAmount ?? 0),
                0
              ) || 0;

          setStats({
            totalProducts,
            totalUsers,
            totalOrders,
            totalRevenue,
          });
        }
      } catch (error) {
        console.error("Error loading stats:", error);
        // Use local data as fallback
        setStats({
          totalProducts: products.length,
          totalUsers: 0,
          totalOrders: 0,
          totalRevenue: 0,
        });
      }
    };

    // Only load stats if user is admin
    if (currentUser && currentUser.role === "admin") {
      loadStats();
    }
  }, [currentUser]);

  const statsArray = [
    {
      label: "전체 상품",
      value: stats.totalProducts,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      label: "전체 유저",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-green-500",
    },
    {
      label: "전체 주문",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "bg-purple-500",
    },
    {
      label: "총 매출",
      value: `${stats.totalRevenue.toLocaleString()}원`,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsArray.map((stat, index) => (
          <div key={index} className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 상품 관리 탭
function ProductsTab() {
  const { getAccessToken, currentUser } = useAuth();
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isSaving, setIsSaving] = useState(false); // 저장 중 상태

  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    price: 0,
    originalPrice: 0,
    category: "digital",
    hasDiscount: false,
    discount: 0,
    images: [],
    description: "",
    specs: [],
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false); // 이미지 업로드 중 상태

  const [errors, setErrors] = useState({
    name: "",
    price: "",
    category: "",
  });

  // Load products from API
  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/products`);
      if (response.ok) {
        const data = await response.json();
        // API에서 가져온 상품과 로컬 상품 합치기
        const apiProducts = data.products || [];
        const allProducts = [...products, ...apiProducts];
        // 중복 제거 (id 기준)
        const uniqueProducts = allProducts.filter(
          (product, index, self) =>
            index === self.findIndex((p) => p.id === product.id)
        );
        setProductList(uniqueProducts);
      } else {
        // API 실패 시 로컬 데이터 사용
        setProductList(products);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      setProductList(products); // Fallback to local data
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const validateName = (name: string): string => {
    if (!name.trim()) return "상품명을 입력주세요";
    if (name.length < 2) return "상품명은 2자 이상이어야 합니다";
    return "";
  };

  const validatePrice = (price: number): string => {
    if (!price || price <= 0) return "가격을 올바르게 입력해주세요";
    return "";
  };

  const validateCategory = (category: string): string => {
    if (!category) return "카테고리를 선택해주세요";
    return "";
  };

  const handleChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };

    // 가격은 숫자로 변환
    if (field === "price" || field === "originalPrice") {
      const numValue = Number(value) || 0;
      newFormData[field] = numValue;

      const price = field === "price" ? numValue : formData.price || 0;
      const originalPrice =
        field === "originalPrice" ? numValue : formData.originalPrice || 0;

      if (originalPrice > 0 && price > 0 && originalPrice > price) {
        const calculatedDiscount = Math.round(
          ((originalPrice - price) / originalPrice) * 100
        );
        newFormData.discount = calculatedDiscount;
        newFormData.hasDiscount = true;
      } else {
        newFormData.discount = 0;
        newFormData.hasDiscount = false;
      }
    }

    setFormData(newFormData);

    // Real-time validation
    let error = "";
    if (field === "name") error = validateName(value);
    else if (field === "price") error = validatePrice(Number(value));
    else if (field === "category") error = validateCategory(value);

    setErrors({ ...errors, [field]: error });
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({
      name: "",
      price: 0,
      originalPrice: 0,
      category: "digital",
      hasDiscount: false,
      discount: 0,
      images: [],
      description: "",
      specs: [],
    });
    setErrors({ name: "", price: "", category: "" });
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setIsAdding(false);
    setFormData(product);
    setErrors({ name: "", price: "", category: "" });
  };

  const handleSave = async () => {
    // 중복 클릭 방지
    if (isSaving) {
      toast.info("저장 중입니다. 잠시만 기다려주세요...");
      return;
    }

    // 이미지 업로드 중인지 확인
    if (isUploadingImages) {
      toast.warning(
        "이미지 업로드가 진행 중입니다. 완료될 때까지 기다려주세요..."
      );
      return;
    }

    const validationErrors = {
      name: validateName(formData.name || ""),
      price: validatePrice(formData.price || 0),
      category: validateCategory(formData.category || ""),
    };

    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("입력 정보를 확인해주세요");
      return;
    }

    // 이미지 URL은 이미 formData.images에 저장되어 있음 (handleImageChange에서 업로드 완료)
    const imageUrls = formData.images || [];

    // 이미지가 선택되었지만 업로드가 안 된 경우 경고
    if (imagePreviews.length > 0 && imageUrls.length === 0) {
      toast.warning("이미지 업로드가 완료될 때까지 기다려주세요...");
      return;
    }

    // 주요 사양 정리: trim 후 빈 문자열 제거
    const cleanedSpecs = (formData.specs || [])
      .map((spec) => spec.trim())
      .filter((spec) => spec !== "");

    const productData = {
      name: formData.name!.trim(),
      price: formData.price!,
      originalPrice: formData.originalPrice || formData.price!,
      category: formData.category!,
      hasDiscount: formData.hasDiscount || false,
      discount: formData.discount || 0,
      images: imageUrls,
      description: formData.description || "",
      specs: cleanedSpecs,
      // 수정 시에는 기존 rating 유지, 신규 생성 시에는 null (백엔드에서 설정)
      ...(editingId && {
        rating: formData.rating,
        reviewCount: formData.reviewCount,
      }),
    };

    console.log("저장할 상품 데이터:", productData);
    console.log("이미지 URLs:", imageUrls);

    setIsSaving(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        toast.error("로그인이 필요합니다. 다시 로그인해주세요.");
        return;
      }

      console.log("사용 중인 토큰:", token.substring(0, 50) + "...");

      if (isAdding) {
        // 새 상품 추가 - API 호출
        const response = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API 에러 응답:", errorData);
          throw new Error(errorData.error || "Failed to add product");
        }

        const data = await response.json();
        console.log("상품 추가:", data.product);

        // 상품 목록 다시 로드
        await loadProducts();
        toast.success("상품이 추가되었습니다!");
      } else if (editingId) {
        // 상품 수정 - API 호출
        const response = await fetch(`${API_BASE}/api/products/${editingId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update product");
        }

        const data = await response.json();
        console.log("상품 수정:", data.product);

        // 상품 목록 다시 로드
        await loadProducts();
        toast.success("상품이 수정되었습니다!");
      }

      setIsAdding(false);
      setEditingId(null);
      setImageFiles([]);
      setImagePreviews([]);

      // 중복 클릭 방지를 위한 지연 (2초)
      setTimeout(() => {
        setIsSaving(false);
      }, 2000);
    } catch (error) {
      console.error("Product save error:", error);
      toast.error(`상품 저장 실패: ${error.message}`);
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 상품을 삭제하시겠습니까?")) return;

    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete product");
      }

      console.log("상품 삭제 ID:", id);

      // 상품 목록 다시 로드
      await loadProducts();
      toast.success("상품이 삭제되었습니다!");
    } catch (error) {
      console.error("Product delete error:", error);
      toast.error(`상품 삭제 실패: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, 4); // 최대 4개

    if (fileArray.length > 4) {
      toast.error("이미지는 최대 4개까지 업로드할 수 있습니다");
      return;
    }

    // 관리자 권한 확인 - 먼저 확인
    if (!currentUser || currentUser.role !== "admin") {
      toast.error("관리자 권한이 필요합니다");
      return;
    }

    // 미리보기 생성
    const previewArray = fileArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previewArray);

    // 서버에 업로드
    setIsUploadingImages(true);
    toast.info("이미지 업로드 중...");

    const uploadPromises = fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const token = await getAccessToken();
        const response = await fetch(`${API_BASE}/api/upload-image`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        return data.url;
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error(`이미지 업로드 실패: ${error.message}`);
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    const validUrls = uploadedUrls.filter((url) => url !== null);

    if (validUrls.length > 0) {
      // 업로드 완료 후 0.5초 대기 (안정성 확보)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 업로드된 URL을 formData에 저장 (함수형 업데이트로 최신 상태 보장)
      setFormData((prev) => ({ ...prev, images: validUrls }));
      toast.success(`${validUrls.length}개 이미지가 업로드되었습니다!`);
      console.log("이미지 업로드 완료:", validUrls);
    } else {
      toast.error("이미지 업로드에 실패했습니다");
      setImagePreviews([]);
    }

    setIsUploadingImages(false);
  };

  const filteredProducts = productList.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const showingForm = isAdding || editingId !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품 검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-black"
            />
          </div>
          {!showingForm && (
            <button
              onClick={handleAddNew}
              className="bg-black text-white rounded-lg px-6 py-2 font-bold hover:bg-gray-800 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} />
              상품 추가
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            전체
          </button>
          {categoryList.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${
                selectedCategory === cat.value
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showingForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-bold mb-4">
            {isAdding ? "새 상품 추가" : "상품 수정"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                  errors.name ? "border-red-500" : "border-[#eeeeee]"
                }`}
                placeholder="상품명을 입력하세요"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                판매가격 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                  errors.price ? "border-red-500" : "border-[#eeeeee]"
                }`}
                placeholder="0"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">정가</label>
              <input
                type="number"
                value={formData.originalPrice}
                onChange={(e) => handleChange("originalPrice", e.target.value)}
                className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="0"
              />
              <p className="text-xs text-gray-600 mt-1">
                정가보다 판매가격이 낮으면 할인율이 자동 계산됩니다
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                  errors.category ? "border-red-500" : "border-[#eeeeee]"
                }`}
              >
                {categoryList.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                할인율 (자동 계산)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.discount || 0}
                  readOnly
                  className="w-full bg-gray-100 rounded border border-gray-300 px-4 py-3 text-sm outline-none cursor-not-allowed"
                  placeholder="0"
                />
                {formData.hasDiscount && formData.discount > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    {formData.discount}% 할인
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                정가와 판매가격을 입력하면 자동으로 계산됩니다
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">
                상품 이미지 (최대 4개)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                max={4}
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center gap-2 bg-gray-200 text-black rounded px-4 py-3 font-bold hover:bg-gray-300 cursor-pointer"
              >
                <Upload size={18} />
                이미지 선택 (최대 4개)
              </label>
              <p className="text-xs text-gray-600 mt-1">
                첫 번째 이미지가 메인 이미지로 사용됩니다
              </p>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {imagePreviews.slice(0, 4).map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border-2 border-gray-300"
                      />
                      <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded">
                        {index === 0 ? "메인" : index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = imageFiles.filter(
                            (_, i) => i !== index
                          );
                          const newPreviews = imagePreviews.filter(
                            (_, i) => i !== index
                          );
                          setImageFiles(newFiles);
                          setImagePreviews(newPreviews);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing Images for Edit Mode */}
              {editingId &&
                formData.images &&
                formData.images.length > 0 &&
                imagePreviews.length === 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative">
                        <img
                          src={img}
                          alt={`Product ${index + 1}`}
                          className="w-full h-24 object-cover rounded border-2 border-gray-300"
                        />
                        <div className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-1 rounded">
                          {index === 0 ? "메인" : index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">상품 설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black min-h-[120px]"
                placeholder="상품에 대한 자세한 설명을 입력하세요"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-2">주요 사양</label>
              <textarea
                value={(formData.specs || []).join("\n")}
                onChange={(e) => {
                  // 입력 중에는 줄바꿈 허용 (filter 사용 안 함)
                  const specsArray = e.target.value.split("\n");
                  handleChange("specs", specsArray);
                }}
                className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black min-h-[120px] resize-y"
                placeholder="주요 사양을 한 줄에 하나씩 입력하세요&#10;예:&#10;정품 인증 완료&#10;1년 무상 품질 보증&#10;전국 무료 배송"
              />
              <p className="text-xs text-gray-600 mt-1">
                각 사양을 줄바꿈으로 구분하여 입력하세요 (Enter 키 사용)
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-black rounded px-4 py-3 font-bold hover:bg-gray-300"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isUploadingImages}
              className={`flex-1 rounded px-4 py-3 font-bold ${
                isSaving || isUploadingImages
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {isSaving
                ? "저장 중..."
                : isUploadingImages
                ? "이미지 업로드 중..."
                : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      {!showingForm && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-bold">
                    상품명
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-bold">
                    카테고리
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-bold">
                    가격
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-bold">
                    할인
                  </th>
                  <th className="text-center px-6 py-3 text-sm font-bold">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{product.name}</td>
                    <td className="px-6 py-4 text-sm">
                      {categoryMap[product.category] || product.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold">
                      {(product.price ?? 0).toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {product.hasDiscount && product.discount ? (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                          {product.discount}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-gray-100 rounded text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 유저 관리 탭
function UsersTab({ logout }: { logout: () => void }) {
  const { getAccessToken, currentUser } = useAuth();
  const [userList, setUserList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20; // 서버 사이드 페이지네이션용
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({ isOpen: false, userId: "", userName: "" });
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 배송지 모달 상태
  const [addressModal, setAddressModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({ isOpen: false, userId: "", userName: "" });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // 디바운싱된 검색어
  const debouncedSearch = useDebounce(searchTerm, 300);

  // 페이지 또는 검색어 변경 시 서버에서 데이터 로드
  useEffect(() => {
    loadUsers(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const loadUsers = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const token = await getAccessToken();

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: itemsPerPage.toString(),
        ...(search && { search }),
      });

      const res = await fetch(`${API_BASE}/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUserList(data.users || []);
        if (data.pagination) {
          setTotalCount(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        const error = await res.json();
        toast.error(`유저 로드 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("유저 로드 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    const user = userList.find((u) => u.id === userId);
    if (!user) return;

    if (user.isBlocked) {
      // 차단 해제
      if (!confirm(`${user.name}님의 차단을 해제하시겠습니까?`)) return;

      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}/block`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ block: false }),
        });

        if (res.ok) {
          toast.success(`${user.name}님의 차단이 해제되었습니다`);
          loadUsers(currentPage, debouncedSearch);
        } else {
          const error = await res.json();
          toast.error(`차단 해제 실패: ${error.error}`);
        }
      } catch (error) {
        console.error("Error unblocking user:", error);
        toast.error("차단 해제 중 오류 발생");
      }
    } else {
      // 차단
      if (
        !confirm(
          `${user.name}님을 차단하시겠습니까? 해당 유저는 즉시 로그인할 수 없게 됩니다.`
        )
      )
        return;

      try {
        const token = await getAccessToken();

        const res = await fetch(`${API_BASE}/api/admin/users/${userId}/block`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ block: true }),
        });

        const responseData = await res.json();

        if (res.ok) {
          toast.success(`${user.name}님이 차단되었습니다`);
          loadUsers(currentPage, debouncedSearch);
        } else {
          toast.error(`차단 실패: ${responseData.error}`);
        }
      } catch (error) {
        console.error("Error blocking user:", error);
        toast.error("차단 중 오류 발생");
      }
    }
  };

  // 비밀번호 변경 모달 열기
  const openPasswordModal = (userId: string, userName: string) => {
    setPasswordModal({ isOpen: true, userId, userName });
    setNewPassword("");
  };

  // 배송지 조회 함수
  const loadUserAddresses = async (userId: string, userName: string) => {
    setAddressModal({ isOpen: true, userId, userName });
    setLoadingAddresses(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/admin/users/${userId}/addresses`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      } else {
        toast.error("배송지 조회에 실패했습니다");
        setAddresses([]);
      }
    } catch (error) {
      console.error("Load addresses error:", error);
      toast.error("배송지 조회 중 오류 발생");
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // 비밀번호 변경 핸들러
  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error("비밀번호를 입력해주세요");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error("비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다");
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = await getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/admin/users/${passwordModal.userId}/password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      if (res.ok) {
        toast.success(
          `${passwordModal.userName}님의 비밀번호가 변경되었습니다. 해당 사용자는 재로그인이 필요합니다.`
        );
        setPasswordModal({ isOpen: false, userId: "", userName: "" });
        setNewPassword("");
      } else {
        const error = await res.json();
        toast.error(`비밀번호 변경 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("비밀번호 변경 중 오류 발생");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 서버에서 이미 필터링 및 정렬된 데이터 사용
  const paginatedUsers = userList;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // 검색 시 첫 페이지로
            }}
            placeholder="이름, 이메일, 전화번호로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-bold">이름</th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  이메일
                </th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  전화번호
                </th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  가입일
                </th>
                <th className="text-center px-6 py-3 text-sm font-bold">
                  상태
                </th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  IP 정보
                </th>
                <th className="text-center px-6 py-3 text-sm font-bold">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "검색 결과가 없습니다"
                      : "등록된 유저가 없습니다"}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b hover:bg-gray-50 ${
                      user.isBlocked ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-bold">{user.name}</td>
                    <td className="px-6 py-4 text-sm">{user.email}</td>
                    <td className="px-6 py-4 text-sm">{user.phone || "-"}</td>
                    <td className="px-6 py-4 text-sm">{user.createdAt}</td>
                    <td className="px-6 py-4 text-center">
                      {user.isBlocked ? (
                        <div className="flex flex-col items-center">
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                            차단됨
                          </span>
                          {user.blockedAt && (
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(user.blockedAt).toLocaleString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">
                          정상
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="text-gray-400">가입:</span>{" "}
                          <span className="font-mono">
                            {user.signupIp || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">최근:</span>{" "}
                          <span className="font-mono">
                            {user.lastLoginIp || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => loadUserAddresses(user.id, user.name)}
                          className="px-3 py-1 rounded font-bold text-sm flex items-center gap-1 bg-purple-500 text-white hover:bg-purple-600"
                          title="배송지 조회"
                        >
                          <MapPin size={14} />
                          배송지
                        </button>
                        <button
                          onClick={() => openPasswordModal(user.id, user.name)}
                          className="px-3 py-1 rounded font-bold text-sm flex items-center gap-1 bg-blue-500 text-white hover:bg-blue-600"
                          title="비밀번호 변경"
                        >
                          <Key size={14} />
                          비밀번호
                        </button>
                        <button
                          onClick={() => handleBlockUser(user.id)}
                          className={`px-3 py-1 rounded font-bold text-sm flex items-center gap-1 ${
                            user.isBlocked
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                        >
                          {user.isBlocked ? (
                            <>
                              <CheckCircle size={14} />
                              해제
                            </>
                          ) : (
                            <>
                              <Ban size={14} />
                              차단
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Change Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {passwordModal.userName}님의 비밀번호 변경
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              비밀번호 변경 후 해당 사용자는 즉시 로그아웃되며, 새 비밀번호로
              다시 로그인해야 합니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                새 비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="8자 이상, 대문자, 소문자, 숫자 포함"
                minLength={8}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPasswordModal({ isOpen: false, userId: "", userName: "" });
                  setNewPassword("");
                }}
                className="flex-1 bg-gray-200 text-black rounded px-4 py-3 font-bold hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || newPassword.length < 8}
                className="flex-1 bg-blue-500 text-white rounded px-4 py-3 font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {addressModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {addressModal.userName}님의 배송지 목록
              </h3>
              <button
                onClick={() =>
                  setAddressModal({ isOpen: false, userId: "", userName: "" })
                }
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingAddresses ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
                  <p className="mt-2 text-gray-600">로딩 중...</p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 배송지가 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {addresses.map((addr, index) => (
                    <div
                      key={addr.id}
                      className={`p-4 border rounded-lg ${
                        addr.is_default ? "border-yellow-400 bg-yellow-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {addr.is_default && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                                <Star size={12} className="fill-yellow-500" />
                                기본 배송지
                              </span>
                            )}
                            <span className="font-bold">
                              {addr.name || `배송지 ${index + 1}`}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-500">수령인:</span>{" "}
                              {addr.recipient}
                            </p>
                            <p>
                              <span className="text-gray-500">연락처:</span>{" "}
                              {addr.phone}
                            </p>
                            <p>
                              <span className="text-gray-500">주소:</span> (
                              {addr.postal_code}) {addr.address}
                              {addr.detail_address && ` ${addr.detail_address}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        등록일:{" "}
                        {(() => {
                          const d = new Date(addr.created_at);
                          return `${d.getFullYear()}. ${
                            d.getMonth() + 1
                          }. ${d.getDate()}. ${String(d.getHours()).padStart(
                            2,
                            "0"
                          )}:${String(d.getMinutes()).padStart(
                            2,
                            "0"
                          )}:${String(d.getSeconds()).padStart(2, "0")}`;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <p className="text-sm text-gray-500">
                총 {addresses.length}개의 배송지
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}

// 관리자 관리 탭
function AdminsTab() {
  const { getAccessToken, currentUser } = useAuth();
  const [adminList, setAdminList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const [isAdding, setIsAdding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    adminId: string;
    adminName: string;
  }>({ isOpen: false, adminId: "", adminName: "" });
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 디바운싱된 검색어
  const debouncedSearch = useDebounce(searchTerm, 300);

  // 페이지 또는 검색어 변경 시 서버에서 데이터 로드
  useEffect(() => {
    loadAdmins(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const loadAdmins = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const token = await getAccessToken();

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: itemsPerPage.toString(),
        ...(search && { search }),
      });

      const res = await fetch(`${API_BASE}/api/admin/admins?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAdminList(data.admins || []);
        if (data.pagination) {
          setTotalCount(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        const error = await res.json();
        toast.error(`관리자 로드 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("관리자 로드 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });

  const validateName = (name: string): string => {
    if (!name.trim()) return "이름을 입력해주세요";
    if (name.length < 2) return "이름은 2자 이상이어야 합니다";
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) return "이메일을 입력해주세요";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "올바른 이메일 형식이 아닙니다";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "비밀번호를 입력해주세요";
    if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다";
    }
    return "";
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });

    // Real-time validation
    let error = "";
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "password") error = validatePassword(value);

    setErrors({ ...errors, [field]: error });
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setFormData({
      name: "",
      email: "",
      password: "",
    });
    setErrors({
      name: "",
      email: "",
      password: "",
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({
      name: "",
      email: "",
      password: "",
    });
    setErrors({
      name: "",
      email: "",
      password: "",
    });
  };

  const handleSave = async () => {
    const validationErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };

    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("입력 정보를 확인해주세요");
      return;
    }

    setIsCreating(true);

    try {
      // 관리자 토큰 가져오기
      const token = await getAccessToken();
      if (!token) {
        toast.error("로그인이 필요합니다");
        setIsCreating(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/create-admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      toast.success(`${formData.name}님이 관리자로 등록되었습니다!`);
      setIsAdding(false);
      handleCancel();
      loadAdmins(); // Reload admin list
    } catch (error) {
      console.error("Admin creation error:", error);
      toast.error(`관리자 생성 실패: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAdmin = async (userId: string) => {
    const user = adminList.find((u) => u.id === userId);
    if (!user) return;

    if (
      confirm(
        `${user.name}님의 계정을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      try {
        const token = await getAccessToken();
        const response = await fetch(`${API_BASE}/api/admin/admins/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete admin");
        }

        toast.success(`${user.name}님의 계정이 삭제되었습니다.`);
        loadAdmins(); // Reload admin list
      } catch (error: any) {
        console.error("Delete admin error:", error);
        toast.error(`관리자 삭제 실패: ${error.message}`);
      }
    }
  };

  // 비밀번호 변경 모달 열기
  const openPasswordModal = (adminId: string, adminName: string) => {
    setPasswordModal({ isOpen: true, adminId, adminName });
    setNewPassword("");
  };

  // 비밀번호 변경 핸들러
  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error("비밀번호를 입력해주세요");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error("비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다");
      return;
    }

    // 자신의 비밀번호를 변경하는 경우 경고
    if (passwordModal.adminId === currentUser?.id) {
      if (
        !confirm(
          "자신의 비밀번호를 변경하면 즉시 로그아웃됩니다. 계속하시겠습니까?"
        )
      ) {
        return;
      }
    }

    setIsChangingPassword(true);

    try {
      const token = await getAccessToken();
      const res = await fetch(
        `${API_BASE}/api/admin/admins/${passwordModal.adminId}/password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newPassword }),
        }
      );

      if (res.ok) {
        toast.success(
          `${passwordModal.adminName}님의 비밀번호가 변경되었습니다. 해당 관리자는 재로그인이 필요합니다.`
        );
        setPasswordModal({ isOpen: false, adminId: "", adminName: "" });
        setNewPassword("");
      } else {
        const error = await res.json();
        toast.error(`비밀번호 변경 실패: ${error.error}`);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("비밀번호 변경 중 오류 발생");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 서버에서 이미 필터링 및 정렬된 데이터 사용
  const paginatedAdmins = adminList;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // 검색 시 첫 페이지로
            }}
            placeholder="이름, 이메일로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-black"
          />
        </div>
        {!isAdding && (
          <button
            onClick={handleAddNew}
            className="bg-black text-white rounded-lg px-6 py-2 font-bold hover:bg-gray-800 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            관리자 추가
          </button>
        )}
      </div>

      {/* Admins Table */}
      <div className="bg-white border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-bold">이름</th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  이메일
                </th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  가입일
                </th>
                <th className="text-center px-6 py-3 text-sm font-bold">
                  상태
                </th>
                <th className="text-left px-6 py-3 text-sm font-bold">
                  IP 정보
                </th>
                <th className="text-center px-6 py-3 text-sm font-bold">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedAdmins.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b hover:bg-gray-50 ${
                    user.isBlocked ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-bold">{user.name}</td>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4 text-sm">{user.createdAt}</td>
                  <td className="px-6 py-4 text-center">
                    {user.isBlocked ? (
                      <div className="flex flex-col items-center">
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                          차단됨
                        </span>
                        {user.blockedAt && (
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(user.blockedAt).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">
                        정상
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    <div className="flex flex-col gap-1">
                      <div>
                        <span className="text-gray-400">가입:</span>{" "}
                        <span className="font-mono">
                          {user.signupIp || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">최근:</span>{" "}
                        <span className="font-mono">
                          {user.lastLoginIp || "-"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openPasswordModal(user.id, user.name)}
                        className="px-3 py-1 rounded font-bold text-sm flex items-center gap-1 bg-blue-500 text-white hover:bg-blue-600"
                        title="비밀번호 변경"
                      >
                        <Key size={14} />
                        비밀번호
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(user.id)}
                        className="px-3 py-1 rounded font-bold text-sm flex items-center gap-1 bg-red-500 text-white hover:bg-red-600"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Change Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {passwordModal.adminName}님의 비밀번호 변경
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              비밀번호 변경 후 해당 관리자는 즉시 로그아웃되며, 새 비밀번호로
              다시 로그인해야 합니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                새 비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
                placeholder="8자 이상, 대문자, 소문자, 숫자 포함"
                minLength={8}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPasswordModal({
                    isOpen: false,
                    adminId: "",
                    adminName: "",
                  });
                  setNewPassword("");
                }}
                className="flex-1 bg-gray-200 text-black rounded px-4 py-3 font-bold hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || newPassword.length < 8}
                className="flex-1 bg-blue-500 text-white rounded px-4 py-3 font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {isAdding && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-bold mb-4">새 관리자 추가</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                  errors.name ? "border-red-500" : "border-[#eeeeee]"
                }`}
                placeholder="이름을 입력하세요"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                  errors.email ? "border-red-500" : "border-[#eeeeee]"
                }`}
                placeholder="이메일을 입력하세요"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                  errors.password ? "border-red-500" : "border-[#eeeeee]"
                }`}
                placeholder="비밀번호를 입력하세요"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-black rounded px-4 py-3 font-bold hover:bg-gray-300"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-black text-white rounded px-4 py-3 font-bold hover:bg-gray-800"
              disabled={isCreating}
            >
              {isCreating ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}

// 주문/배송 관리 탭
function OrdersTab() {
  const { getAccessToken } = useAuth();
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // 디바운싱된 검색어
  const debouncedSearch = useDebounce(searchTerm, 300);

  // 페이지 또는 검색어 변경 시 서버에서 데이터 로드
  useEffect(() => {
    loadOrders(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  // 주문 목록 로드 함수
  const loadOrders = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) return;

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: itemsPerPage.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`${API_BASE}/api/admin/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrderList(data.orders || []);
        if (data.pagination) {
          setTotalCount(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
      } else {
        console.error("Failed to load orders");
        setOrderList([]);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      setOrderList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("인증 정보가 없습니다");
        return;
      }

      const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        // 주문 목록 업데이트 - status 필드만 사용 (백엔드에서 shippingStatus를 status로 매핑)
        setOrderList(
          orderList.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        toast.success("배송 상태가 변경되었습니다!");

        // 주문 목록 새로고침 제거
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "배송 상태 변경에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error("배송 상태 변경에 실패했습니다");
    }
  };

  // 서버에서 이미 필터링 및 정렬된 데이터 사용
  const paginatedOrders = orderList;

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">주문 내역을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // 검색 시 첫 페이지로
            }}
            placeholder="주문번호, 수령인, 연락처, 배송지로 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[120px]">
                  주문번호
                </th>
                <th className="text-left px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[150px]">
                  주문일시
                </th>
                <th className="text-right px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[100px]">
                  주문금액
                </th>
                <th className="text-left px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[80px]">
                  수령인
                </th>
                <th className="text-left px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[120px]">
                  연락처
                </th>
                <th className="text-left px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[200px]">
                  배송지
                </th>
                <th className="text-center px-4 py-3 text-sm font-bold whitespace-nowrap min-w-[130px]">
                  배송상태
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-bold whitespace-nowrap">
                    <span className="font-mono text-xs">
                      {order.id?.substring(0, 8) || "-"}...
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">
                    {order.date || "날짜 없음"}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-bold whitespace-nowrap">
                    {(order.totalAmount ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-4 text-sm font-bold whitespace-nowrap">
                    {order.shippingAddress?.recipient || "수령인 없음"}
                  </td>
                  <td className="px-4 py-4 text-sm whitespace-nowrap">
                    {order.shippingAddress?.phone || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div
                      className="max-w-[200px] truncate"
                      title={`${order.shippingAddress?.address || ""} ${
                        order.shippingAddress?.detailAddress || ""
                      }`}
                    >
                      {order.shippingAddress?.address || ""}{" "}
                      {order.shippingAddress?.detailAddress || ""}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(
                          order.id,
                          e.target.value as Order["status"]
                        )
                      }
                      className="bg-[#eeeeee] rounded border border-[#eeeeee] px-2 py-1.5 text-xs font-bold outline-none focus:border-black whitespace-nowrap"
                    >
                      <option value="배송 준비 중">배송 준비 중</option>
                      <option value="배송 중">배송 중</option>
                      <option value="배송 완료">배송 완료</option>
                      <option value="취소">취소</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}
