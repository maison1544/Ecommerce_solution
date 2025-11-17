import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "2.0.0";

// ✅ CORS 제한: 프로덕션 배포 시 실제 도메인으로 변경 필요!
// 개발: "*" / 프로덕션: "https://yourdomain.com"
const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

const supabase = () => createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ========== KV Store Helpers ==========
const kvGet = async (k: string) => {
  const { data } = await supabase().from("kv_store_94a0507e").select("value").eq("key", k).maybeSingle();
  return data?.value;
};

const kvSet = async (k: string, v: any) => {
  await supabase().from("kv_store_94a0507e").upsert({ key: k, value: v });
};

const kvDel = async (k: string) => {
  await supabase().from("kv_store_94a0507e").delete().eq("key", k);
};

const kvGetByPrefix = async (prefix: string) => {
  const { data } = await supabase().from("kv_store_94a0507e").select("*").like("key", `${prefix}%`);
  return data || [];
};

// ========== Rate Limiting ==========
// ✅ 회원가입 Rate Limit: IP 기준 1분 3회, 1시간 20회
async function checkSignupRateLimit(ip: string): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const now = Date.now();
  const minuteAgo = now - 60 * 1000;
  const hourAgo = now - 60 * 60 * 1000;
  
  // KV Store에서 현재 IP의 회원가입 이력 조회
  const signupHistory = await kvGet(`signup_rate_${ip}`) || [];
  
  // 1분 이내 시도 횟수
  const recentMinute = signupHistory.filter((timestamp: number) => timestamp > minuteAgo);
  if (recentMinute.length >= 3) {
    return { allowed: false, error: "너무 많은 요청입니다. 1분 후 다시 시도해주세요.", retryAfter: 60 };
  }
  
  // 1시간 이내 시도 횟수
  const recentHour = signupHistory.filter((timestamp: number) => timestamp > hourAgo);
  if (recentHour.length >= 20) {
    return { allowed: false, error: "너무 많은 요청입니다. 1시간 후 다시 시도해주세요.", retryAfter: 3600 };
  }
  
  // 현재 시도 추가
  const updatedHistory = [...recentHour, now];
  await kvSet(`signup_rate_${ip}`, updatedHistory);
  
  return { allowed: true };
}

// ✅ 로그인 Rate Limit: IP 기준 1분 5회, 1시간 50회
async function checkLoginRateLimit(ip: string): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const now = Date.now();
  const minuteAgo = now - 60 * 1000;
  const hourAgo = now - 60 * 60 * 1000;
  
  const loginHistory = await kvGet(`login_rate_${ip}`) || [];
  
  // 1분 이내 5회 초과 시 차단
  const recentMinute = loginHistory.filter((timestamp: number) => timestamp > minuteAgo);
  if (recentMinute.length >= 5) {
    return { allowed: false, error: "너무 많은 로그인 시도입니다. 1분 후 다시 시도해주세요.", retryAfter: 60 };
  }
  
  // 1시간 이내 50회 초과 시 차단
  const recentHour = loginHistory.filter((timestamp: number) => timestamp > hourAgo);
  if (recentHour.length >= 50) {
    return { allowed: false, error: "너무 많은 로그인 시도입니다. 1시간 후 다시 시도해주세요.", retryAfter: 3600 };
  }
  
  await kvSet(`login_rate_${ip}`, [...recentHour, now]);
  return { allowed: true };
}

// ✅ 범용 Rate Limit 함수 (Retry-After 포함)
async function checkRateLimit(
  key: string, 
  minuteLimit: number, 
  hourLimit: number
): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  const now = Date.now();
  const minuteAgo = now - 60 * 1000;
  const hourAgo = now - 60 * 60 * 1000;
  
  const history = await kvGet(`rate_${key}`) || [];
  
  // 1분 이내 시도 횟수
  const recentMinute = history.filter((timestamp: number) => timestamp > minuteAgo);
  if (recentMinute.length >= minuteLimit) {
    return { allowed: false, error: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.", retryAfter: 60 };
  }
  
  // 1시간 이내 시도 횟수
  const recentHour = history.filter((timestamp: number) => timestamp > hourAgo);
  if (recentHour.length >= hourLimit) {
    return { allowed: false, error: "너무 많은 요청입니다. 나중에 다시 시도해주세요.", retryAfter: 3600 };
  }
  
  // 현재 시도 추가
  const updatedHistory = [...recentHour, now];
  await kvSet(`rate_${key}`, updatedHistory);
  
  return { allowed: true };
}

// ✅ 이중 Rate Limit: User ID + IP
async function checkDualRateLimit(
  userId: string,
  ip: string,
  prefix: string,
  minuteLimit: number,
  hourLimit: number
): Promise<{ allowed: boolean; error?: string; retryAfter?: number }> {
  // 첫 번째 방어: User ID 기준
  const userResult = await checkRateLimit(`${prefix}_user_${userId}`, minuteLimit, hourLimit);
  if (!userResult.allowed) {
    return userResult;
  }
  
  // 두 번째 방어: IP 기준
  const ipResult = await checkRateLimit(`${prefix}_ip_${ip}`, minuteLimit * 2, hourLimit * 2);
  if (!ipResult.allowed) {
    return ipResult;
  }
  
  return { allowed: true };
}

// ✅ IP 추출 헬퍼
function getClientIP(req: Request): string {
  const forwarded = req.headers.get("X-Forwarded-For");
  const realIp = req.headers.get("X-Real-IP");
  
  let clientIP = "unknown";
  
  if (forwarded) {
    clientIP = forwarded.split(',')[0].trim();
  } else if (realIp) {
    clientIP = realIp;
  }
  
  // 🔍 배포 후 확인용 로그 (프로덕션에서 IP 전달 확인)
  console.log(`[IP CHECK] X-Forwarded-For: ${forwarded || "없음"} | X-Real-IP: ${realIp || "없음"} | 추출된 IP: ${clientIP}`);
  
  return clientIP;
}

// ========== Auth Helpers ==========
async function auth(h: string | null) {
  if (!h?.startsWith("Bearer ")) return { user: null, error: "No token" };
  const t = h.split(" ")[1];
  const { data: { user }, error } = await supabase().auth.getUser(t);
  if (error || !user) return { user: null, error: "Invalid" };
  const b = await kvGet(`blocked_user_${user.id}`);
  if (b?.isBlocked) return { user: null, error: "Blocked" };
  return { user, error: null };
}

async function admin(h: string | null) {
  const { user, error } = await auth(h);
  if (error || !user) return { user: null, error: error || "Unauthorized" };
  
  // 관리자 차단 확인
  const adminBlocked = await kvGet(`blocked_admin_${user.id}`);
  if (adminBlocked?.isBlocked) return { user: null, error: "Admin blocked" };
  
  // ✅ app_metadata.role에서 확인 (클라이언트 수정 불가능)
  if (user.app_metadata?.role !== "admin") return { user: null, error: "Admin required" };
  return { user, error: null };
}

// ========== 유틸리티 함수 ==========
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const url = new URL(req.url);
    const p = url.pathname.startsWith("/api/") ? url.pathname : `/api${url.pathname}`;
    const m = req.method;

    // ==================== HEALTH CHECK ====================
    if (p === "/api/health" && m === "GET") {
      return new Response(JSON.stringify({ status: "ok", version: VERSION }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== AUTH: 회원가입 ====================
    if (p === "/api/auth/signup" && m === "POST") {
      const ip = getClientIP(req);
      const rateLimitResult = await checkSignupRateLimit(ip);
      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({ error: rateLimitResult.error }),
          { 
            status: 429, 
            headers: { 
              ...cors, 
              "Content-Type": "application/json",
              "Retry-After": rateLimitResult.retryAfter?.toString() || "60"
            } 
          }
        );
      }

      const body = await req.json();
      const { email, password, name, phone, birthDate } = body;

      // Phone을 E.164 포맷으로 변환 (한국: 010-1234-5678 → +821012345678)
      let formattedPhone = phone;
      if (phone && phone.startsWith("010")) {
        formattedPhone = "+82" + phone.substring(1).replace(/-/g, "");
      }

      // ✅ role은 app_metadata에 저장 (클라이언트 수정 불가능)
      const { data, error } = await supabase().auth.admin.createUser({
        email,
        password,
        phone: formattedPhone,
        user_metadata: { 
          name,
          phone,
          birthDate: birthDate || null,
          // ❌ role을 user_metadata에 저장하지 않음
        },
        app_metadata: {
          role: "customer" // ✅ app_metadata에 저장 (보안)
        },
        email_confirm: true,
        phone_confirm: true
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, user: data.user }),
        { status: 201, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== AUTH: 차단 확인 ====================
    if (p === "/api/auth/check-blocked" && m === "POST") {
      const h = req.headers.get("Authorization");
      if (!h?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "No token" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      const t = h.split(" ")[1];
      const { data: { user }, error } = await supabase().auth.getUser(t);
      if (error || !user) return new Response(JSON.stringify({ error: "Invalid" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      const b = await kvGet(`blocked_user_${user.id}`);
      return new Response(JSON.stringify({ isBlocked: b?.isBlocked || false }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== PRODUCTS: 전체 상품 조회 ====================
    if (p === "/api/products" && m === "GET") {
      const products = await kvGet("products_list") || [];
      return new Response(JSON.stringify({ products }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== PRODUCTS: 상품 추가 (관리자) ====================
    if (p === "/api/products" && m === "POST") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const body = await req.json();
      const products = await kvGet("products_list") || [];
      
      const newProduct = {
        ...body,
        id: parseInt(generateId().replace(/_/g, "")),
        createdAt: new Date().toISOString()
      };

      products.push(newProduct);
      await kvSet("products_list", products);

      return new Response(
        JSON.stringify({ success: true, product: newProduct }),
        { status: 201, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== PRODUCTS: 상품 수정 (관리자) ====================
    if (p.match(/^\/api\/products\/\d+$/) && m === "PUT") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const productId = parseInt(p.split("/").pop()!);
      const body = await req.json();
      const products = await kvGet("products_list") || [];
      
      const index = products.findIndex((p: any) => p.id === productId);
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      products[index] = { ...products[index], ...body, updatedAt: new Date().toISOString() };
      await kvSet("products_list", products);

      return new Response(
        JSON.stringify({ success: true, product: products[index] }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== PRODUCTS: 상품 삭제 (관리자) ====================
    if (p.match(/^\/api\/products\/\d+$/) && m === "DELETE") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const productId = parseInt(p.split("/").pop()!);
      const products = await kvGet("products_list") || [];
      
      const filteredProducts = products.filter((p: any) => p.id !== productId);
      await kvSet("products_list", filteredProducts);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ADDRESSES: 배송지 조회 ====================
    if (p === "/api/addresses" && m === "GET") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const addresses = await kvGet(`addresses_${user.id}`) || [];
      return new Response(JSON.stringify({ addresses }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== ADDRESSES: 배송지 추가 ====================
    if (p === "/api/addresses" && m === "POST") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const body = await req.json();
      const addresses = await kvGet(`addresses_${user.id}`) || [];
      
      const newAddress = {
        ...body,
        id: parseInt(generateId().replace(/_/g, "")),
        userId: user.id,
        createdAt: new Date().toISOString()
      };

      // 첫 번째 배송지거나 isDefault가 true인 경우
      if (newAddress.isDefault || addresses.length === 0) {
        // 기존 기본 배송지 해제
        addresses.forEach((addr: any) => addr.isDefault = false);
        newAddress.isDefault = true;
      }

      addresses.push(newAddress);
      await kvSet(`addresses_${user.id}`, addresses);

      return new Response(
        JSON.stringify({ success: true, addresses }),
        { status: 201, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ADDRESSES: 배송지 수정 ====================
    if (p.match(/^\/api\/addresses\/\d+$/) && m === "PUT") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const addressId = parseInt(p.split("/").pop()!);
      const body = await req.json();
      const addresses = await kvGet(`addresses_${user.id}`) || [];
      
      const index = addresses.findIndex((a: any) => a.id === addressId);
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Address not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      // isDefault가 true로 변경된 경우
      if (body.isDefault) {
        addresses.forEach((addr: any) => addr.isDefault = false);
      }

      addresses[index] = { ...addresses[index], ...body, updatedAt: new Date().toISOString() };
      await kvSet(`addresses_${user.id}`, addresses);

      return new Response(
        JSON.stringify({ success: true, addresses }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ADDRESSES: 배송지 삭제 ====================
    if (p.match(/^\/api\/addresses\/\d+$/) && m === "DELETE") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const addressId = parseInt(p.split("/").pop()!);
      const addresses = await kvGet(`addresses_${user.id}`) || [];
      
      const filteredAddresses = addresses.filter((a: any) => a.id !== addressId);
      
      // 삭제된 주소가 기본 배송지였다면 첫 번째 주소를 기본으로 설정
      const deletedAddr = addresses.find((a: any) => a.id === addressId);
      if (deletedAddr?.isDefault && filteredAddresses.length > 0) {
        filteredAddresses[0].isDefault = true;
      }

      await kvSet(`addresses_${user.id}`, filteredAddresses);

      return new Response(
        JSON.stringify({ success: true, addresses: filteredAddresses }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== INQUIRIES: 문의 생성 ====================
    if (p === "/api/inquiries" && m === "POST") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      // ✅ Rate Limit: 1분 3회, 1시간 10회
      const rateLimitResult = await checkRateLimit(`inquiry_${user.id}`, 3, 10);
      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({ error: rateLimitResult.error }),
          { 
            status: 429, 
            headers: { 
              ...cors, 
              "Content-Type": "application/json",
              "Retry-After": rateLimitResult.retryAfter?.toString() || "60"
            } 
          }
        );
      }

      const body = await req.json();
      const inquiries = await kvGet("inquiries_list") || [];
      
      const newInquiry = {
        ...body,
        id: generateId(),
        userId: user.id,
        userName: user.user_metadata?.name || "Unknown",
        status: "대기",
        createdAt: new Date().toISOString()
      };

      inquiries.push(newInquiry);
      await kvSet("inquiries_list", inquiries);

      // 사용자별 문의도 저장
      const userInquiries = await kvGet(`inquiries_user_${user.id}`) || [];
      userInquiries.push(newInquiry);
      await kvSet(`inquiries_user_${user.id}`, userInquiries);

      return new Response(
        JSON.stringify({ success: true, inquiry: newInquiry }),
        { status: 201, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== INQUIRIES: 사용자 문의 조회 ====================
    if (p === "/api/inquiries/my" && m === "GET") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const inquiries = await kvGet(`inquiries_user_${user.id}`) || [];
      return new Response(JSON.stringify({ inquiries }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== INQUIRIES: 문의 답변 (관리자) ====================
    if (p.match(/^\/api\/inquiries\/[^/]+\/answer$/) && m === "PUT") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const inquiryId = p.split("/")[3];
      const body = await req.json();
      
      const inquiries = await kvGet("inquiries_list") || [];
      const index = inquiries.findIndex((i: any) => i.id === inquiryId);
      
      if (index === -1) {
        return new Response(JSON.stringify({ error: "Inquiry not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      inquiries[index].status = "답변완료";
      inquiries[index].answer = {
        content: body.answer,
        answeredAt: new Date().toISOString(),
        answeredBy: user.user_metadata?.name || "관리자"
      };

      await kvSet("inquiries_list", inquiries);

      // 사용자별 문의도 업데이트
      const userId = inquiries[index].userId;
      const userInquiries = await kvGet(`inquiries_user_${userId}`) || [];
      const userIndex = userInquiries.findIndex((i: any) => i.id === inquiryId);
      if (userIndex !== -1) {
        userInquiries[userIndex] = inquiries[index];
        await kvSet(`inquiries_user_${userId}`, userInquiries);
      }

      return new Response(
        JSON.stringify({ success: true, inquiry: inquiries[index] }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ADMIN: 전체 문의 조회 ====================
    if (p === "/api/admin/inquiries" && m === "GET") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const inquiries = await kvGet("inquiries_list") || [];
      return new Response(JSON.stringify({ inquiries }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== REVIEWS: 리뷰 조회 ====================
    if (p === "/api/reviews" && m === "GET") {
      const productId = url.searchParams.get("productId");
      
      if (productId) {
        const reviews = await kvGet(`reviews_product_${productId}`) || [];
        return new Response(JSON.stringify({ reviews }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      } else {
        const allReviews = await kvGet("reviews_list") || [];
        return new Response(JSON.stringify({ reviews: allReviews }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // ==================== REVIEWS: 리뷰 추가 ====================
    if (p === "/api/reviews" && m === "POST") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      // ✅ Rate Limit: 1분 3회, 1시간 20회
      const rateLimitResult = await checkRateLimit(`review_${user.id}`, 3, 20);
      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({ error: rateLimitResult.error }),
          { 
            status: 429, 
            headers: { 
              ...cors, 
              "Content-Type": "application/json",
              "Retry-After": rateLimitResult.retryAfter?.toString() || "60"
            } 
          }
        );
      }

      const body = await req.json();
      
      const newReview = {
        ...body,
        id: parseInt(generateId().replace(/_/g, "")),
        userId: user.id,
        userName: user.user_metadata?.name || "Unknown",
        createdAt: new Date().toISOString(),
        helpful: 0,
        helpfulUsers: []
      };

      // 전체 리뷰 목록에 추가
      const allReviews = await kvGet("reviews_list") || [];
      allReviews.push(newReview);
      await kvSet("reviews_list", allReviews);

      // 상품별 리뷰에 추가
      const productReviews = await kvGet(`reviews_product_${body.productId}`) || [];
      productReviews.push(newReview);
      await kvSet(`reviews_product_${body.productId}`, productReviews);

      return new Response(
        JSON.stringify({ success: true, review: newReview }),
        { status: 201, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== REVIEWS: 도움이 됐어요 토글 ====================
    if (p.match(/^\/api\/reviews\/\d+\/helpful$/) && m === "POST") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const reviewId = parseInt(p.split("/")[3]);
      
      // 전체 리뷰 목록에서 찾기
      const allReviews = await kvGet("reviews_list") || [];
      const reviewIndex = allReviews.findIndex((r: any) => r.id === reviewId);
      
      if (reviewIndex === -1) {
        return new Response(JSON.stringify({ error: "Review not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const review = allReviews[reviewIndex];
      const helpfulUsers = review.helpfulUsers || [];
      
      // 이미 눌렀는지 확인
      if (helpfulUsers.includes(user.id)) {
        return new Response(
          JSON.stringify({ error: "Already marked as helpful", alreadyMarked: true }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // 추가
      review.helpfulUsers = [...helpfulUsers, user.id];
      review.helpful = review.helpfulUsers.length;
      allReviews[reviewIndex] = review;
      await kvSet("reviews_list", allReviews);

      // 상품별 리뷰도 업데이트
      const productReviews = await kvGet(`reviews_product_${review.productId}`) || [];
      const productReviewIndex = productReviews.findIndex((r: any) => r.id === reviewId);
      if (productReviewIndex !== -1) {
        productReviews[productReviewIndex] = review;
        await kvSet(`reviews_product_${review.productId}`, productReviews);
      }

      return new Response(
        JSON.stringify({ success: true, review }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== REVIEWS: 리뷰 삭제 ====================
    if (p.match(/^\/api\/reviews\/\d+$/) && m === "DELETE") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const reviewId = parseInt(p.split("/").pop()!);
      
      const allReviews = await kvGet("reviews_list") || [];
      const review = allReviews.find((r: any) => r.id === reviewId);
      
      if (!review) {
        return new Response(JSON.stringify({ error: "Review not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      // 본인 또는 관리자만 삭제 가능
      if (review.userId !== user.id && user.user_metadata?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }

      // 전체 리뷰에서 삭제
      const filteredAllReviews = allReviews.filter((r: any) => r.id !== reviewId);
      await kvSet("reviews_list", filteredAllReviews);

      // 상품별 리뷰에서 삭제
      const productReviews = await kvGet(`reviews_product_${review.productId}`) || [];
      const filteredProductReviews = productReviews.filter((r: any) => r.id !== reviewId);
      await kvSet(`reviews_product_${review.productId}`, filteredProductReviews);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== CART: 장바구니 조회 ====================
    if (p === "/api/cart" && m === "GET") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const cart = await kvGet(`cart_${user.id}`) || [];
      return new Response(JSON.stringify({ cart }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== CART: 장바구니 업데이트 ====================
    if (p === "/api/cart" && m === "POST") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const body = await req.json();
      await kvSet(`cart_${user.id}`, body.cart);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ORDERS: 주문 생성 ====================
    if (p === "/api/orders" && m === "POST") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      // ✅ Rate Limit: 1분 3회, 1시간 10회
      const rateLimitResult = await checkRateLimit(`order_${user.id}`, 3, 10);
      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({ error: rateLimitResult.error }),
          { 
            status: 429, 
            headers: { 
              ...cors, 
              "Content-Type": "application/json",
              "Retry-After": rateLimitResult.retryAfter?.toString() || "60"
            } 
          }
        );
      }

      const body = await req.json();
      
      const newOrder = {
        ...body,
        id: parseInt(generateId().replace(/_/g, "")),
        userId: user.id,
        createdAt: new Date().toISOString(),
        status: "주문접수"
      };

      // 전체 주문 목록에 추가
      const allOrders = await kvGet("orders_list") || [];
      allOrders.push(newOrder);
      await kvSet("orders_list", allOrders);

      // 사용자별 주문에 추가
      const userOrders = await kvGet(`orders_user_${user.id}`) || [];
      userOrders.push(newOrder);
      await kvSet(`orders_user_${user.id}`, userOrders);

      return new Response(
        JSON.stringify({ success: true, order: newOrder }),
        { status: 201, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ORDERS: 사용자 주문 조회 ====================
    if (p === "/api/orders/my" && m === "GET") {
      const { user, error } = await auth(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const orders = await kvGet(`orders_user_${user.id}`) || [];
      return new Response(JSON.stringify({ orders }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== ORDERS: 전체 주문 조회 (관리자) ====================
    if (p === "/api/admin/orders" && m === "GET") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const orders = await kvGet("orders_list") || [];
      return new Response(JSON.stringify({ orders }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== ORDERS: 주문 상태 변경 (관리자) ====================
    if (p.match(/^\/api\/orders\/\d+\/status$/) && m === "PUT") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

      const orderId = parseInt(p.split("/")[3]);
      const body = await req.json();
      
      const allOrders = await kvGet("orders_list") || [];
      const orderIndex = allOrders.findIndex((o: any) => o.id === orderId);
      
      if (orderIndex === -1) {
        return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
      }

      allOrders[orderIndex].status = body.status;
      allOrders[orderIndex].updatedAt = new Date().toISOString();
      await kvSet("orders_list", allOrders);

      // 사용자별 주문도 업데이트
      const userId = allOrders[orderIndex].userId;
      const userOrders = await kvGet(`orders_user_${userId}`) || [];
      const userOrderIndex = userOrders.findIndex((o: any) => o.id === orderId);
      if (userOrderIndex !== -1) {
        userOrders[userOrderIndex] = allOrders[orderIndex];
        await kvSet(`orders_user_${userId}`, userOrders);
      }

      return new Response(
        JSON.stringify({ success: true, order: allOrders[orderIndex] }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ==================== ADMIN: 사용자 목록 조회 ====================
    if (p === "/api/admin/users" && m === "GET") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      
      const { data: { users } } = await supabase().auth.admin.listUsers();
      // ✅ app_metadata.role로 필터링
      const cs = await Promise.all(users.filter(u => u.app_metadata?.role !== "admin").map(async u => {
        const b = await kvGet(`blocked_user_${u.id}`);
        return { 
          id: u.id, 
          email: u.email, 
          name: u.user_metadata?.name || "Unknown", 
          phone: u.user_metadata?.phone || "", 
          createdAt: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "", 
          role: u.app_metadata?.role || "customer", // ✅ app_metadata.role
          isBlocked: b?.isBlocked || false 
        };
      }));
      return new Response(JSON.stringify({ users: cs }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== ADMIN: 사용자 차단/해제 ====================
    if (p.match(/^\/api\/admin\/users\/[^/]+\/block$/) && (m === "POST" || m === "PUT")) {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      
      const uid = p.split("/")[4];
      const body = await req.json();
      const blk = body.block !== undefined ? body.block : body.isBlocked;
      
      if (blk) {
        await kvSet(`blocked_user_${uid}`, { isBlocked: true, blockedAt: new Date().toISOString(), blockedBy: user.id });
        return new Response(JSON.stringify({ success: true, message: "Blocked" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      } else {
        await kvDel(`blocked_user_${uid}`);
        return new Response(JSON.stringify({ success: true, message: "Unblocked" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    // ==================== ADMIN: 관리자 목록 조회 ====================
    if (p === "/api/admin/admins" && m === "GET") {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      
      const { data: { users } } = await supabase().auth.admin.listUsers();
      // ✅ app_metadata.role로 필터링
      const admins = await Promise.all(users.filter(u => u.app_metadata?.role === "admin").map(async u => {
        const b = await kvGet(`blocked_admin_${u.id}`);
        return { 
          id: u.id, 
          email: u.email, 
          name: u.user_metadata?.name || "Unknown", 
          phone: u.user_metadata?.phone || "", 
          createdAt: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "", 
          role: "admin",
          isBlocked: b?.isBlocked || false 
        };
      }));
      return new Response(JSON.stringify({ admins }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ==================== ADMIN: 관리자 차단/해제 ====================
    if (p.match(/^\/api\/admin\/admins\/[^/]+\/block$/) && (m === "POST" || m === "PUT")) {
      const { user, error } = await admin(req.headers.get("Authorization"));
      if (error) return new Response(JSON.stringify({ error }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      
      const uid = p.split("/")[4];
      const body = await req.json();
      const blk = body.block !== undefined ? body.block : body.isBlocked;
      
      if (blk) {
        await kvSet(`blocked_admin_${uid}`, { isBlocked: true, blockedAt: new Date().toISOString(), blockedBy: user.id });
        return new Response(JSON.stringify({ success: true, message: "Admin blocked" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      } else {
        await kvDel(`blocked_admin_${uid}`);
        return new Response(JSON.stringify({ success: true, message: "Admin unblocked" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Server error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});