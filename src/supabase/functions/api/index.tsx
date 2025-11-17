// ✅ 'api' Edge Function 엔트리포인트
// server/index.tsx를 import해서 사용
import { Hono } from 'npm:hono@4.6.14';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from '../server/kv_store.tsx';

console.log('🔐 === API v5.0 - SECURE VERSION (app_metadata.role only) ===');

const app = new Hono();

// ✅ CORS 설정 (모든 origin 허용 - 프로덕션에서는 제한 필요)
app.use('*', cors({
  origin: '*', // 👈 모든 origin 허용 (테스트/개발용)
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

app.use('*', logger(console.log));

// Supabase 클라이언트 생성 (service_role - 서버 전용)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== JWT 검증 미들웨어 ====================
// 모든 API 엔드포인트에서 JWT 토큰을 검증합니다 (보안 강화)

const verifyJWT = async (c: any, next: any) => {
  // 공개 엔드포인트는 제외
  const publicPaths = [
    '/api/auth/signup',
    '/api/health',
    '/api',
  ];
  
  const path = c.req.path;
  if (publicPaths.includes(path) || path === '/') {
    return await next();
  }

  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    console.error('❌ No token provided');
    return c.json({ error: 'Unauthorized - No token' }, 401);
  }

  try {
    // JWT 검증
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Invalid token:', error?.message);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // ✅ 차단 확인 (banned_until 사용)
    const bannedUntil = user.banned_until;
    if (bannedUntil && new Date(bannedUntil) > new Date()) {
      console.error('🚫 User is banned:', user.email);
      return c.json({ error: 'User is blocked' }, 403);
    }

    // ✅ app_metadata.role만 사용 (클라이언트가 수정 불가능)
    const role = user.app_metadata?.role || 'customer';

    // 요청에 사용자 정보 추가
    c.set('user', user);
    c.set('userId', user.id);
    c.set('userRole', role);
    
    console.log(`✅ JWT verified - User: ${user.email}, Role: ${role}`);
    
    await next();
  } catch (error) {
    console.error('❌ JWT verification error:', error);
    return c.json({ error: 'Unauthorized - Verification failed' }, 401);
  }
};

// 모든 /api/* 경로에 JWT 검증 적용
app.use('/api/*', verifyJWT);

// 관리자 권한 확인 미들웨어
const requireAdmin = async (c: any, next: any) => {
  const role = c.get('userRole');
  
  if (role !== 'admin') {
    console.error('❌ Admin access denied - Role:', role);
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }
  
  await next();
};

// ==================== PUBLIC ROUTES ====================

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    version: '5.0 - Secure',
    timestamp: new Date().toISOString() 
  });
});

app.get('/api', (c) => {
  return c.json({ 
    message: 'Solution Studio E-Commerce API',
    version: '5.0 - Secure',
    status: 'running'
  });
});

// ==================== AUTH ROUTES ====================

// 회원가입 (공개 엔드포인트)
app.post('/api/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, phone, birthDate } = body;

    if (!email || !password || !name) {
      return c.json({ success: false, error: '필수 정보를 입력해주세요.' }, 400);
    }

    // ✅ Supabase Auth로 사용자 생성 (비밀번호 자동 bcrypt 해시)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 확인 건너뛰기
      user_metadata: {
        name,
        phone: phone || null,
        birthDate: birthDate || null,
      },
      app_metadata: {
        role: 'customer', // ✅ app_metadata에 role 저장 (클라이언트 수정 불가)
      },
    });

    if (error) {
      console.error('❌ Signup error:', error);
      
      if (error.message.includes('already registered')) {
        return c.json({ success: false, error: '이미 사용 중인 이메일입니다.' }, 400);
      }
      
      return c.json({ success: false, error: error.message }, 400);
    }

    console.log(`✅ User created: ${data.user.email}`);
    return c.json({ success: true, user: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    console.error('❌ Signup error:', error);
    return c.json({ success: false, error: '회원가입 중 오류가 발생했습니다.' }, 500);
  }
});

// ==================== PRODUCT ROUTES ====================

// 상품 목록 조회 (인증 필요)
app.get('/api/products', async (c) => {
  try {
    const products = await kv.getByPrefix('product:');
    return c.json({ products: products || [] });
  } catch (error) {
    console.error('❌ Get products error:', error);
    return c.json({ error: 'Failed to get products' }, 500);
  }
});

// 상품 상세 조회 (인증 필요)
app.get('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const product = await kv.get(`product:${id}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    return c.json({ product });
  } catch (error) {
    console.error('❌ Get product error:', error);
    return c.json({ error: 'Failed to get product' }, 500);
  }
});

// 상품 생성 (관리자 전용)
app.post('/api/products', requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const productId = Date.now();
    const userId = c.get('userId');
    
    const product = { 
      ...body, 
      id: productId,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`product:${productId}`, product);
    
    console.log(`✅ Product created: ${productId} by ${userId}`);
    return c.json({ product });
  } catch (error) {
    console.error('❌ Create product error:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// 상품 수정 (관리자 전용)
app.put('/api/products/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const userId = c.get('userId');
    
    const product = { 
      ...body, 
      id: parseInt(id),
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`product:${id}`, product);
    
    console.log(`✅ Product updated: ${id} by ${userId}`);
    return c.json({ product });
  } catch (error) {
    console.error('❌ Update product error:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// 상품 삭제 (관리자 전용)
app.delete('/api/products/:id', requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    
    await kv.del(`product:${id}`);
    
    console.log(`✅ Product deleted: ${id} by ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Delete product error:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// ==================== CART ROUTES ====================

// 장바구니 조회 (자신의 장바구니만)
app.get('/api/cart', async (c) => {
  try {
    const userId = c.get('userId');
    const cart = await kv.get(`cart:${userId}`);
    return c.json({ cart: cart || [] });
  } catch (error) {
    console.error('❌ Get cart error:', error);
    return c.json({ error: 'Failed to get cart' }, 500);
  }
});

// 장바구니 저장 (자신의 장바구니만)
app.post('/api/cart', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    await kv.set(`cart:${userId}`, body.cart);
    
    console.log(`✅ Cart saved for user: ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Save cart error:', error);
    return c.json({ error: 'Failed to save cart' }, 500);
  }
});

// ==================== ORDER ROUTES ====================

// 주문 조회 (자신의 주문만)
app.get('/api/orders', async (c) => {
  try {
    const userId = c.get('userId');
    const orders = await kv.get(`orders:${userId}`);
    return c.json({ orders: orders || [] });
  } catch (error) {
    console.error('❌ Get orders error:', error);
    return c.json({ error: 'Failed to get orders' }, 500);
  }
});

// 주문 생성 (자신의 주문만)
app.post('/api/orders', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    const existingOrders = await kv.get(`orders:${userId}`) || [];
    const order = {
      ...body.order,
      userId,
      createdAt: new Date().toISOString()
    };
    const updatedOrders = [...existingOrders, order];
    
    await kv.set(`orders:${userId}`, updatedOrders);
    
    console.log(`✅ Order created: ${order.id} by ${userId}`);
    return c.json({ success: true, order });
  } catch (error) {
    console.error('❌ Save order error:', error);
    return c.json({ error: 'Failed to save order' }, 500);
  }
});

// ==================== ADDRESS ROUTES ====================

// 배송지 조회 (자신의 배송지만)
app.get('/api/addresses', async (c) => {
  try {
    const userId = c.get('userId');
    const addresses = await kv.get(`addresses:${userId}`);
    return c.json({ addresses: addresses || [] });
  } catch (error) {
    console.error('❌ Get addresses error:', error);
    return c.json({ error: 'Failed to get addresses' }, 500);
  }
});

// 배송지 저장 (자신의 배송지만)
app.post('/api/addresses', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    await kv.set(`addresses:${userId}`, body.addresses);
    
    console.log(`✅ Addresses saved for user: ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Save addresses error:', error);
    return c.json({ error: 'Failed to save addresses' }, 500);
  }
});

// ==================== INQUIRY ROUTES ====================

// 문의사항 조회 (자신의 문의만)
app.get('/api/inquiries', async (c) => {
  try {
    const userId = c.get('userId');
    const role = c.get('userRole');
    
    // 관리자는 전체 조회
    if (role === 'admin') {
      const inquiries = await kv.getByPrefix('inquiry:');
      return c.json({ inquiries: inquiries || [] });
    }
    
    // 일반 사용자는 자신의 문의만
    const inquiries = await kv.get(`inquiries:${userId}`);
    return c.json({ inquiries: inquiries || [] });
  } catch (error) {
    console.error('❌ Get inquiries error:', error);
    return c.json({ error: 'Failed to get inquiries' }, 500);
  }
});

// 문의사항 저장 (자신의 문의만)
app.post('/api/inquiries', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    
    const inquiry = {
      ...body.inquiry,
      userId,
      createdAt: new Date().toISOString()
    };
    
    const existingInquiries = await kv.get(`inquiries:${userId}`) || [];
    const updatedInquiries = [...existingInquiries, inquiry];
    
    await kv.set(`inquiries:${userId}`, updatedInquiries);
    await kv.set(`inquiry:${inquiry.id}`, inquiry);
    
    console.log(`✅ Inquiry created: ${inquiry.id} by ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Save inquiry error:', error);
    return c.json({ error: 'Failed to save inquiry' }, 500);
  }
});

// 문의 답변 (관리자 전용)
app.put('/api/inquiries/:inquiryId/answer', requireAdmin, async (c) => {
  try {
    const inquiryId = c.req.param('inquiryId');
    const body = await c.req.json();
    const userId = c.get('userId');
    
    const inquiry = await kv.get(`inquiry:${inquiryId}`);
    if (!inquiry) {
      return c.json({ error: 'Inquiry not found' }, 404);
    }
    
    const updatedInquiry = { 
      ...inquiry, 
      ...body,
      answeredBy: userId,
      answeredAt: new Date().toISOString()
    };
    
    await kv.set(`inquiry:${inquiryId}`, updatedInquiry);
    
    // 사용자별 문의사항도 업데이트
    const userInquiries = await kv.get(`inquiries:${inquiry.userId}`) || [];
    const updatedUserInquiries = userInquiries.map((inq: any) => 
      inq.id === parseInt(inquiryId) ? updatedInquiry : inq
    );
    await kv.set(`inquiries:${inquiry.userId}`, updatedUserInquiries);
    
    console.log(`✅ Inquiry answered: ${inquiryId} by ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Update inquiry answer error:', error);
    return c.json({ error: 'Failed to update inquiry answer' }, 500);
  }
});

// ==================== REVIEW ROUTES ====================

// 리뷰 조회 (인증 필요)
app.get('/api/reviews/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const reviews = await kv.get(`reviews:${productId}`);
    return c.json({ reviews: reviews || [] });
  } catch (error) {
    console.error('❌ Get reviews error:', error);
    return c.json({ error: 'Failed to get reviews' }, 500);
  }
});

// 리뷰 저장 (자신의 리뷰만)
app.post('/api/reviews/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const userId = c.get('userId');
    const body = await c.req.json();
    
    const review = {
      ...body.review,
      userId,
      createdAt: new Date().toISOString()
    };
    
    const existingReviews = await kv.get(`reviews:${productId}`) || [];
    const updatedReviews = [...existingReviews, review];
    
    await kv.set(`reviews:${productId}`, updatedReviews);
    
    console.log(`✅ Review created for product ${productId} by ${userId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Save review error:', error);
    return c.json({ error: 'Failed to save review' }, 500);
  }
});

// ==================== ADMIN ROUTES ====================

// 사용자 목록 조회 (관리자 전용)
app.get('/api/admin/users', requireAdmin, async (c) => {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ List users error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // ✅ app_metadata.role로만 필터링
    const formattedUsers = users
      .filter(u => (u.app_metadata?.role || 'customer') !== 'admin')
      .map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || '',
        phone: u.user_metadata?.phone || '',
        role: u.app_metadata?.role || 'customer',
        isBlocked: u.banned_until && new Date(u.banned_until) > new Date(),
        bannedUntil: u.banned_until,
        createdAt: u.created_at,
      }));
    
    return c.json({ users: formattedUsers });
  } catch (error) {
    console.error('❌ Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// 관리자 목록 조회 (관리자 전용)
app.get('/api/admin/admins', requireAdmin, async (c) => {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ List admins error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // ✅ app_metadata.role로만 필터링
    const formattedAdmins = users
      .filter(u => u.app_metadata?.role === 'admin')
      .map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || '',
        phone: u.user_metadata?.phone || '',
        role: 'admin',
        createdAt: u.created_at,
      }));
    
    return c.json({ admins: formattedAdmins });
  } catch (error) {
    console.error('❌ Get admins error:', error);
    return c.json({ error: 'Failed to get admins' }, 500);
  }
});

// 사용자 차단/해제 (관리자 전용)
app.put('/api/admin/users/:userId/block', requireAdmin, async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const adminId = c.get('userId');
    
    console.log(`🔵 Block request - userId: ${userId}, isBlocked: ${body.isBlocked}`);
    
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (getUserError || !targetUser) {
      console.error('❌ User not found:', getUserError);
      return c.json({ error: 'User not found' }, 404);
    }
    
    const isBlocked = body.isBlocked ?? body.block ?? false;
    
    // ✅ banned_until 사용 (Supabase 공식 차단 방식)
    const bannedUntil = isBlocked 
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() // 100년 후
      : 'none'; // 차단 해제
    
    console.log(`${isBlocked ? '🚫' : '✅'} Setting banned_until to: ${bannedUntil}`);
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: bannedUntil,
    });
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
      return c.json({ error: updateError.message }, 500);
    }
    
    console.log(`✅ User ${isBlocked ? 'blocked' : 'unblocked'}: ${userId} by ${adminId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Block user error:', error);
    return c.json({ error: 'Failed to block user' }, 500);
  }
});

// ==================== IMAGE UPLOAD ====================

// Supabase Storage에 이미지 업로드 (관리자 전용)
app.post('/api/upload', requireAdmin, async (c) => {
  try {
    const userId = c.get('userId');
    
    // Bucket 생성 (idempotent)
    const bucketName = 'make-94a0507e-product-images';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
      console.log(`✅ Bucket created: ${bucketName}`);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const fileName = `${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      return c.json({ error: error.message }, 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log(`✅ File uploaded: ${fileName} by ${userId}`);
    return c.json({ url: publicUrl });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

console.log('✅ API configured with JWT verification and security policies');

Deno.serve(app.fetch);
