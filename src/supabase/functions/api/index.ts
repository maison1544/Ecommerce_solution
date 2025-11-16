import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

console.log("=== API Server starting ===");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Initialize Supabase Storage bucket
async function initializeStorage() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const bucketName = "prod-ecommerce";

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
      });
      console.log(`Storage bucket '${bucketName}' created`);
    }
  } catch (error) {
    console.error("Error initializing storage:", error);
  }
}

// Auth helpers
async function verifyAuth(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "No token provided" };
  }

  const token = authHeader.split(" ")[1];
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "Invalid token" };
  }

  return { user, error: null };
}

async function verifyAdmin(authHeader: string | null) {
  const { user, error } = await verifyAuth(authHeader);

  if (error || !user) {
    return { user: null, error: error || "Unauthorized" };
  }

  if (user.user_metadata?.role !== "admin") {
    return { user: null, error: "Admin access required" };
  }

  return { user, error: null };
}

// Initialize storage on startup
initializeStorage();

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawPath = url.pathname;
    const method = req.method;
    
    // Supabase Edge Function URL 구조:
    // - 클라이언트 요청: /functions/v1/api/xxx
    // - pathname 가능성 1: /api/xxx (함수명 제거 안 됨)
    // - pathname 가능성 2: /xxx (함수명 제거됨)
    // 두 경우 모두 지원
    const path = rawPath.startsWith("/api/") ? rawPath : `/api${rawPath}`;

    console.log("=== Request:", method, "raw:", rawPath, "normalized:", path, "===");
    console.log("Full URL:", req.url);

    // ========== ROUTES ==========

    // Health check
    if (path === "/api/health" && method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload image (admin only)
    if (path === "/api/upload-image" && method === "POST") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!file.type.startsWith("image/")) {
        return new Response(
          JSON.stringify({ error: "File must be an image" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File size must be less than 5MB" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const bucketName = "prod-ecommerce";
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const ext = file.name.split(".").pop();
      const filename = `${timestamp}-${randomStr}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, uint8Array, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(
          JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filename);

      return new Response(
        JSON.stringify({ url: publicUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete image (admin only)
    if (path === "/api/delete-image" && method === "DELETE") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { url: imageUrl } = await req.json();

      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: "Image URL is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const urlParts = imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const bucketName = "prod-ecommerce";

      const { error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove([fileName]);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: `Failed to delete image: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Image deleted successfully:", fileName);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin (admin only)
    if (path === "/api/create-admin" && method === "POST") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { email, password, name } = await req.json();

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "Email, password, and name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: "admin",
          createdAt: new Date().toISOString().split("T")[0],
        },
      });

      if (authError) {
        console.error("Admin creation error:", authError);
        return new Response(
          JSON.stringify({ error: `Failed to create admin: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Admin created successfully:", { email, name });

      return new Response(
        JSON.stringify({
          success: true,
          admin: {
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata.name,
            role: "admin",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save review (authenticated users only)
    if (path === "/api/save-review" && method === "POST") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { productId, author, rating, content } = await req.json();

      if (!productId || !author || !rating || !content) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reviewData = {
        product_id: productId,
        author,
        rating,
        content: content.trim(),
        likes: 0,
        images: [],
        date: new Date().toISOString().split("T")[0],
      };

      await kv.set(`review_${Date.now()}_${productId}`, reviewData);

      console.log("Review saved successfully:", reviewData);
      return new Response(
        JSON.stringify({ success: true, review: reviewData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get reviews by product ID
    if (path.startsWith("/api/reviews/") && method === "GET") {
      const productId = path.split("/").pop();

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data, error } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", "review_%");

      if (error) {
        console.error("Error fetching reviews:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch reviews" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const productReviews = data
        ?.filter((item: any) => item.value.product_id === Number(productId))
        .map((item: any) => {
          const reviewKey = item.key.replace("review_", "");
          return {
            ...item.value,
            reviewKey: reviewKey || `${Date.now()}_${item.value.product_id}`
          };
        }) || [];

      productReviews.sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      console.log(`Retrieved ${productReviews.length} reviews for product ${productId}`);
      return new Response(
        JSON.stringify({ reviews: productReviews }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Like review
    if (path.startsWith("/api/reviews/") && path.endsWith("/like") && method === "POST") {
      const reviewKey = path.split("/")[3]; // /api/reviews/{key}/like

      if (!reviewKey) {
        return new Response(
          JSON.stringify({ error: "Review key is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fullKey = `review_${reviewKey}`;
      const review = await kv.get(fullKey);

      if (!review) {
        return new Response(
          JSON.stringify({ error: "Review not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      review.likes = (review.likes || 0) + 1;
      await kv.set(fullKey, review);

      console.log(`Review ${fullKey} liked, new count: ${review.likes}`);
      return new Response(
        JSON.stringify({ success: true, likes: review.likes }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete review (author or admin only)
    if (path.startsWith("/api/reviews/") && !path.endsWith("/like") && method === "DELETE") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reviewKey = path.split("/")[3]; // /api/reviews/{key}

      if (!reviewKey) {
        return new Response(
          JSON.stringify({ error: "Review key is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fullKey = `review_${reviewKey}`;
      const review = await kv.get(fullKey);

      if (!review) {
        return new Response(
          JSON.stringify({ error: "Review not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user is the author or an admin
      const isAuthor = review.author === user.user_metadata?.name;
      const isAdmin = user.user_metadata?.role === "admin";

      if (!isAuthor && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "You can only delete your own reviews" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await kv.del(fullKey);

      console.log(`Review ${fullKey} deleted by ${isAdmin ? "admin" : "author"}: ${user.user_metadata?.name}`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users (admin only)
    if (path === "/api/admin/users" && method === "GET") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) {
        console.error("Error fetching users:", usersError);
        return new Response(
          JSON.stringify({ error: `Failed to fetch users: ${usersError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const customers = users
        .filter(u => u.user_metadata?.role !== "admin")
        .map(u => ({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || "Unknown",
          phone: u.user_metadata?.phone || "",
          createdAt: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "",
          role: u.user_metadata?.role || "customer",
          isBlocked: u.banned_until ? new Date(u.banned_until) > new Date() : false,
        }));

      console.log(`Retrieved ${customers.length} customers`);
      return new Response(
        JSON.stringify({ users: customers }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all admins (admin only)
    if (path === "/api/admin/admins" && method === "GET") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) {
        console.error("Error fetching admins:", usersError);
        return new Response(
          JSON.stringify({ error: `Failed to fetch admins: ${usersError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const admins = users
        .filter(u => u.user_metadata?.role === "admin")
        .map(u => ({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || "Unknown",
          createdAt: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "",
          role: "admin",
        }));

      console.log(`Retrieved ${admins.length} admins`);
      return new Response(
        JSON.stringify({ admins }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block/Unblock user (admin only)
    if (path.startsWith("/api/admin/users/") && path.endsWith("/block") && method === "POST") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = path.split("/")[4]; // /api/admin/users/{id}/block
      const { block } = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      if (block) {
        const bannedUntil = new Date();
        bannedUntil.setFullYear(bannedUntil.getFullYear() + 100);

        const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
          banned_until: bannedUntil.toISOString(),
        });

        if (banError) {
          console.error("Error blocking user:", banError);
          return new Response(
            JSON.stringify({ error: `Failed to block user: ${banError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`User ${userId} blocked`);
        return new Response(
          JSON.stringify({ success: true, message: "User blocked" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Unblock user by setting banned_until to null
        const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
          banned_until: null,
        });

        if (unbanError) {
          console.error("Error unblocking user:", unbanError);
          return new Response(
            JSON.stringify({ error: `Failed to unblock user: ${unbanError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`User ${userId} unblocked`);
        return new Response(
          JSON.stringify({ success: true, message: "User unblocked" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get all products
    if (path === "/api/products" && method === "GET") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data, error } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", "product_%");

      if (error) {
        console.error("Error fetching products:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch products" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const products = data?.map((item: any) => item.value) || [];
      console.log(`Retrieved ${products.length} products`);
      return new Response(
        JSON.stringify({ products }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add new product (admin only)
    if (path === "/api/products" && method === "POST") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const productData = await req.json();

      if (!productData.name || !productData.price || !productData.category) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const productId = Date.now();
      const product = {
        id: productId,
        ...productData,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`product_${productId}`, product);

      console.log("Product created successfully:", product);
      return new Response(
        JSON.stringify({ success: true, product }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update product (admin only)
    if (path.startsWith("/api/products/") && method === "PUT") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const productId = path.split("/")[3]; // /api/products/{id}
      const productData = await req.json();

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const existingProduct = await kv.get(`product_${productId}`);
      if (!existingProduct) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updatedProduct = {
        ...existingProduct,
        ...productData,
        id: Number(productId),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`product_${productId}`, updatedProduct);

      console.log("Product updated successfully:", updatedProduct);
      return new Response(
        JSON.stringify({ success: true, product: updatedProduct }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete product (admin only)
    if (path.startsWith("/api/products/") && method === "DELETE") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const productId = path.split("/")[3]; // /api/products/{id}

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await kv.del(`product_${productId}`);

      console.log(`Product ${productId} deleted`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CART ROUTES ==========

    // Get cart items by user
    if (path === "/api/cart" && method === "GET") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const cartKey = `cart_${userId}`;
      const cartData = await kv.get(cartKey);

      console.log(`Retrieved cart for user ${userId}`);
      return new Response(
        JSON.stringify({ cart: cartData || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add item to cart
    if (path === "/api/cart" && method === "POST") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { productId, name, price, originalPrice, image, quantity } = await req.json();

      if (!productId || !name || !price || !image) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const cartKey = `cart_${userId}`;
      const cartData = await kv.get(cartKey) || [];

      // Find existing item
      const existingItemIndex = cartData.findIndex((item: any) => item.productId === productId);

      if (existingItemIndex >= 0) {
        cartData[existingItemIndex].quantity += (quantity || 1);
      } else {
        cartData.push({
          id: Date.now(),
          userId,
          productId,
          name,
          price,
          originalPrice,
          quantity: quantity || 1,
          image
        });
      }

      await kv.set(cartKey, cartData);

      console.log(`Added item to cart for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, cart: cartData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear cart - MUST BE BEFORE DELETE /api/cart/:id
    if (path === "/api/cart/clear" && method === "DELETE") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const cartKey = `cart_${userId}`;
      await kv.set(cartKey, []);

      console.log(`Cleared cart for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update cart item quantity
    if (path.startsWith("/api/cart/") && method === "PUT") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const itemId = path.split("/")[3]; // /api/cart/{id}
      const { quantity } = await req.json();

      if (!itemId || quantity === undefined) {
        return new Response(
          JSON.stringify({ error: "Item ID and quantity are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const cartKey = `cart_${userId}`;
      const cartData = await kv.get(cartKey) || [];

      const itemIndex = cartData.findIndex((item: any) => item.id === Number(itemId));

      if (itemIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (quantity <= 0) {
        cartData.splice(itemIndex, 1);
      } else {
        cartData[itemIndex].quantity = quantity;
      }

      await kv.set(cartKey, cartData);

      console.log(`Updated cart item ${itemId} for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, cart: cartData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete cart item
    if (path.startsWith("/api/cart/") && method === "DELETE") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const itemId = path.split("/")[3]; // /api/cart/{id}

      if (!itemId) {
        return new Response(
          JSON.stringify({ error: "Item ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const cartKey = `cart_${userId}`;
      const cartData = await kv.get(cartKey) || [];

      const itemIndex = cartData.findIndex((item: any) => item.id === Number(itemId));

      if (itemIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      cartData.splice(itemIndex, 1);
      await kv.set(cartKey, cartData);

      console.log(`Deleted cart item ${itemId} for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, cart: cartData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== ORDER ROUTES ==========

    // Get orders by user
    if (path === "/api/orders" && method === "GET") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data, error: dbError } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", `order_${user.id}_%`);

      if (dbError) {
        console.error("Error fetching orders:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch orders" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const orders = data?.map((item: any) => item.value) || [];
      orders.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(`Retrieved ${orders.length} orders for user ${user.id}`);
      return new Response(
        JSON.stringify({ orders }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order
    if (path === "/api/orders" && method === "POST") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const orderData = await req.json();

      if (!orderData.items || !orderData.shippingAddress || !orderData.totalAmount) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const order = {
        id: orderId,
        userId: user.id,
        date: new Date().toISOString(),
        status: "배송 준비 중",
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        shippingAddress: orderData.shippingAddress,
        trackingNumber: undefined
      };

      await kv.set(`order_${user.id}_${orderId}`, order);

      // Clear cart after order
      await kv.set(`cart_${user.id}`, []);

      console.log(`Order created: ${orderId} for user ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, order }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all orders (admin only)
    if (path === "/api/admin/orders" && method === "GET") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data, error: dbError } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", "order_%");

      if (dbError) {
        console.error("Error fetching orders:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch orders" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const orders = data?.map((item: any) => item.value) || [];
      orders.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(`Retrieved ${orders.length} orders for admin`);
      return new Response(
        JSON.stringify({ orders }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status (admin only)
    if (path.startsWith("/api/orders/") && path.endsWith("/status") && method === "PUT") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const orderId = path.split("/")[3]; // /api/orders/{id}/status
      const { status, trackingNumber } = await req.json();

      if (!orderId || !status) {
        return new Response(
          JSON.stringify({ error: "Order ID and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Find the order
      const { data, error: dbError } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", `order_%${orderId}`)
        .single();

      if (dbError || !data) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const order = data.value;
      order.status = status;
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }

      await kv.set(data.key, order);

      console.log(`Order ${orderId} status updated to ${status}`);
      return new Response(
        JSON.stringify({ success: true, order }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== ADDRESS ROUTES ==========

    // Get addresses by user
    if (path === "/api/addresses" && method === "GET") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const addressKey = `addresses_${userId}`;
      const addressData = await kv.get(addressKey);

      console.log(`Retrieved addresses for user ${userId}`);
      return new Response(
        JSON.stringify({ addresses: addressData || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add address
    if (path === "/api/addresses" && method === "POST") {
      try {
        const { user, error } = await verifyAuth(req.headers.get("Authorization"));
        if (error) {
          console.error("Auth error:", error);
          return new Response(
            JSON.stringify({ error }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const addressData = await req.json();
        console.log("Address data received:", JSON.stringify(addressData));

        if (!addressData.recipient || !addressData.phone || !addressData.address) {
          console.error("Missing required fields:", addressData);
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const userId = user.id;
        const addressKey = `addresses_${userId}`;
        console.log(`Fetching addresses for key: ${addressKey}`);
        
        const addresses = await kv.get(addressKey) || [];
        console.log(`Current addresses count: ${addresses.length}`);

        // If setting as default, unset other defaults
        if (addressData.isDefault) {
          addresses.forEach((addr: any) => {
            addr.isDefault = false;
          });
        }

        const newAddress = {
          id: Date.now(),
          userId,
          ...addressData
        };

        addresses.push(newAddress);
        console.log(`Saving ${addresses.length} addresses to key: ${addressKey}`);
        await kv.set(addressKey, addresses);

        console.log(`Added address for user ${userId}`);
        return new Response(
          JSON.stringify({ success: true, address: newAddress, addresses }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("Error in POST /api/addresses:", err);
        return new Response(
          JSON.stringify({ error: `Internal server error: ${err.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update address
    if (path.startsWith("/api/addresses/") && method === "PUT") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const addressId = path.split("/")[3]; // /api/addresses/{id}
      const addressData = await req.json();

      if (!addressId) {
        return new Response(
          JSON.stringify({ error: "Address ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const addressKey = `addresses_${userId}`;
      const addresses = await kv.get(addressKey) || [];

      const addressIndex = addresses.findIndex((addr: any) => addr.id === Number(addressId));

      if (addressIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Address not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If setting as default, unset other defaults
      if (addressData.isDefault) {
        addresses.forEach((addr: any) => {
          addr.isDefault = false;
        });
      }

      addresses[addressIndex] = {
        ...addresses[addressIndex],
        ...addressData
      };

      await kv.set(addressKey, addresses);

      console.log(`Updated address ${addressId} for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, address: addresses[addressIndex], addresses }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete address
    if (path.startsWith("/api/addresses/") && method === "DELETE") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const addressId = path.split("/")[3]; // /api/addresses/{id}

      if (!addressId) {
        return new Response(
          JSON.stringify({ error: "Address ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = user.id;
      const addressKey = `addresses_${userId}`;
      const addresses = await kv.get(addressKey) || [];

      const addressIndex = addresses.findIndex((addr: any) => addr.id === Number(addressId));

      if (addressIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Address not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      addresses.splice(addressIndex, 1);
      await kv.set(addressKey, addresses);

      console.log(`Deleted address ${addressId} for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, addresses }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== INQUIRY ROUTES ==========

    // Get inquiries by user
    if (path === "/api/inquiries" && method === "GET") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data, error: dbError } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", `inquiry_${user.id}_%`);

      if (dbError) {
        console.error("Error fetching inquiries:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch inquiries" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inquiries = data?.map((item: any) => item.value) || [];
      inquiries.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`Retrieved ${inquiries.length} inquiries for user ${user.id}`);
      return new Response(
        JSON.stringify({ inquiries }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create inquiry
    if (path === "/api/inquiries" && method === "POST") {
      const { user, error } = await verifyAuth(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inquiryData = await req.json();

      if (!inquiryData.title || !inquiryData.content || !inquiryData.category) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inquiryId = `INQ-${Date.now()}`;
      const inquiry = {
        id: inquiryId,
        userId: user.id,
        userName: user.user_metadata?.name || "Unknown",
        title: inquiryData.title,
        content: inquiryData.content,
        category: inquiryData.category,
        status: "대기",
        createdAt: new Date().toISOString()
      };

      await kv.set(`inquiry_${user.id}_${inquiryId}`, inquiry);

      console.log(`Inquiry created: ${inquiryId} for user ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, inquiry }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all inquiries (admin only)
    if (path === "/api/admin/inquiries" && method === "GET") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data, error: dbError } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", "inquiry_%");

      if (dbError) {
        console.error("Error fetching inquiries:", dbError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch inquiries" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inquiries = data?.map((item: any) => item.value) || [];
      inquiries.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`Retrieved ${inquiries.length} inquiries for admin`);
      return new Response(
        JSON.stringify({ inquiries }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Answer inquiry (admin only)
    if (path.startsWith("/api/inquiries/") && path.endsWith("/answer") && method === "PUT") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inquiryId = path.split("/")[3]; // /api/inquiries/{id}/answer
      const { answer } = await req.json();

      if (!inquiryId || !answer) {
        return new Response(
          JSON.stringify({ error: "Inquiry ID and answer are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Find the inquiry
      const { data, error: dbError } = await supabase
        .from("kv_store_94a0507e")
        .select("key, value")
        .like("key", `inquiry_%${inquiryId}`)
        .single();

      if (dbError || !data) {
        return new Response(
          JSON.stringify({ error: "Inquiry not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inquiry = data.value;
      inquiry.answer = {
        content: answer,
        answeredAt: new Date().toISOString(),
        answeredBy: user.id
      };
      inquiry.status = "답변완료";

      await kv.set(data.key, inquiry);

      console.log(`Inquiry ${inquiryId} answered by admin ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, inquiry }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default 404
    return new Response(
      JSON.stringify({ error: "Not Found", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("=== Error:", error, "===");
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("=== API Server configured ===");