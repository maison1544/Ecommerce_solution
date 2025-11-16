import { Hono } from 'npm:hono@4.6.14';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

console.log('✅ Server starting...');

const app = new Hono();

// CORS 설정
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://yourvercelapp.vercel.app', 
    /\.vercel\.app$/,
  ],
  credentials: true,
}));

app.use('*', logger(console.log));

// Supabase 클라이언트 생성
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== AUTH ROUTES ====================

// 회원가입
app.post('/make-server-94a0507e/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, phone, birthDate } = body;

    if (!email || !password || !name) {
      return c.json({ success: false, message: '필수 정보를 입력해주세요.' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone: phone || null,
        birthDate: birthDate || null,
        role: 'customer',
        isBlocked: false,
      },
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ success: false, message: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ success: false, message: '회원가입 중 오류가 발생했습니다.' }, 500);
  }
});

// ==================== PRODUCT ROUTES ====================

// 상품 목록 조회
app.get('/make-server-94a0507e/api/products', async (c) => {
  try {
    const products = await kv.getByPrefix('product:');
    return c.json({ products: products || [] });
  } catch (error) {
    console.error('Get products error:', error);
    return c.json({ error: 'Failed to get products' }, 500);
  }
});

// 상품 상세 조회
app.get('/make-server-94a0507e/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const product = await kv.get(`product:${id}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    return c.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    return c.json({ error: 'Failed to get product' }, 500);
  }
});

// 상품 생성
app.post('/make-server-94a0507e/api/products', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const productId = Date.now();
    const product = { ...body, id: productId };
    
    await kv.set(`product:${productId}`, product);
    return c.json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

// 상품 수정
app.put('/make-server-94a0507e/api/products/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const product = { ...body, id: parseInt(id) };
    
    await kv.set(`product:${id}`, product);
    return c.json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// 상품 삭제
app.delete('/make-server-94a0507e/api/products/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    await kv.del(`product:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// ==================== CART ROUTES ====================

// 장바구니 조회
app.get('/make-server-94a0507e/api/cart/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const cart = await kv.get(`cart:${userId}`);
    return c.json({ cart: cart || [] });
  } catch (error) {
    console.error('Get cart error:', error);
    return c.json({ error: 'Failed to get cart' }, 500);
  }
});

// 장바구니 저장
app.post('/make-server-94a0507e/api/cart/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    await kv.set(`cart:${userId}`, body.cart);
    return c.json({ success: true });
  } catch (error) {
    console.error('Save cart error:', error);
    return c.json({ error: 'Failed to save cart' }, 500);
  }
});

// ==================== ORDER ROUTES ====================

// 주문 조회
app.get('/make-server-94a0507e/api/orders/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const orders = await kv.get(`orders:${userId}`);
    return c.json({ orders: orders || [] });
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ error: 'Failed to get orders' }, 500);
  }
});

// 주문 저장
app.post('/make-server-94a0507e/api/orders/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    
    const existingOrders = await kv.get(`orders:${userId}`) || [];
    const updatedOrders = [...existingOrders, body.order];
    
    await kv.set(`orders:${userId}`, updatedOrders);
    return c.json({ success: true });
  } catch (error) {
    console.error('Save order error:', error);
    return c.json({ error: 'Failed to save order' }, 500);
  }
});

// ==================== ADDRESS ROUTES ====================

// 배송지 조회
app.get('/make-server-94a0507e/api/addresses/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const addresses = await kv.get(`addresses:${userId}`);
    return c.json({ addresses: addresses || [] });
  } catch (error) {
    console.error('Get addresses error:', error);
    return c.json({ error: 'Failed to get addresses' }, 500);
  }
});

// 배송지 저장
app.post('/make-server-94a0507e/api/addresses/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    await kv.set(`addresses:${userId}`, body.addresses);
    return c.json({ success: true });
  } catch (error) {
    console.error('Save addresses error:', error);
    return c.json({ error: 'Failed to save addresses' }, 500);
  }
});

// ==================== INQUIRY ROUTES ====================

// 문의사항 조회 (전체)
app.get('/make-server-94a0507e/api/inquiries', async (c) => {
  try {
    const inquiries = await kv.getByPrefix('inquiry:');
    return c.json({ inquiries: inquiries || [] });
  } catch (error) {
    console.error('Get inquiries error:', error);
    return c.json({ error: 'Failed to get inquiries' }, 500);
  }
});

// 문의사항 조회 (사용자별)
app.get('/make-server-94a0507e/api/inquiries/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const inquiries = await kv.get(`inquiries:${userId}`);
    return c.json({ inquiries: inquiries || [] });
  } catch (error) {
    console.error('Get inquiries error:', error);
    return c.json({ error: 'Failed to get inquiries' }, 500);
  }
});

// 문의사항 저장
app.post('/make-server-94a0507e/api/inquiries/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    
    const existingInquiries = await kv.get(`inquiries:${userId}`) || [];
    const updatedInquiries = [...existingInquiries, body.inquiry];
    
    await kv.set(`inquiries:${userId}`, updatedInquiries);
    
    // 전체 문의사항에도 저장
    await kv.set(`inquiry:${body.inquiry.id}`, body.inquiry);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Save inquiry error:', error);
    return c.json({ error: 'Failed to save inquiry' }, 500);
  }
});

// 문의 답변 업데이트
app.put('/make-server-94a0507e/api/inquiries/:inquiryId/answer', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const inquiryId = c.req.param('inquiryId');
    const body = await c.req.json();
    
    const inquiry = await kv.get(`inquiry:${inquiryId}`);
    if (!inquiry) {
      return c.json({ error: 'Inquiry not found' }, 404);
    }
    
    const updatedInquiry = { ...inquiry, ...body };
    await kv.set(`inquiry:${inquiryId}`, updatedInquiry);
    
    // 사용자별 문의사항도 업데이트
    const userInquiries = await kv.get(`inquiries:${inquiry.userId}`) || [];
    const updatedUserInquiries = userInquiries.map((inq: any) => 
      inq.id === parseInt(inquiryId) ? updatedInquiry : inq
    );
    await kv.set(`inquiries:${inquiry.userId}`, updatedUserInquiries);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update inquiry answer error:', error);
    return c.json({ error: 'Failed to update inquiry answer' }, 500);
  }
});

// ==================== REVIEW ROUTES ====================

// 리뷰 조회 (상품별)
app.get('/make-server-94a0507e/api/reviews/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const reviews = await kv.get(`reviews:${productId}`);
    return c.json({ reviews: reviews || [] });
  } catch (error) {
    console.error('Get reviews error:', error);
    return c.json({ error: 'Failed to get reviews' }, 500);
  }
});

// 리뷰 저장
app.post('/make-server-94a0507e/api/reviews/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const body = await c.req.json();
    
    const existingReviews = await kv.get(`reviews:${productId}`) || [];
    const updatedReviews = [...existingReviews, body.review];
    
    await kv.set(`reviews:${productId}`, updatedReviews);
    return c.json({ success: true });
  } catch (error) {
    console.error('Save review error:', error);
    return c.json({ error: 'Failed to save review' }, 500);
  }
});

// ==================== ADMIN ROUTES ====================

// 유저 목록 조회
app.get('/make-server-94a0507e/api/admin/users', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    const formattedUsers = users
      .filter(u => u.user_metadata?.role !== 'admin')
      .map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || '',
        phone: u.user_metadata?.phone || '',
        role: u.user_metadata?.role || 'customer',
        isBlocked: u.user_metadata?.isBlocked || false,
        createdAt: u.created_at,
      }));
    
    return c.json({ users: formattedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// 관리자 목록 조회
app.get('/make-server-94a0507e/api/admin/admins', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    const formattedAdmins = users
      .filter(u => u.user_metadata?.role === 'admin')
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
    console.error('Get admins error:', error);
    return c.json({ error: 'Failed to get admins' }, 500);
  }
});

// 유저 차단/해제
app.put('/make-server-94a0507e/api/admin/users/:userId/block', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const body = await c.req.json();
    
    const { data: targetUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (getUserError || !targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...targetUser.user.user_metadata,
        isBlocked: body.isBlocked,
      },
    });
    
    if (updateError) {
      return c.json({ error: updateError.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Block user error:', error);
    return c.json({ error: 'Failed to block user' }, 500);
  }
});

// ==================== IMAGE UPLOAD ====================

// Supabase Storage에 이미지 업로드
app.post('/make-server-94a0507e/api/upload', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Bucket 생성 (idempotent)
    const bucketName = 'make-94a0507e-product-images';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
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
      console.error('Upload error:', error);
      return c.json({ error: error.message }, 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return c.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

// Health check
app.get('/make-server-94a0507e/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('✅ Server configured. Routes registered.');

Deno.serve(app.fetch);
