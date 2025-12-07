// ============================================
// PostgreSQL 버전 - KV Store 대신 Supabase Database 사용
// ============================================

import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Supabase 클라이언트 초기화
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 날짜 포맷팅 함수: 2025. 12. 6. 18:06:33
const formatDateTime = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${year}. ${month}. ${day}. ${hours}:${mins}:${secs}`;
};

const app = new Hono();

// CORS 설정
app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/*", logger());

// ============================================
// JWT 검증 미들웨어
// ============================================
const verifyJWT = async (c: any, next: any) => {
  // 🔥 인증 없이 접근 가능한 공개 경로
  const publicPaths = [
    "/shop-api/api/products", // 상품 목록/상세
    "/shop-api/api/reviews/", // 리뷰 조회
    "/shop-api/health",
    "/shop-api/api/health",
    "/shop-api/api/auth/", // 인증 관련 (회원가입, 로그인 시도 체크 등)
  ];

  const path = c.req.path;
  const method = c.req.method;

  // GET 요청이고 공개 경로인 경우 인증 스킵
  if (method === "GET" && publicPaths.some((p) => path.startsWith(p))) {
    return await next();
  }

  // POST 요청 중 인증 관련 경로는 스킵 (단, record-login-ip는 인증 필요)
  if (
    method === "POST" &&
    path.startsWith("/shop-api/api/auth/") &&
    !path.includes("record-login-ip")
  ) {
    return await next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: "Invalid token" }, 401);
    }

    // 유저 차단 확인
    if (user.app_metadata?.blocked === true) {
      return c.json(
        {
          error: "차단된 계정입니다. 고객센터로 문의해주세요.",
          blocked: true,
        },
        403
      );
    }

    c.set("userId", user.id);
    c.set("userEmail", user.email);
    c.set("userRole", user.app_metadata?.role || "customer");

    await next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
};

// ============================================
// 인증 API (회원가입, 중복 확인, 로그인 시도 제한)
// ============================================

// 이메일 중복 확인
app.post("/shop-api/api/auth/check-email", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "이메일을 입력해주세요." }, 400);
    }

    // Supabase Admin API로 이메일 중복 확인
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("List users error:", error);
      return c.json({ exists: false });
    }

    const exists = data.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
      return c.json({ exists: true, message: "이미 사용 중인 이메일입니다." });
    }

    return c.json({ exists: false });
  } catch (error) {
    console.error("Check email error:", error);
    return c.json({ error: "이메일 확인에 실패했습니다." }, 500);
  }
});

// 전화번호 중복 확인
app.post("/shop-api/api/auth/check-phone", async (c) => {
  try {
    const body = await c.req.json();
    const { phone } = body;

    if (!phone) {
      return c.json({ error: "전화번호를 입력해주세요." }, 400);
    }

    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = phone.replace(/-/g, "");

    // Supabase Admin API로 사용자 목록에서 전화번호 확인
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("List users error:", error);
      return c.json({ exists: false });
    }

    const exists = data.users.some((user) => {
      const userPhone = user.user_metadata?.phone?.replace(/-/g, "") || "";
      return userPhone === normalizedPhone;
    });

    if (exists) {
      return c.json({
        exists: true,
        message: "이미 사용 중인 전화번호입니다.",
      });
    }

    return c.json({ exists: false });
  } catch (error) {
    console.error("Check phone error:", error);
    return c.json({ error: "전화번호 확인에 실패했습니다." }, 500);
  }
});

// 회원가입
app.post("/shop-api/api/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, phone, birthDate } = body;

    // 유효성 검증
    if (!email || !password || !name) {
      return c.json({ error: "이메일, 비밀번호, 이름은 필수입니다." }, 400);
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "유효하지 않은 이메일 형식입니다." }, 400);
    }

    // 비밀번호 강도 검증
    if (password.length < 8) {
      return c.json({ error: "비밀번호는 최소 8자 이상이어야 합니다." }, 400);
    }

    // 이메일 중복 확인
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return c.json({ error: "이미 사용 중인 이메일입니다." }, 400);
    }

    // 전화번호 중복 확인 (전화번호가 제공된 경우)
    if (phone) {
      const normalizedPhone = phone.replace(/-/g, "");
      const phoneExists = existingUsers?.users.some((user) => {
        const userPhone = user.user_metadata?.phone?.replace(/-/g, "") || "";
        return userPhone === normalizedPhone;
      });
      if (phoneExists) {
        return c.json({ error: "이미 사용 중인 전화번호입니다." }, 400);
      }
    }

    // 🔥 클라이언트 IP 가져오기
    const clientIp =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-real-ip") ||
      "unknown";

    // Supabase Auth로 회원가입
    const { data: signUpData, error: signUpError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 이메일 확인 자동 완료
        user_metadata: {
          name,
          phone: phone || null,
          birthDate: birthDate || null,
        },
        app_metadata: {
          role: "customer", // 기본 역할
          signup_ip: clientIp, // 🔥 가입 IP 저장
        },
      });

    if (signUpError) {
      console.error("Signup error:", signUpError);
      if (signUpError.message.includes("already registered")) {
        return c.json({ error: "이미 가입된 이메일입니다." }, 400);
      }
      return c.json({ error: signUpError.message }, 400);
    }

    // 🔥 user_accounts 테이블에 데이터 삽입 (signup_ip 포함)
    const { error: insertError } = await supabase.from("user_accounts").insert({
      id: signUpData.user.id,
      email: signUpData.user.email || email,
      name: name,
      phone: phone || null,
      signup_ip: clientIp,
    });

    if (insertError) {
      console.error("user_accounts insert error:", insertError);
      // 실패해도 회원가입은 성공한 것으로 처리 (auth.users에는 생성됨)
    }

    return c.json({
      success: true,
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: signUpData.user.user_metadata?.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "회원가입에 실패했습니다." }, 500);
  }
});

// 로그인 시도 확인 (Brute Force 방어)
app.post("/shop-api/api/auth/check-login-attempts", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "이메일을 입력해주세요." }, 400);
    }

    const { data, error } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("Check login attempts error:", error);
      return c.json({ locked: false });
    }

    if (!data) {
      return c.json({ locked: false });
    }

    // 잠금 상태 확인
    if (data.locked_until && new Date(data.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(data.locked_until).getTime() - Date.now()) / 60000
      );
      return c.json({
        locked: true,
        message: `로그인 시도 횟수 초과. ${remainingMinutes}분 후 다시 시도해주세요.`,
      });
    }

    // 잠금 해제되었으면 초기화
    if (data.locked_until && new Date(data.locked_until) <= new Date()) {
      await supabase
        .from("login_attempts")
        .update({
          attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email.toLowerCase());
    }

    return c.json({ locked: false, attempts: data.attempts || 0 });
  } catch (error) {
    console.error("Check login attempts error:", error);
    return c.json({ locked: false });
  }
});

// 로그인 실패 기록
app.post("/shop-api/api/auth/record-login-failure", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "이메일을 입력해주세요." }, 400);
    }

    const emailLower = email.toLowerCase();
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION_MINUTES = 15;

    // 기존 기록 확인
    const { data: existing } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("email", emailLower)
      .single();

    if (existing) {
      const newAttempts = (existing.attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_ATTEMPTS;

      await supabase
        .from("login_attempts")
        .update({
          attempts: newAttempts,
          locked_until: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString()
            : existing.locked_until,
          updated_at: new Date().toISOString(),
        })
        .eq("email", emailLower);

      if (shouldLock) {
        return c.json({
          success: true,
          locked: true,
          message: `로그인 시도 횟수 초과. ${LOCK_DURATION_MINUTES}분 후 다시 시도해주세요.`,
        });
      }
    } else {
      // 새 기록 생성
      await supabase.from("login_attempts").insert({
        email: emailLower,
        attempts: 1,
      });
    }

    return c.json({ success: true, locked: false });
  } catch (error) {
    console.error("Record login failure error:", error);
    return c.json({ error: "로그인 실패 기록에 실패했습니다." }, 500);
  }
});

// 로그인 시도 초기화 (로그인 성공 시)
app.post("/shop-api/api/auth/reset-login-attempts", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: "이메일을 입력해주세요." }, 400);
    }

    await supabase
      .from("login_attempts")
      .update({
        attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase());

    return c.json({ success: true });
  } catch (error) {
    console.error("Reset login attempts error:", error);
    return c.json({ error: "로그인 시도 초기화에 실패했습니다." }, 500);
  }
});

// ============================================
// 배송지 API (PostgreSQL)
// ============================================

// 배송지 조회
app.get("/shop-api/api/addresses", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");

    const { data: addresses, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 프론트엔드가 기대하는 형식으로 매핑
    const mappedAddresses = (addresses || []).map((addr: any) => ({
      id: addr.id,
      name: addr.name, // 배송지명
      recipient: addr.recipient, // 수령인
      phone: addr.phone,
      address: addr.address,
      detailAddress: addr.detail_address || "", // DB: detail_address → detailAddress
      postalCode: addr.postal_code, // DB: postal_code → postalCode
      isDefault: addr.is_default, // DB: is_default → isDefault
      type: addr.name?.includes("회사") ? "office" : "home",
    }));

    return c.json({ addresses: mappedAddresses });
  } catch (error) {
    console.error("Get addresses error:", error);
    return c.json({ error: "Failed to get addresses" }, 500);
  }
});

// 배송지 저장
app.post("/shop-api/api/addresses", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const {
      name, // 수령인 이름 (프론트엔드에서 recipient → name으로 매핑해서 전송)
      addressName, // 배송지명 (선택)
      phone,
      address,
      detailAddress,
      zipCode, // 우편번호
      isDefault,
    } = body;

    // 유효성 검증
    if (!name || name.length < 2 || name.length > 50) {
      return c.json({ error: "수령인 이름은 2~50자 사이여야 합니다" }, 400);
    }
    if (!phone || !/^[0-9-]{10,13}$/.test(phone)) {
      return c.json({ error: "올바른 전화번호 형식이 아닙니다" }, 400);
    }
    if (!address || address.length < 5 || address.length > 200) {
      return c.json({ error: "주소는 5~200자 사이여야 합니다" }, 400);
    }
    if (detailAddress && detailAddress.length > 100) {
      return c.json({ error: "상세주소는 최대 100자까지 가능합니다" }, 400);
    }
    if (!zipCode || !/^[0-9]{5}$/.test(zipCode)) {
      return c.json(
        { error: "올바른 우편번호 형식이 아닙니다 (5자리 숫자)" },
        400
      );
    }

    // 기본 배송지 설정 시 기존 기본 배송지 해제
    if (isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    // 새 배송지 추가 (DB 실제 컬럼명 사용)
    const { data: newAddress, error } = await supabase
      .from("addresses")
      .insert({
        user_id: userId,
        name: addressName?.trim() || "배송지", // 배송지명
        recipient: name.trim(), // 수령인
        phone: phone.trim(),
        address: address.trim(),
        detail_address: detailAddress?.trim() || "",
        postal_code: zipCode.trim(), // DB 컬럼명: postal_code
        is_default: isDefault || false,
      })
      .select()
      .single();

    if (error) throw error;

    // 🔥 기본 배송지 설정 시 user_accounts.default_address_id 업데이트
    if (isDefault && newAddress) {
      const { error: updateError } = await supabase
        .from("user_accounts")
        .update({ default_address_id: newAddress.id })
        .eq("id", userId);

      if (updateError) {
        console.error("default_address_id update error:", updateError);
      }
    }

    // 전체 배송지 목록 반환 (프론트엔드 형식으로 매핑)
    const { data: addresses } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });

    // 프론트엔드가 기대하는 형식으로 매핑
    const mappedAddresses = (addresses || []).map((addr: any) => ({
      id: addr.id,
      name: addr.name,
      recipient: addr.recipient,
      phone: addr.phone,
      address: addr.address,
      detailAddress: addr.detail_address || "",
      postalCode: addr.postal_code,
      isDefault: addr.is_default,
    }));

    const mappedNewAddress = {
      id: newAddress.id,
      name: newAddress.name,
      recipient: newAddress.recipient,
      phone: newAddress.phone,
      address: newAddress.address,
      detailAddress: newAddress.detail_address || "",
      postalCode: newAddress.postal_code,
      isDefault: newAddress.is_default,
    };

    return c.json({
      success: true,
      address: mappedNewAddress,
      addresses: mappedAddresses,
    });
  } catch (error) {
    console.error("Address save error:", error);
    return c.json({ error: "배송지 저장에 실패했습니다" }, 500);
  }
});

// 배송지 수정
app.put("/shop-api/api/addresses/:id", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const addressId = c.req.param("id");
    const body = await c.req.json();
    const {
      name, // 수령인 이름
      addressName, // 배송지명
      phone,
      address,
      detailAddress,
      zipCode,
      isDefault,
    } = body;

    // 유효성 검증
    if (name && (name.length < 2 || name.length > 50)) {
      return c.json({ error: "수령인 이름은 2~50자 사이여야 합니다" }, 400);
    }
    if (phone && !/^[0-9-]{10,13}$/.test(phone)) {
      return c.json({ error: "올바른 전화번호 형식이 아닙니다" }, 400);
    }
    if (address && (address.length < 5 || address.length > 200)) {
      return c.json({ error: "주소는 5~200자 사이여야 합니다" }, 400);
    }
    if (detailAddress && detailAddress.length > 100) {
      return c.json({ error: "상세주소는 최대 100자까지 가능합니다" }, 400);
    }
    if (zipCode && !/^[0-9]{5}$/.test(zipCode)) {
      return c.json({ error: "올바른 우편번호 형식이 아닙니다" }, 400);
    }

    // 기본 배송지 설정 시 기존 기본 배송지 해제
    if (isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    // 배송지 수정 (DB 실제 컬럼명 사용)
    const updateData: any = {};
    if (name) updateData.recipient = name.trim(); // DB: recipient
    if (addressName !== undefined) updateData.name = addressName.trim(); // DB: name (배송지명)
    if (phone) updateData.phone = phone.trim();
    if (address) updateData.address = address.trim();
    if (detailAddress !== undefined)
      updateData.detail_address = detailAddress.trim();
    if (zipCode) updateData.postal_code = zipCode.trim(); // DB: postal_code
    if (isDefault !== undefined) updateData.is_default = isDefault;
    updateData.updated_at = new Date().toISOString(); // 🔥 updated_at 추가

    const { error } = await supabase
      .from("addresses")
      .update(updateData)
      .eq("id", addressId)
      .eq("user_id", userId);

    if (error) throw error;

    // 🔥 기본 배송지 설정 시 user_accounts.default_address_id 업데이트
    if (isDefault) {
      const { error: updateError } = await supabase
        .from("user_accounts")
        .update({ default_address_id: Number(addressId) })
        .eq("id", userId);

      if (updateError) {
        console.error("default_address_id update error:", updateError);
      }
    }

    // 전체 배송지 목록 반환 (프론트엔드 형식으로 매핑)
    const { data: addresses } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });

    const mappedAddresses = (addresses || []).map((addr: any) => ({
      id: addr.id,
      name: addr.name,
      recipient: addr.recipient,
      phone: addr.phone,
      address: addr.address,
      detailAddress: addr.detail_address || "",
      postalCode: addr.postal_code,
      isDefault: addr.is_default,
      type: addr.name?.includes("회사") ? "office" : "home",
    }));

    return c.json({ success: true, addresses: mappedAddresses });
  } catch (error) {
    console.error("Address update error:", error);
    return c.json({ error: "배송지 수정에 실패했습니다" }, 500);
  }
});

// 배송지 삭제
app.delete("/shop-api/api/addresses/:id", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const addressId = c.req.param("id");

    // 🔥 삭제하려는 배송지가 기본 배송지인지 확인
    const { data: userAccount } = await supabase
      .from("user_accounts")
      .select("default_address_id")
      .eq("id", userId)
      .single();

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId);

    if (error) throw error;

    // 🔥 삭제한 배송지가 기본 배송지였다면 null로 설정
    if (userAccount?.default_address_id === Number(addressId)) {
      await supabase
        .from("user_accounts")
        .update({ default_address_id: null })
        .eq("id", userId);
    }

    // 전체 배송지 목록 반환 (프론트엔드 형식으로 매핑)
    const { data: addresses } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });

    const mappedAddresses = (addresses || []).map((addr: any) => ({
      id: addr.id,
      name: addr.name,
      recipient: addr.recipient,
      phone: addr.phone,
      address: addr.address,
      detailAddress: addr.detail_address || "",
      postalCode: addr.postal_code,
      isDefault: addr.is_default,
      type: addr.name?.includes("회사") ? "office" : "home",
    }));

    return c.json({ success: true, addresses: mappedAddresses });
  } catch (error) {
    console.error("Address delete error:", error);
    return c.json({ error: "배송지 삭제에 실패했습니다" }, 500);
  }
});

// ============================================
// 장바구니 API (PostgreSQL)
// ============================================

// 장바구니 조회
app.get("/shop-api/api/cart", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");

    const { data: cart, error } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 프론트엔드 필드명으로 매핑 (할인 정보 포함)
    const mappedCart = (cart || []).map((item: any) => {
      const price = item.price ?? 0;
      const originalPrice = item.original_price ?? price;
      const hasDiscount = originalPrice > price;
      const discount = hasDiscount
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

      return {
        id: item.id,
        productId: item.product_id,
        name: item.product_name || "상품명 없음",
        price: price,
        originalPrice: originalPrice,
        hasDiscount: hasDiscount,
        discount: discount,
        quantity: item.quantity ?? 1,
        image: item.image || "",
      };
    });

    return c.json({ cart: mappedCart });
  } catch (error) {
    console.error("Get cart error:", error);
    return c.json({ error: "Failed to get cart" }, 500);
  }
});

// 🔥 장바구니 저장 (RPC 사용 - 원자적 UPSERT)
app.post("/shop-api/api/cart", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { cart } = body;

    console.log(
      "[Cart Sync] User ID:",
      userId,
      "Cart Items:",
      cart?.length || 0
    );

    // 🔥 RPC 함수로 원자적 UPSERT/DELETE 수행
    const cartItemsJson = (cart || []).map((item: any) => ({
      product_id: item.productId || item.id,
      product_name: item.name,
      price: item.price,
      original_price: item.originalPrice || item.price,
      has_discount: item.hasDiscount || item.originalPrice > item.price,
      discount: item.discount || 0,
      quantity: item.quantity,
      image: item.image || "",
    }));

    const { data, error } = await supabase.rpc("sync_cart_items", {
      p_user_id: userId,
      p_cart_items: cartItemsJson,
    });

    if (error) {
      console.error("[Cart Sync RPC Error]:", error);
      throw error;
    }

    console.log("[Cart Sync Success]:", data);
    return c.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[Save cart error]:", error);
    return c.json(
      {
        error: "Failed to save cart",
        details: error?.message || String(error),
      },
      500
    );
  }
});

// 🔥 단일 아이템 빠른 추가 (RPC 사용 - 즉시 UPSERT)
app.post("/shop-api/api/cart/add", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { productId, name, price, originalPrice, quantity = 1, image } = body;

    if (!productId || !name || price === undefined) {
      return c.json({ error: "필수 정보가 누락되었습니다" }, 400);
    }

    console.log(
      "[Cart Add] User:",
      userId,
      "Product:",
      productId,
      "Qty:",
      quantity
    );

    // 🔥 RPC 함수로 빠른 UPSERT
    const { data, error } = await supabase.rpc("add_cart_item", {
      p_user_id: userId,
      p_product_id: productId,
      p_product_name: name,
      p_price: price,
      p_original_price: originalPrice || price,
      p_quantity: quantity,
      p_image: image || "",
    });

    if (error) {
      console.error("[Cart Add RPC Error]:", error);
      throw error;
    }

    console.log("[Cart Add Success]:", data);
    return c.json({ success: true, ...data });
  } catch (error: any) {
    console.error("[Add cart item error]:", error);
    return c.json(
      {
        error: "Failed to add cart item",
        details: error?.message || String(error),
      },
      500
    );
  }
});

// 장바구니 아이템 수량 업데이트
app.put("/shop-api/api/cart/:itemId", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const itemId = c.req.param("itemId");
    const body = await c.req.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return c.json({ error: "수량은 1개 이상이어야 합니다" }, 400);
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) throw error;

    // 업데이트된 장바구니 반환 (프론트엔드 필드명으로 매핑)
    const { data: cart } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", userId);

    const mappedCart = (cart || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      name: item.product_name || "상품명 없음",
      price: item.price ?? 0,
      quantity: item.quantity ?? 1,
      image: item.image || "",
    }));

    return c.json({ success: true, cart: mappedCart });
  } catch (error) {
    console.error("Cart update error:", error);
    return c.json({ error: "수량 변경에 실패했습니다" }, 500);
  }
});

// 🔥 장바구니 전체 비우기 (반드시 :itemId 보다 먼저 정의!)
app.delete("/shop-api/api/cart/clear", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");

    console.log("[Cart Clear] User:", userId);

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    console.log("[Cart Clear] Success");
    return c.json({ success: true, cart: [] });
  } catch (error) {
    console.error("Cart clear error:", error);
    return c.json({ error: "장바구니 비우기에 실패했습니다" }, 500);
  }
});

// 장바구니 아이템 삭제
app.delete("/shop-api/api/cart/:itemId", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const itemId = c.req.param("itemId");

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) throw error;

    // 업데이트된 장바구니 반환 (프론트엔드 필드명으로 매핑)
    const { data: cart } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", userId);

    const mappedCart = (cart || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      name: item.product_name || "상품명 없음",
      price: item.price ?? 0,
      quantity: item.quantity ?? 1,
      image: item.image || "",
    }));

    return c.json({ success: true, cart: mappedCart });
  } catch (error) {
    console.error("Cart delete error:", error);
    return c.json({ error: "상품 삭제에 실패했습니다" }, 500);
  }
});

// ============================================
// 주문 API (PostgreSQL)
// ============================================

// 주문 조회
app.get("/shop-api/api/orders", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 프론트엔드가 기대하는 형식으로 매핑
    const mappedOrders =
      orders?.map((order: any) => ({
        id: order.id || order.order_number,
        date: formatDateTime(order.created_at),
        totalAmount: order.total_amount ?? 0,
        status: order.status || "배송 준비 중",
        shippingStatus: order.status || "배송 준비 중",
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name || "상품 정보 없음",
          quantity: item.quantity ?? 1,
          price: item.price ?? 0,
          image: item.image || "",
        })),
        shippingAddress: {
          recipient: order.recipient || "",
          phone: order.phone || "",
          address: order.address || "",
          detailAddress: order.detail_address || "",
          postalCode: order.postal_code || "",
        },
      })) || [];

    return c.json({ orders: mappedOrders });
  } catch (error) {
    console.error("Get orders error:", error);
    return c.json({ error: "Failed to get orders" }, 500);
  }
});

// 주문 생성
app.post("/shop-api/api/orders", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { items, totalAmount, paymentMethod, shippingAddress } = body;

    // 주문 생성 (DB 실제 컬럼명 사용)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        recipient: shippingAddress.name || shippingAddress.recipient,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        detail_address: shippingAddress.detailAddress || "",
        postal_code: shippingAddress.postalCode,
        status: "배송 준비 중",
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 주문 상품 추가 (DB 실제 컬럼만 사용)
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId || item.id,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;
    }

    // 장바구니 비우기
    await supabase.from("cart_items").delete().eq("user_id", userId);

    // 프론트엔드 형식으로 매핑
    const mappedOrder = {
      id: order.id,
      date:
        formatDateTime(order.created_at) ||
        formatDateTime(new Date().toISOString()),
      totalAmount: order.total_amount ?? 0,
      status: order.status || "배송 준비 중",
      shippingAddress: {
        recipient: order.recipient || "",
        phone: order.phone || "",
        address: order.address || "",
        detailAddress: order.detail_address || "",
        postalCode: order.postal_code || "",
      },
    };

    return c.json({ success: true, order: mappedOrder });
  } catch (error) {
    console.error("Create order error:", error);
    return c.json({ error: "Failed to save order" }, 500);
  }
});

// ============================================
// 리뷰 API (PostgreSQL)
// ============================================

// 리뷰 조회
app.get("/shop-api/api/reviews/:productId", async (c) => {
  try {
    const productId = c.req.param("productId");
    const authHeader = c.req.header("Authorization");
    let userId = null;

    // 로그인한 사용자인 경우 userId 가져오기
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        userId = user?.id;
      } catch (error) {
        // 토큰이 유효하지 않아도 리뷰는 조회 가능
      }
    }

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 사용자의 helpful 상태 추가 + 프론트엔드 필드명 매핑
    let enrichedReviews: any[] = [];
    const helpfulSet = new Set<number>();

    if (userId) {
      const { data: helpfulData } = await supabase
        .from("review_helpful")
        .select("review_id")
        .eq("user_id", userId);
      helpfulData?.forEach((h: any) => helpfulSet.add(h.review_id));
    }

    enrichedReviews = (reviews || []).map((review: any) => ({
      id: review.id,
      productId: review.product_id,
      userId: review.user_id,
      author: review.author,
      rating: review.rating,
      content: review.content,
      date: formatDateTime(review.created_at),
      likes: review.likes || 0,
      helpful: review.likes || 0,
      helpfulCount: review.likes || 0,
      images: [], // DB에서 삭제됨, 빈 배열 반환
      isHelpful: helpfulSet.has(review.id),
    }));

    return c.json({ reviews: enrichedReviews });
  } catch (error) {
    console.error("Get reviews error:", error);
    return c.json({ error: "Failed to get reviews" }, 500);
  }
});

// 리뷰 저장
app.post("/shop-api/api/save-review", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { productId, rating, content } = body;

    // 유효성 검증
    if (!productId || !rating || !content) {
      return c.json({ error: "상품 ID, 평점, 내용은 필수입니다" }, 400);
    }
    if (rating < 1 || rating > 5) {
      return c.json({ error: "평점은 1~5 사이여야 합니다" }, 400);
    }
    if (content.length < 10) {
      return c.json({ error: "리뷰 내용은 최소 10자 이상이어야 합니다" }, 400);
    }
    if (content.length > 1000) {
      return c.json({ error: "리뷰 내용은 최대 1000자까지 가능합니다" }, 400);
    }

    // 사용자 정보 가져오기
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userName =
      userData?.user?.user_metadata?.name || userData?.user?.email || "익명";

    // 리뷰 저장
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        user_id: userId,
        product_id: Number(productId),
        author: userName,
        rating: Number(rating),
        content: content.trim(),
        likes: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ 상품의 평균 평점과 리뷰 수 업데이트
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", Number(productId));

    if (allReviews && allReviews.length > 0) {
      const avgRating =
        allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
        allReviews.length;

      await supabase
        .from("products")
        .update({
          rating: Math.round(avgRating * 10) / 10,
          review_count: allReviews.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", Number(productId));
    }

    // 프론트엔드 필드명으로 매핑하여 응답
    const mappedReview = {
      id: review.id,
      productId: review.product_id,
      userId: review.user_id,
      author: review.author,
      rating: review.rating,
      content: review.content,
      date: formatDateTime(review.created_at),
      likes: review.likes || 0,
      helpful: review.likes || 0,
      helpfulCount: review.likes || 0,
      images: [],
    };

    return c.json({ success: true, review: mappedReview });
  } catch (error) {
    console.error("Review save error:", error);
    return c.json({ error: "리뷰 저장에 실패했습니다" }, 500);
  }
});

// 리뷰 도움됨 토글
app.post("/shop-api/api/reviews/:reviewId/helpful", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const reviewIdStr = c.req.param("reviewId");
    const reviewId = Number(reviewIdStr);

    if (isNaN(reviewId)) {
      return c.json({ error: "유효하지 않은 리뷰 ID입니다" }, 400);
    }

    // 이미 도움됨 표시했는지 확인
    const { data: existing } = await supabase
      .from("review_helpful")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .maybeSingle();

    let isHelpful = false;

    if (existing) {
      // 도움됨 취소
      await supabase
        .from("review_helpful")
        .delete()
        .eq("review_id", reviewId)
        .eq("user_id", userId);

      // 리뷰 likes 감소
      await supabase.rpc("decrement_review_likes", { review_id: reviewId });
      isHelpful = false;
    } else {
      // 도움됨 추가
      await supabase.from("review_helpful").insert({
        review_id: reviewId,
        user_id: userId,
      });

      // 리뷰 likes 증가
      await supabase.rpc("increment_review_likes", { review_id: reviewId });
      isHelpful = true;
    }

    // 업데이트된 리뷰 정보 조회
    const { data: updatedReview, error: reviewError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (reviewError) {
      console.error("Failed to fetch updated review:", reviewError);
      // 에러가 나더라도 기본 응답 반환
      return c.json({
        success: true,
        isHelpful,
        review: {
          id: reviewId,
          helpfulCount: 0,
          likes: 0,
        },
      });
    }

    // 프론트엔드 필드명으로 매핑
    const mappedReview = {
      id: updatedReview.id,
      productId: updatedReview.product_id,
      userId: updatedReview.user_id,
      author: updatedReview.author,
      rating: updatedReview.rating,
      content: updatedReview.content,
      date: formatDateTime(updatedReview.created_at),
      likes: updatedReview.likes || 0,
      helpful: updatedReview.likes || 0,
      helpfulCount: updatedReview.likes || 0,
      images: [],
      isHelpful: isHelpful,
    };

    return c.json({
      success: true,
      isHelpful,
      review: mappedReview,
    });
  } catch (error) {
    console.error("Toggle helpful error:", error);
    return c.json({ error: "도움돼요 표시에 실패했습니다" }, 500);
  }
});

// 리뷰 삭제
app.delete("/shop-api/api/reviews/:reviewId", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const reviewIdStr = c.req.param("reviewId");
    const reviewId = Number(reviewIdStr);

    if (isNaN(reviewId)) {
      return c.json({ error: "유효하지 않은 리뷰 ID입니다" }, 400);
    }

    // 리뷰 존재 및 소유권 확인
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .single();

    if (fetchError || !review) {
      return c.json({ error: "리뷰를 찾을 수 없습니다" }, 404);
    }

    if (review.user_id !== userId) {
      return c.json({ error: "삭제 권한이 없습니다" }, 403);
    }

    const productId = review.product_id;

    // 🔥 리뷰 관련 review_helpful 데이터 먼저 삭제
    await supabase.from("review_helpful").delete().eq("review_id", reviewId);

    // 리뷰 삭제
    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (deleteError) throw deleteError;

    // ✅ 상품의 평균 평점과 리뷰 수 업데이트
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", productId);

    if (allReviews && allReviews.length > 0) {
      const avgRating =
        allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
        allReviews.length;

      await supabase
        .from("products")
        .update({
          rating: Math.round(avgRating * 10) / 10,
          review_count: allReviews.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    } else {
      // 리뷰가 없으면 rating null, review_count 0
      await supabase
        .from("products")
        .update({
          rating: null,
          review_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete review error:", error);
    return c.json({ error: "리뷰 삭제에 실패했습니다" }, 500);
  }
});

// ============================================
// 문의사항 API (PostgreSQL)
// ============================================

// 문의사항 조회 (내 문의)
app.get("/shop-api/api/inquiries/my", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");

    const { data: inquiries, error } = await supabase
      .from("inquiries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 프론트엔드 형식으로 매핑
    const mappedInquiries = (inquiries || []).map((inquiry: any) => ({
      id: inquiry.id,
      category: inquiry.category,
      status: inquiry.status,
      title: inquiry.title,
      content: inquiry.content,
      createdAt: inquiry.created_at,
      answer: inquiry.answer_content
        ? {
            content: inquiry.answer_content,
            answeredAt: inquiry.answered_at,
            answeredBy: inquiry.answered_by,
          }
        : null,
    }));

    return c.json({ inquiries: mappedInquiries });
  } catch (error) {
    console.error("Get inquiries error:", error);
    return c.json({ error: "문의사항 조회에 실패했습니다" }, 500);
  }
});

// 문의사항 저장
app.post("/shop-api/api/inquiries", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const { productId, type, title, content } = body;

    // 유효성 검증
    if (!type || !title || !content) {
      return c.json({ error: "유형, 제목, 내용은 필수입니다" }, 400);
    }
    if (title.length < 5 || title.length > 100) {
      return c.json({ error: "제목은 5~100자 사이여야 합니다" }, 400);
    }
    if (content.length < 10 || content.length > 1000) {
      return c.json({ error: "내용은 10~1000자 사이여야 합니다" }, 400);
    }

    // id는 자동 생성 (uuid)
    const { data: inquiry, error } = await supabase
      .from("inquiries")
      .insert({
        user_id: userId,
        category: type, // type → category 컬럼으로 매핑
        title: title.trim(),
        content: content.trim(),
        status: "대기", // 한글 status 값 사용
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, inquiry });
  } catch (error) {
    console.error("Save inquiry error:", error);
    return c.json({ error: "문의사항 저장에 실패했습니다" }, 500);
  }
});

// ============================================
// 상품 API (PostgreSQL)
// ============================================

// 상품 목록 조회 - 페이지네이션 및 필터링 지원
app.get("/shop-api/api/products", async (c) => {
  try {
    // 쿼리 파라미터
    const page = parseInt(c.req.query("page") || "0"); // 0이면 전체 로드 (기존 호환)
    const perPage = parseInt(c.req.query("perPage") || "20");
    const category = c.req.query("category") || "";
    const search = c.req.query("search") || "";
    const sortBy = c.req.query("sortBy") || "created_at";
    const sortOrder = c.req.query("sortOrder") || "desc";

    // 기본 쿼리
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    // 카테고리 필터링
    if (category && category !== "all") {
      if (category === "special-deals") {
        query = query.gt("discount", 0);
      } else {
        query = query.eq("category", category);
      }
    }

    // 검색 필터링
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // 정렬
    const ascending = sortOrder === "asc";
    if (sortBy === "price") {
      query = query.order("price", { ascending });
    } else if (sortBy === "rating") {
      query = query.order("rating", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // 페이지네이션 (page > 0일 때만 적용)
    if (page > 0) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data: products, error, count } = await query;

    if (error) throw error;

    // 프론트엔드가 기대하는 형식으로 매핑 (할인율 계산 포함)
    const mappedProducts = (products || []).map((p: any) => {
      const price = p.price ?? 0;
      const originalPrice = p.original_price ?? p.originalPrice ?? price;
      const hasDiscount = originalPrice > price;
      const discount = hasDiscount
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

      return {
        id: p.id,
        name: p.name || "상품명 없음",
        price: price,
        originalPrice: originalPrice,
        hasDiscount: hasDiscount,
        discount: discount,
        category: p.category || "uncategorized",
        description: p.description || "",
        images: p.images || [],
        specs: p.specs || [],
        rating: p.rating ?? 0,
        reviewCount: p.review_count ?? 0,
        isActive: p.is_active ?? true,
      };
    });

    // 페이지네이션 정보 포함 (page > 0일 때)
    if (page > 0) {
      return c.json({
        products: mappedProducts,
        pagination: {
          page,
          perPage,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / perPage),
          hasMore: (count || 0) > page * perPage,
        },
      });
    }

    return c.json({ products: mappedProducts });
  } catch (error) {
    console.error("Get products error:", error);
    return c.json({ error: "Failed to get products" }, 500);
  }
});

// 상품 상세 조회
app.get("/shop-api/api/products/:id", async (c) => {
  try {
    const productId = c.req.param("id");

    const { data: p, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return c.json({ error: "상품을 찾을 수 없습니다" }, 404);
      }
      throw error;
    }

    // 프론트엔드가 기대하는 형식으로 매핑
    const price = p.price ?? 0;
    const originalPrice = p.original_price ?? p.originalPrice ?? price;
    const hasDiscount = originalPrice > price;
    const discount = hasDiscount
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

    const product = {
      id: p.id,
      name: p.name || "상품명 없음",
      price: price,
      originalPrice: originalPrice,
      hasDiscount: hasDiscount,
      discount: discount,
      category: p.category || "uncategorized",
      description: p.description || "",
      images: p.images || [],
      specs: p.specs || [],
      rating: p.rating ?? 0,
      reviewCount: p.review_count ?? 0,
      isActive: p.is_active ?? true,
    };

    return c.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    return c.json({ error: "Failed to get product" }, 500);
  }
});

// 상품 생성 (관리자용)
app.post("/shop-api/api/products", verifyJWT, async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      price,
      originalPrice,
      description,
      category,
      images,
      specs,
      discount,
    } = body;

    if (!name || !price || !category) {
      return c.json({ error: "상품명, 가격, 카테고리는 필수입니다" }, 400);
    }

    // 다음 ID 가져오기 (products 테이블의 최대 id + 1)
    const { data: maxIdResult } = await supabase
      .from("products")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    const nextId = (maxIdResult?.id || 0) + 1;

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        id: nextId,
        name,
        price,
        original_price: originalPrice || price,
        description: description || "",
        category,
        images: images || [],
        specs: specs || [],
        discount: discount || 0,
        rating: null,
        review_count: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return c.json({ error: `상품 생성 실패: ${error.message}` }, 500);
    }

    return c.json({ success: true, product });
  } catch (error: any) {
    console.error("Create product error:", error);
    return c.json(
      { error: `상품 생성에 실패했습니다: ${error?.message || error}` },
      500
    );
  }
});

// 상품 수정 (관리자용)
app.put("/shop-api/api/products/:id", verifyJWT, async (c) => {
  try {
    const productId = c.req.param("id");
    const body = await c.req.json();

    // 프론트엔드 필드명을 DB 컬럼명으로 매핑
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.originalPrice !== undefined)
      updateData.original_price = body.originalPrice;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.specs !== undefined) updateData.specs = body.specs;
    if (body.discount !== undefined) updateData.discount = body.discount;
    if (body.hasDiscount !== undefined)
      updateData.has_discount = body.hasDiscount;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.reviewCount !== undefined)
      updateData.review_count = body.reviewCount;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    // 🔥 updated_at 추가
    updateData.updated_at = new Date().toISOString();

    const { data: product, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, product });
  } catch (error) {
    console.error("Update product error:", error);
    return c.json({ error: "상품 수정에 실패했습니다" }, 500);
  }
});

// 상품 삭제 (관리자용)
app.delete("/shop-api/api/products/:id", verifyJWT, async (c) => {
  try {
    const productId = c.req.param("id");
    const productIdNum = Number(productId);

    // 🔥 1. 해당 상품의 리뷰에 대한 review_helpful 삭제
    const { data: reviews } = await supabase
      .from("reviews")
      .select("id")
      .eq("product_id", productIdNum);

    if (reviews && reviews.length > 0) {
      const reviewIds = reviews.map((r: any) => r.id);
      await supabase.from("review_helpful").delete().in("review_id", reviewIds);
    }

    // 🔥 2. 해당 상품의 리뷰 삭제
    await supabase.from("reviews").delete().eq("product_id", productIdNum);

    // 🔥 3. 장바구니에서 해당 상품 삭제
    await supabase.from("cart_items").delete().eq("product_id", productIdNum);

    // 4. 상품 삭제
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productIdNum);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return c.json({ error: "상품 삭제에 실패했습니다" }, 500);
  }
});

// ============================================
// 관리자 API (PostgreSQL)
// ============================================

// 관리자 권한 확인 미들웨어
const verifyAdmin = async (c: any, next: any) => {
  const userId = c.get("userId");

  try {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const role = userData?.user?.app_metadata?.role;

    if (role !== "admin" && role !== "superadmin") {
      return c.json({ error: "관리자 권한이 필요합니다" }, 403);
    }

    c.set("userRole", role);
    await next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return c.json({ error: "권한 확인 실패" }, 500);
  }
};

// 사용자 목록 조회 (관리자용) - 페이지네이션 지원
app.get("/shop-api/api/admin/users", verifyJWT, async (c) => {
  try {
    // 쿼리 파라미터로 페이지네이션 (옵셔널, 기존 호환성 유지)
    const page = parseInt(c.req.query("page") || "1");
    const perPage = parseInt(c.req.query("perPage") || "1000"); // 기본값 큰 수 (전체)
    const search = c.req.query("search") || "";

    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage,
    });

    if (error) throw error;

    let users = data.users
      .filter(
        (user: any) =>
          user.app_metadata?.role !== "admin" &&
          user.app_metadata?.role !== "superadmin"
      )
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || "이름 없음",
        phone: user.user_metadata?.phone || null,
        role: user.app_metadata?.role || "customer",
        isBlocked: user.app_metadata?.blocked === true,
        blocked: user.app_metadata?.blocked === true,
        blockedAt: user.app_metadata?.blocked_at || null,
        createdAt: formatDateTime(user.created_at),
        rawCreatedAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        signupIp: user.app_metadata?.signup_ip || null,
        lastLoginIp: user.app_metadata?.last_login_ip || null,
      }));

    // 검색어가 있으면 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (u: any) =>
          u.email?.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower) ||
          u.phone?.includes(search)
      );
    }

    // user_accounts에서 총 개수 가져오기 (더 정확한 카운트)
    const { count: totalCount } = await supabase
      .from("user_accounts")
      .select("*", { count: "exact", head: true });

    return c.json({
      users,
      pagination: {
        page,
        perPage,
        total: totalCount || users.length,
        totalPages: Math.ceil((totalCount || users.length) / perPage),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return c.json({ error: "사용자 목록 조회에 실패했습니다" }, 500);
  }
});

// 관리자 목록 조회 - 페이지네이션 지원
app.get("/shop-api/api/admin/admins", verifyJWT, async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const perPage = parseInt(c.req.query("perPage") || "1000");
    const search = c.req.query("search") || "";

    const { data, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage,
    });

    if (error) throw error;

    let admins = data.users
      .filter(
        (user: any) =>
          user.app_metadata?.role === "admin" ||
          user.app_metadata?.role === "superadmin"
      )
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || "이름 없음",
        role: user.app_metadata?.role,
        isBlocked: user.app_metadata?.blocked === true,
        blocked: user.app_metadata?.blocked === true,
        blockedAt: user.app_metadata?.blocked_at || null,
        createdAt: formatDateTime(user.created_at),
        rawCreatedAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        signupIp: user.app_metadata?.signup_ip || null,
        lastLoginIp: user.app_metadata?.last_login_ip || null,
      }));

    // 검색어가 있으면 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      admins = admins.filter(
        (a: any) =>
          a.email?.toLowerCase().includes(searchLower) ||
          a.name?.toLowerCase().includes(searchLower)
      );
    }

    // admin_accounts에서 총 개수
    const { count: totalCount } = await supabase
      .from("admin_accounts")
      .select("*", { count: "exact", head: true });

    return c.json({
      admins,
      pagination: {
        page,
        perPage,
        total: totalCount || admins.length,
        totalPages: Math.ceil((totalCount || admins.length) / perPage),
      },
    });
  } catch (error) {
    console.error("Get admins error:", error);
    return c.json({ error: "관리자 목록 조회에 실패했습니다" }, 500);
  }
});

// 전체 주문 조회 (관리자용) - 페이지네이션 지원
app.get("/shop-api/api/admin/orders", verifyJWT, async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const perPage = parseInt(c.req.query("perPage") || "1000");
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "";

    // 총 개수 먼저 가져오기
    let countQuery = supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    const { count: totalCount } = await countQuery;

    // 페이지네이션 적용된 데이터 가져오기
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*)
      `
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // 프론트엔드가 기대하는 형식으로 매핑
    let mappedOrders = (orders || []).map((order: any) => ({
      id: order.id || order.order_number,
      date: formatDateTime(order.created_at),
      rawCreatedAt: order.created_at,
      totalAmount: order.total_amount ?? 0,
      status: order.status || "배송 준비 중",
      shippingStatus: order.status || "배송 준비 중",
      items: (order.order_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        name: item.product_name || "상품 정보 없음",
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        image: item.image || "",
      })),
      shippingAddress: {
        recipient: order.recipient || "",
        phone: order.phone || "",
        address: order.address || "",
        detailAddress: order.detail_address || "",
        postalCode: order.postal_code || "",
      },
    }));

    // 검색어가 있으면 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      mappedOrders = mappedOrders.filter(
        (o: any) =>
          o.id?.toLowerCase().includes(searchLower) ||
          o.shippingAddress?.recipient?.toLowerCase().includes(searchLower) ||
          o.shippingAddress?.phone?.includes(search) ||
          o.shippingAddress?.address?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({
      orders: mappedOrders,
      pagination: {
        page,
        perPage,
        total: totalCount || mappedOrders.length,
        totalPages: Math.ceil((totalCount || mappedOrders.length) / perPage),
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    return c.json({ error: "주문 목록 조회에 실패했습니다" }, 500);
  }
});

// 전체 문의사항 조회 (관리자용) - 페이지네이션 지원
app.get("/shop-api/api/admin/inquiries", verifyJWT, async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const perPage = parseInt(c.req.query("perPage") || "1000");
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "";

    // 각 상태별 총 개수 가져오기 (필터와 무관하게)
    const [allCountResult, pendingCountResult, answeredCountResult] =
      await Promise.all([
        supabase.from("inquiries").select("*", { count: "exact", head: true }),
        supabase
          .from("inquiries")
          .select("*", { count: "exact", head: true })
          .eq("status", "대기"),
        supabase
          .from("inquiries")
          .select("*", { count: "exact", head: true })
          .eq("status", "답변완료"),
      ]);

    const allCount = allCountResult.count || 0;
    const pendingCount = pendingCountResult.count || 0;
    const answeredCount = answeredCountResult.count || 0;

    // 현재 필터에 맞는 총 개수
    let countQuery = supabase
      .from("inquiries")
      .select("*", { count: "exact", head: true });

    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    const { count: totalCount } = await countQuery;

    // 페이지네이션 적용된 데이터 가져오기
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: inquiries, error } = await query;

    if (error) throw error;

    // 사용자 정보 가져오기
    const userIds = [...new Set((inquiries || []).map((i: any) => i.user_id))];
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const usersMap = new Map(
      usersData?.users?.map((u: any) => [
        u.id,
        u.user_metadata?.name || u.email || "익명",
      ]) || []
    );

    // 프론트엔드 형식으로 매핑
    let mappedInquiries = (inquiries || []).map((inquiry: any) => ({
      id: inquiry.id,
      category: inquiry.category,
      status: inquiry.status,
      title: inquiry.title,
      content: inquiry.content,
      userName: usersMap.get(inquiry.user_id) || "익명",
      createdAt: inquiry.created_at,
      answer: inquiry.answer_content
        ? {
            content: inquiry.answer_content,
            answeredAt: inquiry.answered_at,
            answeredBy: inquiry.answered_by,
          }
        : null,
    }));

    // 검색어가 있으면 필터링 (문의번호, 제목, 내용, 작성자명, 카테고리)
    if (search) {
      const searchLower = search.toLowerCase();
      mappedInquiries = mappedInquiries.filter(
        (i: any) =>
          i.id?.toLowerCase().includes(searchLower) ||
          i.title?.toLowerCase().includes(searchLower) ||
          i.content?.toLowerCase().includes(searchLower) ||
          i.userName?.toLowerCase().includes(searchLower) ||
          i.category?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({
      inquiries: mappedInquiries,
      pagination: {
        page,
        perPage,
        total: totalCount || mappedInquiries.length,
        totalPages: Math.ceil((totalCount || mappedInquiries.length) / perPage),
      },
      counts: {
        all: allCount,
        pending: pendingCount,
        answered: answeredCount,
      },
    });
  } catch (error) {
    console.error("Get all inquiries error:", error);
    return c.json({ error: "문의사항 목록 조회에 실패했습니다" }, 500);
  }
});

// 문의사항 답변 핸들러 함수
const handleInquiryAnswer = async (c: any) => {
  try {
    const userId = c.get("userId");
    const userEmail = c.get("userEmail");
    const inquiryId = c.req.param("id");
    const body = await c.req.json();
    const { answer } = body;

    if (!answer) {
      return c.json({ error: "답변 내용을 입력해주세요" }, 400);
    }

    if (answer.length < 5) {
      return c.json({ error: "답변은 최소 5자 이상이어야 합니다" }, 400);
    }

    // 관리자 이메일 가져오기
    let adminEmail = userEmail;
    if (!adminEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      adminEmail = userData?.user?.email || "관리자";
    }

    const answeredAt = new Date().toISOString();

    const { data: inquiry, error } = await supabase
      .from("inquiries")
      .update({
        answer_content: answer.trim(),
        answered_at: answeredAt,
        answered_by: adminEmail,
        status: "답변완료",
        updated_at: answeredAt,
      })
      .eq("id", inquiryId)
      .select()
      .single();

    if (error) throw error;

    // 프론트엔드 형식으로 매핑
    const mappedInquiry = {
      id: inquiry.id,
      category: inquiry.category,
      status: inquiry.status,
      title: inquiry.title,
      content: inquiry.content,
      createdAt: inquiry.created_at,
      answer: {
        content: answer.trim(),
        answeredAt: answeredAt,
        answeredBy: adminEmail,
      },
    };

    return c.json({ success: true, inquiry: mappedInquiry });
  } catch (error) {
    console.error("Answer inquiry error:", error);
    return c.json({ error: "답변 저장에 실패했습니다" }, 500);
  }
};

// 문의사항 답변 (관리자용) - POST와 PUT 둘 다 지원
app.post("/shop-api/api/inquiries/:id/answer", verifyJWT, handleInquiryAnswer);
app.put("/shop-api/api/inquiries/:id/answer", verifyJWT, handleInquiryAnswer);

// 사용자 차단/해제 (관리자용)
app.post("/shop-api/api/admin/users/:userId/block", verifyJWT, async (c) => {
  try {
    const targetUserId = c.req.param("userId");
    const body = await c.req.json();
    // 프론트엔드에서 block 또는 blocked 필드로 보낼 수 있음
    const blocked = body.blocked ?? body.block ?? false;
    const blockedAt = blocked ? new Date().toISOString() : null;

    console.log("[Block User] Target:", targetUserId, "Blocked:", blocked);

    // Auth 메타데이터 업데이트
    const { data, error } = await supabase.auth.admin.updateUserById(
      targetUserId,
      {
        app_metadata: { blocked: blocked, blocked_at: blockedAt },
      }
    );

    if (error) {
      console.error("[Block User Error]:", error);
      throw error;
    }

    // user_accounts 테이블도 업데이트
    await supabase.from("user_accounts").upsert(
      {
        id: targetUserId,
        email: data.user?.email || "",
        name: data.user?.user_metadata?.name || "",
        phone: data.user?.user_metadata?.phone || null,
        is_blocked: blocked,
        blocked_at: blockedAt,
      },
      { onConflict: "id" }
    );

    console.log("[Block User Success]:", data.user?.app_metadata);

    return c.json({
      success: true,
      blocked,
      blockedAt,
      user: data.user,
    });
  } catch (error) {
    console.error("Block user error:", error);
    return c.json({ error: "사용자 차단/해제에 실패했습니다" }, 500);
  }
});

// 관리자 차단/해제
app.post("/shop-api/api/admin/admins/:adminId/block", verifyJWT, async (c) => {
  try {
    const targetAdminId = c.req.param("adminId");
    const body = await c.req.json();
    // 프론트엔드에서 block 또는 blocked 필드로 보낼 수 있음
    const blocked = body.blocked ?? body.block ?? false;
    const blockedAt = blocked ? new Date().toISOString() : null;

    console.log("[Block Admin] Target:", targetAdminId, "Blocked:", blocked);

    // Auth 메타데이터 업데이트
    const { data, error } = await supabase.auth.admin.updateUserById(
      targetAdminId,
      {
        app_metadata: { blocked: blocked, blocked_at: blockedAt },
      }
    );

    if (error) {
      console.error("[Block Admin Error]:", error);
      throw error;
    }

    // admin_accounts 테이블도 업데이트
    await supabase.from("admin_accounts").upsert(
      {
        id: targetAdminId,
        email: data.user?.email || "",
        name: data.user?.user_metadata?.name || "",
        is_blocked: blocked,
        blocked_at: blockedAt,
      },
      { onConflict: "id" }
    );

    console.log("[Block Admin Success]:", data.user?.app_metadata);

    return c.json({
      success: true,
      blocked,
      blockedAt,
      user: data.user,
    });
  } catch (error) {
    console.error("Block admin error:", error);
    return c.json({ error: "관리자 차단/해제에 실패했습니다" }, 500);
  }
});

// 관리자 생성
app.post("/shop-api/api/create-admin", verifyJWT, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return c.json({ error: "이메일, 비밀번호, 이름은 필수입니다" }, 400);
    }

    // 🔥 클라이언트 IP 가져오기
    const clientIp =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-real-ip") ||
      "unknown";

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { role: "admin", signup_ip: clientIp },
    });

    if (error) throw error;

    // 🔥 생성한 관리자 정보 가져오기
    const creatorEmail = c.get("userEmail") || "system";

    // 🔥 admin_accounts 테이블에 데이터 삽입 (생성자 정보 포함)
    const { error: insertError } = await supabase
      .from("admin_accounts")
      .insert({
        id: data.user.id,
        email: data.user.email || email,
        name: name,
        signup_ip: clientIp,
        created_by_email: creatorEmail,
        created_by_ip: clientIp,
      });

    if (insertError) {
      console.error("admin_accounts insert error:", insertError);
    }

    return c.json({ success: true, admin: data.user });
  } catch (error) {
    console.error("Create admin error:", error);
    return c.json({ error: "관리자 생성에 실패했습니다" }, 500);
  }
});

// 관리자 삭제
app.delete("/shop-api/api/admin/admins/:adminId", verifyJWT, async (c) => {
  try {
    const targetAdminId = c.req.param("adminId");

    console.log("[Delete Admin] Target:", targetAdminId);

    // 🔥 admin_accounts 테이블에서 먼저 삭제
    const { error: tableError } = await supabase
      .from("admin_accounts")
      .delete()
      .eq("id", targetAdminId);

    if (tableError) {
      console.error("[Delete Admin] Table delete error:", tableError);
    }

    // auth.users에서 삭제
    const { error } = await supabase.auth.admin.deleteUser(targetAdminId);

    if (error) {
      console.error("[Delete Admin Error]:", error);
      throw error;
    }

    console.log("[Delete Admin Success]");

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete admin error:", error);
    return c.json({ error: "관리자 삭제에 실패했습니다" }, 500);
  }
});

// 사용자 비밀번호 변경 (관리자용)
app.post("/shop-api/api/admin/users/:userId/password", verifyJWT, async (c) => {
  try {
    const targetUserId = c.req.param("userId");
    const body = await c.req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return c.json({ error: "비밀번호는 8자 이상이어야 합니다" }, 400);
    }

    // 비밀번호 규칙 검증: 대문자, 소문자, 숫자 포함
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return c.json(
        { error: "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다" },
        400
      );
    }

    console.log("[Change User Password] Target:", targetUserId);

    // 비밀번호 변경
    const { data, error } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (error) {
      console.error("[Change User Password Error]:", error);
      throw error;
    }

    // 해당 유저의 모든 세션 삭제 (로그아웃 강제)
    // Supabase Admin API에서는 직접 세션 삭제가 어려우므로,
    // app_metadata에 password_changed_at을 저장하여 클라이언트에서 확인
    await supabase.auth.admin.updateUserById(targetUserId, {
      app_metadata: {
        ...data.user?.app_metadata,
        password_changed_at: new Date().toISOString(),
        force_logout: true,
      },
    });

    console.log("[Change User Password Success]");

    return c.json({
      success: true,
      message:
        "비밀번호가 변경되었습니다. 해당 사용자는 재로그인이 필요합니다.",
    });
  } catch (error) {
    console.error("Change user password error:", error);
    return c.json({ error: "비밀번호 변경에 실패했습니다" }, 500);
  }
});

// 관리자 비밀번호 변경 (관리자용)
app.post(
  "/shop-api/api/admin/admins/:adminId/password",
  verifyJWT,
  async (c) => {
    try {
      const targetAdminId = c.req.param("adminId");
      const body = await c.req.json();
      const { newPassword } = body;

      if (!newPassword || newPassword.length < 8) {
        return c.json({ error: "비밀번호는 8자 이상이어야 합니다" }, 400);
      }

      // 비밀번호 규칙 검증: 대문자, 소문자, 숫자 포함
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        return c.json(
          { error: "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다" },
          400
        );
      }

      console.log("[Change Admin Password] Target:", targetAdminId);

      // 비밀번호 변경
      const { data, error } = await supabase.auth.admin.updateUserById(
        targetAdminId,
        { password: newPassword }
      );

      if (error) {
        console.error("[Change Admin Password Error]:", error);
        throw error;
      }

      // 해당 관리자의 모든 세션 삭제 (로그아웃 강제)
      await supabase.auth.admin.updateUserById(targetAdminId, {
        app_metadata: {
          ...data.user?.app_metadata,
          password_changed_at: new Date().toISOString(),
          force_logout: true,
        },
      });

      console.log("[Change Admin Password Success]");

      return c.json({
        success: true,
        message:
          "비밀번호가 변경되었습니다. 해당 관리자는 재로그인이 필요합니다.",
      });
    } catch (error) {
      console.error("Change admin password error:", error);
      return c.json({ error: "비밀번호 변경에 실패했습니다" }, 500);
    }
  }
);

// ============================================
// 로그인 IP 기록 API
// ============================================

app.post("/shop-api/api/auth/record-login-ip", verifyJWT, async (c) => {
  try {
    const userId = c.get("userId");

    // 클라이언트 IP 추출
    const forwardedFor = c.req.header("x-forwarded-for");
    const realIp = c.req.header("x-real-ip");
    const cfConnectingIp = c.req.header("cf-connecting-ip"); // Cloudflare

    const clientIp =
      forwardedFor?.split(",")[0]?.trim() ||
      cfConnectingIp ||
      realIp ||
      "unknown";

    console.log("[Record Login IP] User:", userId, "IP:", clientIp);

    // 🔥 먼저 현재 사용자 정보 조회
    const { data: userData, error: getUserError } =
      await supabase.auth.admin.getUserById(userId);

    if (getUserError) {
      console.error("[Record Login IP] Get user error:", getUserError);
      // 에러가 있어도 성공으로 처리 (로그인 자체는 성공했으므로)
      return c.json({ success: true, ip: clientIp, message: "로그인 성공" });
    }

    // 🔥 기존 app_metadata 보존하면서 업데이트 + force_logout 플래그 초기화
    const existingAppMetadata = userData.user?.app_metadata || {};
    const nowISO = new Date().toISOString();

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          ...existingAppMetadata,
          last_login_ip: clientIp,
          last_login_at: nowISO,
          force_logout: false, // 🔥 로그인 성공 시 force_logout 플래그 초기화
        },
      }
    );

    if (updateError) {
      console.error("[Record Login IP] Update error:", updateError);
    }

    // 🔥 역할에 따라 적절한 테이블에 upsert
    const userRole = existingAppMetadata.role || "customer";
    const userName = userData.user?.user_metadata?.name || "이름 없음";
    const userEmail = userData.user?.email || "";
    const userPhone = userData.user?.user_metadata?.phone || null;

    if (userRole === "admin") {
      // 관리자는 admin_accounts에 저장
      const { error: upsertError } = await supabase
        .from("admin_accounts")
        .upsert(
          {
            id: userId,
            email: userEmail,
            name: userName,
            last_login_ip: clientIp,
            last_login_at: nowISO,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[Record Login IP] Admin upsert error:", upsertError);
      }
    } else {
      // 일반 유저는 user_accounts에 저장
      const { error: upsertError } = await supabase
        .from("user_accounts")
        .upsert(
          {
            id: userId,
            email: userEmail,
            name: userName,
            phone: userPhone,
            last_login_ip: clientIp,
            last_login_at: nowISO,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[Record Login IP] User upsert error:", upsertError);
      }
    }

    return c.json({
      success: true,
      ip: clientIp,
      message: "로그인 IP가 기록되었습니다",
    });
  } catch (error) {
    console.error("Record login IP error:", error);
    return c.json({ error: "IP 기록에 실패했습니다" }, 500);
  }
});

// 주문 상태 업데이트 (관리자용)
app.put("/shop-api/api/orders/:orderId/status", verifyJWT, async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const body = await c.req.json();
    const { status } = body;

    console.log(
      "[Update Order Status] Order ID:",
      orderId,
      "New Status:",
      status
    );

    // DB의 실제 컬럼명은 status
    const { data: order, error } = await supabase
      .from("orders")
      .update({ status: status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("[Update Order Status Error]:", error);
      throw error;
    }

    console.log("[Update Order Status Success]:", order);

    return c.json({ success: true, order });
  } catch (error: any) {
    console.error("Update order status error:", error);
    return c.json(
      {
        error: "주문 상태 업데이트에 실패했습니다",
        details: error?.message || String(error),
      },
      500
    );
  }
});

// ============================================
// Health Check
// ============================================

// 이미지 업로드 (Supabase Storage 사용)
app.post("/shop-api/api/upload-image", verifyJWT, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "파일이 없습니다" }, 400);
    }

    // 파일명 생성 (타임스탬프 + 랜덤)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("[Image Upload Error]:", error);
      throw error;
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return c.json({ success: true, url: urlData.publicUrl });
  } catch (error: any) {
    console.error("Upload image error:", error);
    return c.json(
      {
        error: "이미지 업로드에 실패했습니다",
        details: error?.message || String(error),
      },
      500
    );
  }
});

// Health check (두 경로 모두 지원)
app.get("/shop-api/health", (c) => {
  return c.json({ status: "ok", version: "postgres" });
});

app.get("/shop-api/api/health", (c) => {
  return c.json({
    status: "ok",
    version: "postgres",
    timestamp: new Date().toISOString(),
  });
});

// =============================================
// 특정 유저의 배송지 조회 API (관리자용)
// - 기본 배송지 최상단 정렬
// - 필요한 컬럼만 SELECT
// =============================================
app.get(
  "/shop-api/api/admin/users/:userId/addresses",
  verifyJWT,
  async (c: any) => {
    try {
      const userRole = c.get("userRole");
      if (userRole !== "admin") {
        return c.json({ error: "관리자 권한이 필요합니다" }, 403);
      }

      const userId = c.req.param("userId");
      if (!userId) {
        return c.json({ error: "유저 ID가 필요합니다" }, 400);
      }

      // 특정 유저의 배송지만 조회 (필요한 컬럼만 SELECT)
      const { data: addresses, error } = await supabase
        .from("addresses")
        .select(
          "id, name, recipient, phone, address, detail_address, postal_code, is_default, created_at"
        )
        .eq("user_id", userId)
        .order("is_default", { ascending: false }) // 기본 배송지 최상단
        .order("created_at", { ascending: false });

      if (error) throw error;

      return c.json({
        addresses: addresses || [],
        totalCount: addresses?.length || 0,
      });
    } catch (error) {
      console.error("Get user addresses error:", error);
      return c.json({ error: "배송지 조회에 실패했습니다" }, 500);
    }
  }
);

// API 루트
app.get("/shop-api/api", (c) => {
  return c.json({
    message: "E-commerce API Server",
    version: "postgres",
    endpoints: [
      "/api/products",
      "/api/products/:id",
      "/api/cart",
      "/api/cart/:itemId",
      "/api/cart/clear",
      "/api/orders",
      "/api/orders/:orderId/status",
      "/api/addresses",
      "/api/addresses/:id",
      "/api/reviews/:productId",
      "/api/reviews/:reviewId (DELETE)",
      "/api/reviews/:reviewId/helpful",
      "/api/inquiries",
      "/api/inquiries/my",
      "/api/inquiries/:id/answer",
      "/api/save-review",
      "/api/upload-image",
      "/api/auth/signup",
      "/api/auth/check-email",
      "/api/auth/check-phone",
      "/api/admin/users",
      "/api/admin/users/:userId/block",
      "/api/admin/admins",
      "/api/admin/admins/:adminId/block",
      "/api/admin/admins/:adminId (DELETE)",
      "/api/admin/orders",
      "/api/admin/inquiries",
      "/api/create-admin",
      "/api/health",
    ],
  });
});

Deno.serve(app.fetch);
