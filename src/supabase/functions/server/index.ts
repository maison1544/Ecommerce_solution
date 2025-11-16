import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

console.log("=== Server starting ===");

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
    // Edge Function URL format: /functions/v1/api/reviews/1
    // We need to extract: /reviews/1
    const path = url.pathname.replace(/^\/functions\/v1\/api/, "");
    const method = req.method;

    console.log("=== Request:", method, path, "===");

    // ========== ROUTES ==========

    // Health check
    if (path === "/health" && method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload image (admin only)
    if (path === "/upload-image" && method === "POST") {
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
    if (path === "/delete-image" && method === "DELETE") {
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
    if (path === "/create-admin" && method === "POST") {
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
    if (path === "/save-review" && method === "POST") {
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
    if (path.startsWith("/reviews/") && method === "GET") {
      const productId = path.split("/").pop();

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all reviews with their keys
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

      // Filter by product ID and add key to review data
      const productReviews = data
        ?.filter((item: any) => item.value.product_id === Number(productId))
        .map((item: any) => ({
          ...item.value,
          reviewKey: item.key.replace("review_", ""), // Extract key without prefix
        })) || [];

      productReviews.sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      console.log(`Retrieved ${productReviews.length} reviews for product ${productId}`);
      return new Response(
        JSON.stringify({ reviews: productReviews }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Like review (increment likes count)
    if (path.startsWith("/reviews/") && path.endsWith("/like") && method === "POST") {
      const reviewKey = path.split("/")[2]; // /reviews/{reviewKey}/like

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

    // Get all users (admin only)
    if (path === "/admin/users" && method === "GET") {
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

      // Filter customers only (exclude admins) and format data
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
    if (path === "/admin/admins" && method === "GET") {
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

      // Filter admins only
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
    if (path.startsWith("/admin/users/") && path.endsWith("/block") && method === "POST") {
      const { user, error } = await verifyAdmin(req.headers.get("Authorization"));
      if (error) {
        return new Response(
          JSON.stringify({ error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = path.split("/")[3]; // /admin/users/{userId}/block
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
        // Block user for 100 years (effectively permanent)
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
        // Unblock user
        const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
          banned_until: "none",
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

console.log("=== Server configured ===");