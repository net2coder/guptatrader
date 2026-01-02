-- =====================================================
-- COMPLETE SUPABASE DATABASE SETUP SCRIPT
-- Gupta Traders - E-Commerce Furniture Store
-- Production Ready | Updated: January 2025
-- =====================================================
-- Run this script in a fresh Supabase project
-- Includes: Authentication, Products, Orders, Coupons, Returns, Warranty System
-- =====================================================

-- =====================================================
-- SECTION 1: EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- SECTION 2: CUSTOM TYPES (ENUMS)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending', 
    'confirmed', 
    'processing', 
    'shipped', 
    'delivered', 
    'cancelled', 
    'returned'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending', 
    'paid', 
    'failed', 
    'refunded', 
    'partially_refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECTION 3: SEQUENCES
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

-- =====================================================
-- SECTION 4: HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- SECTION 5: TABLES
-- =====================================================

-- 5.1 User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 5.2 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.3 Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.4 Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.5 Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC CHECK (compare_at_price >= 0),
  cost_price NUMERIC CHECK (cost_price >= 0),
  sku TEXT,
  barcode TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  material TEXT,
  dimensions TEXT,
  weight NUMERIC CHECK (weight >= 0),
  color TEXT,
  room_type TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  has_warranty BOOLEAN DEFAULT false,
  warranty_years INTEGER CHECK (warranty_years > 0 AND warranty_years <= 10),
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.6 Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.7 Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_modifier NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  attributes JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5.8 Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- 5.9 Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- 5.10 Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  minimum_order_amount NUMERIC CHECK (minimum_order_amount >= 0),
  maximum_discount NUMERIC CHECK (maximum_discount >= 0),
  usage_limit INTEGER CHECK (usage_limit > 0),
  per_user_limit INTEGER CHECK (per_user_limit > 0),
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_announcement BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.11 Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID,
  guest_email TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount NUMERIC NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  notes TEXT,
  tracking_number TEXT,
  customer_gst_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_email_or_user CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- 5.12 Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.13 Coupon Usages Table
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.14 Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.15 Returns Table
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  refund_amount NUMERIC CHECK (refund_amount >= 0),
  refund_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5.16 Shipping Zones Table
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  regions TEXT[] NOT NULL DEFAULT '{}',
  per_km_rate NUMERIC DEFAULT 0 CHECK (per_km_rate >= 0),
  free_shipping_threshold NUMERIC CHECK (free_shipping_threshold >= 0),
  distance_free_radius NUMERIC DEFAULT 5 CHECK (distance_free_radius >= 0),
  max_shipping_distance NUMERIC CHECK (max_shipping_distance >= 0),
  estimated_days_min INTEGER DEFAULT 3,
  estimated_days_max INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5.17 Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.18 Footer Items Table
CREATE TABLE IF NOT EXISTS public.footer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.19 Admin Notifications Table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.20 Admin Activity Logs Table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.21 About Content Table
CREATE TABLE IF NOT EXISTS public.about_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.22 Warranty Terms Table
CREATE TABLE IF NOT EXISTS public.warranty_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.23 Product Warranties Table
CREATE TABLE IF NOT EXISTS public.product_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  warranty_years INTEGER NOT NULL CHECK (warranty_years > 0 AND warranty_years <= 10),
  is_enabled BOOLEAN DEFAULT true,
  warranty_terms_id UUID REFERENCES public.warranty_terms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.24 Order Item Warranties Table (tracks warranty for each ordered item)
CREATE TABLE IF NOT EXISTS public.order_item_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warranty_years INTEGER NOT NULL,
  warranty_start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  warranty_end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SECTION 6: INDEXES
-- =====================================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons(UPPER(code)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_announcement ON coupons(is_announcement, is_active) WHERE is_announcement = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_expires ON coupons(expires_at) WHERE is_active = true;

-- Coupon Usages
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_coupon ON coupon_usages(user_id, coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order ON coupon_usages(order_id);

-- Cart Items
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);

-- Wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- Addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default) WHERE is_default = true;

-- About Content
CREATE INDEX IF NOT EXISTS idx_about_content_key ON about_content(section_key);
CREATE INDEX IF NOT EXISTS idx_about_content_active ON about_content(is_active) WHERE is_active = true;

-- =====================================================
-- SECTION 7: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 8: SECURITY FUNCTIONS
-- =====================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- =====================================================
-- SECTION 9: RLS POLICIES
-- =====================================================

-- 9.1 User Roles Policies
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (is_admin());

-- 9.2 Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());

-- 9.3 Addresses Policies
CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

-- 9.4 Categories Policies
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all categories" ON categories FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (is_admin());

-- 9.5 Products Policies
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all products" ON products FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (is_admin());

-- 9.6 Product Images Policies
CREATE POLICY "Anyone can view product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage product images" ON product_images FOR ALL USING (is_admin());

-- 9.7 Product Variants Policies
CREATE POLICY "Anyone can view active variants" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage variants" ON product_variants FOR ALL USING (is_admin());

-- 9.8 Cart Items Policies
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- 9.9 Wishlists Policies
CREATE POLICY "Users can manage own wishlists" ON wishlists FOR ALL USING (auth.uid() = user_id);

-- 9.10 Coupons Policies
CREATE POLICY "Anyone can view active announcement coupons" ON coupons FOR SELECT USING (is_active = true AND is_announcement = true);
CREATE POLICY "Only admins can view all coupons" ON coupons FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage coupons" ON coupons FOR ALL USING (is_admin());

-- 9.11 Orders Policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage orders" ON orders FOR ALL USING (is_admin());

-- 9.12 Order Items Policies
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create order items for own orders" ON order_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)));
CREATE POLICY "Admins can view all order items" ON order_items FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage order items" ON order_items FOR ALL USING (is_admin());

-- 9.13 Coupon Usages Policies
CREATE POLICY "Users can view own coupon usages" ON coupon_usages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage coupon usages" ON coupon_usages FOR ALL USING (is_admin());

-- 9.14 Reviews Policies
CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage reviews" ON reviews FOR ALL USING (is_admin());

-- 9.15 Returns Policies
CREATE POLICY "Users can view own returns" ON returns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create returns" ON returns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage returns" ON returns FOR ALL USING (is_admin());

-- 9.16 Shipping Zones Policies
CREATE POLICY "Anyone can view active shipping zones" ON shipping_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage shipping zones" ON shipping_zones FOR ALL USING (is_admin());

-- 9.17 Store Settings Policies
CREATE POLICY "Anyone can read store settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage store settings" ON store_settings FOR ALL USING (is_admin());

-- 9.18 Footer Items Policies
CREATE POLICY "Anyone can read active footer items" ON footer_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all footer items" ON footer_items FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage footer items" ON footer_items FOR ALL USING (is_admin());

-- 9.19 Admin Notifications Policies
CREATE POLICY "Admins can view notifications" ON admin_notifications FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage notifications" ON admin_notifications FOR ALL USING (is_admin());

-- 9.20 Admin Activity Logs Policies
CREATE POLICY "Admins can view activity logs" ON admin_activity_logs FOR SELECT USING (is_admin());
CREATE POLICY "Admins can create activity logs" ON admin_activity_logs FOR INSERT WITH CHECK (is_admin());

-- 9.21 About Content Policies
CREATE POLICY "Anyone can read about content" ON about_content FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all about content" ON about_content FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage about content" ON about_content FOR ALL USING (is_admin());

-- =====================================================
-- SECTION 10: DATABASE FUNCTIONS
-- =====================================================

-- 10.1 Generate Order Number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'GT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 10.2 Handle New User (Create Profile & Assign Role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT;
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get admin email from settings (set via Vault or config)
  admin_email := current_setting('app.settings.admin_email', true);
  
  -- Assign role based on email
  IF NEW.email = admin_email THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 10.3 Validate Coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT, 
  p_order_subtotal NUMERIC, 
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(valid BOOLEAN, discount_amount NUMERIC, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_discount DECIMAL(10,2);
  v_user_usage_count INT;
BEGIN
  -- Validate input
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 'Please enter a coupon code'::TEXT;
    RETURN;
  END IF;

  IF p_order_subtotal IS NULL OR p_order_subtotal <= 0 THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 'Invalid order amount'::TEXT;
    RETURN;
  END IF;

  -- Find coupon (case-insensitive)
  SELECT * INTO v_coupon FROM coupons
  WHERE UPPER(code) = UPPER(TRIM(p_code)) 
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (expires_at IS NULL OR expires_at > now());
  
  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 'Invalid or expired coupon code'::TEXT;
    RETURN;
  END IF;
  
  -- Check global usage limit
  IF v_coupon.usage_limit IS NOT NULL AND COALESCE(v_coupon.used_count, 0) >= v_coupon.usage_limit THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 'Coupon usage limit reached'::TEXT;
    RETURN;
  END IF;
  
  -- Check per-user usage limit
  IF v_coupon.per_user_limit IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM coupon_usages 
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_coupon.per_user_limit THEN
      RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 
        ('You have already used this coupon ' || v_coupon.per_user_limit || ' time(s)')::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check minimum order amount
  IF v_coupon.minimum_order_amount IS NOT NULL AND p_order_subtotal < v_coupon.minimum_order_amount THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 
      ('Minimum order amount of ₹' || v_coupon.minimum_order_amount || ' required')::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := ROUND(p_order_subtotal * (v_coupon.discount_value / 100), 2);
    IF v_coupon.maximum_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.maximum_discount);
    END IF;
  ELSE -- fixed amount
    v_discount := LEAST(v_coupon.discount_value, p_order_subtotal);
  END IF;
  
  RETURN QUERY SELECT true::BOOLEAN, v_discount, 'Coupon applied successfully!'::TEXT;
END;
$$;

-- 10.4 Create Order with Items (Atomic Transaction)
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id UUID, 
  p_guest_email TEXT, 
  p_shipping_address JSONB, 
  p_items JSONB, 
  p_discount_amount NUMERIC DEFAULT 0, 
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product RECORD;
  v_subtotal DECIMAL(10,2) := 0;
  v_tax_amount DECIMAL(10,2);
  v_shipping_amount DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
  v_discount DECIMAL(10,2) := COALESCE(p_discount_amount, 0);
  v_coupon_id UUID;
  v_free_threshold NUMERIC := 10000;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL AND (p_guest_email IS NULL OR TRIM(p_guest_email) = '') THEN
    RAISE EXCEPTION 'Either user_id or guest_email is required';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF p_shipping_address IS NULL THEN
    RAISE EXCEPTION 'Shipping address is required';
  END IF;

  -- Calculate subtotal and validate stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products 
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;
    
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;
    
    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product % is no longer available', v_product.name;
    END IF;
    
    IF v_product.stock_quantity < (v_item->>'quantity')::INT THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
        v_product.name, v_product.stock_quantity, (v_item->>'quantity')::INT;
    END IF;
    
    v_subtotal := v_subtotal + (v_product.price * (v_item->>'quantity')::INT);
  END LOOP;

  -- Calculate amounts
  -- NOTE: v_tax_amount is set to 0 because product prices are already GST-inclusive
  -- No additional tax calculation needed in the new GST model
  v_tax_amount := 0;
  
  -- Calculate shipping based on free_shipping_threshold from active shipping zone
  -- Default fallback: free shipping above 10000, else 500 base rate
  SELECT COALESCE(free_shipping_threshold, 10000)::NUMERIC INTO v_free_threshold 
  FROM shipping_zones 
  WHERE is_active = true 
  LIMIT 1;
  
  v_shipping_amount := CASE WHEN v_subtotal >= v_free_threshold THEN 0 ELSE 500 END;
  v_discount := LEAST(v_discount, v_subtotal);
  v_total_amount := v_subtotal + v_shipping_amount - v_discount;

  -- Update coupon usage
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) != '' AND v_discount > 0 THEN
    SELECT id INTO v_coupon_id FROM coupons WHERE UPPER(code) = UPPER(TRIM(p_coupon_code));
    
    IF v_coupon_id IS NOT NULL THEN
      UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE id = v_coupon_id;
      
      IF p_user_id IS NOT NULL THEN
        INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES (v_coupon_id, p_user_id, NULL);
      END IF;
    END IF;
  END IF;

  -- Create order
  INSERT INTO orders (
    order_number, user_id, guest_email, subtotal, tax_amount, shipping_amount,
    discount_amount, total_amount, shipping_address, status, payment_status
  ) VALUES (
    'TEMP-' || extract(epoch from now())::text,
    p_user_id,
    CASE WHEN p_user_id IS NULL THEN p_guest_email ELSE NULL END,
    v_subtotal, v_tax_amount, v_shipping_amount, v_discount, v_total_amount,
    p_shipping_address, 'pending', 'pending'
  ) RETURNING id INTO v_order_id;

  -- Update coupon usage with order_id
  IF v_coupon_id IS NOT NULL AND p_user_id IS NOT NULL THEN
    UPDATE coupon_usages SET order_id = v_order_id 
    WHERE coupon_id = v_coupon_id AND user_id = p_user_id AND order_id IS NULL;
  END IF;

  -- Process items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    
    UPDATE products 
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT, updated_at = now()
    WHERE id = v_product.id;
    
    INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.sku, (v_item->>'quantity')::INT, 
            v_product.price, v_product.price * (v_item->>'quantity')::INT);
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- 10.5 Create Admin Notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type TEXT, 
  p_title TEXT, 
  p_message TEXT, 
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO admin_notifications (type, title, message, data)
  VALUES (p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 10.6 Notify New Order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_admin_notification(
    'new_order',
    'New Order Received',
    'Order ' || NEW.order_number || ' has been placed for ₹' || NEW.total_amount,
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'total', NEW.total_amount)
  );
  RETURN NEW;
END;
$$;

-- 10.7 Check Low Stock
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_quantity <= COALESCE(NEW.low_stock_threshold, 5) AND 
     (OLD.stock_quantity IS NULL OR OLD.stock_quantity > COALESCE(OLD.low_stock_threshold, 5)) THEN
    PERFORM create_admin_notification(
      'low_stock',
      'Low Stock Alert',
      NEW.name || ' is running low on stock (' || NEW.stock_quantity || ' remaining)',
      jsonb_build_object('product_id', NEW.id, 'product_name', NEW.name, 'stock', NEW.stock_quantity)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 10.8 Log Admin Activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action TEXT, 
  p_entity_type TEXT, 
  p_entity_id TEXT DEFAULT NULL, 
  p_old_values JSONB DEFAULT NULL, 
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_activity_logs (admin_user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old_values, p_new_values)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 10.9 Check Stock Before Order Item
CREATE OR REPLACE FUNCTION public.check_stock_before_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT stock_quantity FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product';
  END IF;
  RETURN NEW;
END;
$$;

-- 10.10 Get Coupon by Code (Helper)
CREATE OR REPLACE FUNCTION public.get_coupon_by_code(p_code TEXT)
RETURNS TABLE(
  id UUID,
  code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  minimum_order_amount NUMERIC,
  maximum_discount NUMERIC,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT c.id, c.code, c.discount_type, c.discount_value, 
         c.minimum_order_amount, c.maximum_discount, c.is_active, c.expires_at
  FROM coupons c
  WHERE UPPER(c.code) = UPPER(TRIM(p_code));
END;
$$;

-- =====================================================
-- SECTION 11: TRIGGERS
-- =====================================================

-- Order Number Generation
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- New User Handler
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- New Order Notification
DROP TRIGGER IF EXISTS on_new_order ON orders;
CREATE TRIGGER on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_order();

-- Low Stock Alert
DROP TRIGGER IF EXISTS on_low_stock ON products;
CREATE TRIGGER on_low_stock
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Stock Validation Before Order Item
DROP TRIGGER IF EXISTS validate_stock_before_order_item ON order_items;
CREATE TRIGGER validate_stock_before_order_item
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_before_order_item();

-- Updated At Triggers
CREATE OR REPLACE FUNCTION create_updated_at_trigger(table_name TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('
    DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
    CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  ', table_name, table_name, table_name, table_name);
END;
$$ LANGUAGE plpgsql;

SELECT create_updated_at_trigger('profiles');
SELECT create_updated_at_trigger('addresses');
SELECT create_updated_at_trigger('categories');
SELECT create_updated_at_trigger('products');
SELECT create_updated_at_trigger('product_variants');
SELECT create_updated_at_trigger('cart_items');
SELECT create_updated_at_trigger('coupons');
SELECT create_updated_at_trigger('orders');
SELECT create_updated_at_trigger('reviews');
SELECT create_updated_at_trigger('returns');
SELECT create_updated_at_trigger('shipping_zones');
SELECT create_updated_at_trigger('store_settings');
SELECT create_updated_at_trigger('footer_items');
SELECT create_updated_at_trigger('about_content');

DROP FUNCTION create_updated_at_trigger(TEXT);

-- =====================================================
-- SECTION 12: STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Public read access for category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Admins can manage category images"
ON storage.objects FOR ALL
USING (bucket_id = 'category-images' AND public.is_admin());

CREATE POLICY "Public read access for site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can manage site assets"
ON storage.objects FOR ALL
USING (bucket_id = 'site-assets' AND public.is_admin());

-- =====================================================
-- SECTION 13: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(UUID, TEXT, JSONB, JSONB, NUMERIC, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coupon_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_order_total(NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_products_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_orders_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_revenue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_products(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_selling_products(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_stock_after_return(UUID, BOOLEAN) TO authenticated;

-- =====================================================
-- SECTION 14: DEFAULT STORE SETTINGS & DATA
-- =====================================================

INSERT INTO store_settings (key, value, type) VALUES
  ('store_name', 'Gupta Traders', 'text'),
  ('store_email', 'support@guptatraders.com', 'text'),
  ('store_phone', '+91 9876543210', 'text'),
  ('store_address', 'Gupta Trading Company, Main Street, City, State, India', 'text'),
  ('gst_number', '', 'text'),
  ('tax_rate', '18', 'text'),
  ('auto_cancel_days', '7', 'text'),
  ('enable_order_notifications', 'true', 'boolean'),
  ('enable_low_stock_alerts', 'true', 'boolean'),
  ('low_stock_threshold', '5', 'text'),
  ('site_logo_url', '', 'text'),
  ('facebook_url', '', 'text'),
  ('instagram_url', '', 'text'),
  ('twitter_url', '', 'text'),
  ('order_confirmation_email', 'true', 'boolean'),
  ('shipping_confirmation_email', 'true', 'boolean'),
  ('return_window_days', '30', 'text'),
  ('max_return_items', '10', 'text'),
  ('warranty_terms', '', 'text')
ON CONFLICT (key) DO NOTHING;

-- Insert default about content
INSERT INTO about_content (section_key, title, content, sort_order, is_active) VALUES
  ('hero_title', 'Crafting Beautiful Spaces Since 1985', NULL, 1, true),
  ('hero_subtitle', 'Premium furniture for modern living', NULL, 2, true),
  ('story_title', 'Our Story', 'Discover our journey in creating exceptional furniture', 3, true),
  ('story_content', 'With over 35 years of experience, we pride ourselves on delivering quality and craftsmanship.', NULL, 4, true),
  ('owner_name', 'Founder Name', NULL, 5, true),
  ('owner_title', 'Founder & CEO', NULL, 6, true),
  ('owner_quote', 'Quality is our commitment to you.', NULL, 7, true),
  ('showroom_title', 'Visit Our Showroom', NULL, 8, true),
  ('showroom_subtitle', 'Experience our collection in person', NULL, 9, true),
  ('stat_years', '35+', 'Years', 10, true),
  ('stat_customers', '50K+', 'Happy Customers', 11, true),
  ('stat_products', '100K+', 'Products Delivered', 12, true),
  ('stat_cities', '200+', 'Cities Served', 13, true)
ON CONFLICT (section_key) DO NOTHING;

-- Insert default footer items
INSERT INTO footer_items (section, title, url, sort_order, is_active) VALUES
  ('quick_links', 'Home', '/', 1, true),
  ('quick_links', 'Products', '/products', 2, true),
  ('quick_links', 'About Us', '/about', 3, true),
  ('quick_links', 'Contact', '/contact', 4, true),
  ('customer_service', 'Shipping Policy', '/shipping-policy', 1, true),
  ('customer_service', 'Returns & Refunds', '/returns-refunds', 2, true),
  ('customer_service', 'FAQ', '/faq', 3, true),
  ('customer_service', 'Support', '/support', 4, true),
  ('about', 'About Us', '/about', 1, true),
  ('about', 'Careers', '/careers', 2, true),
  ('about', 'Blog', '/blog', 3, true),
  ('legal', 'Terms of Service', '/terms', 1, true),
  ('legal', 'Privacy Policy', '/privacy', 2, true),
  ('legal', 'Cookie Policy', '/cookies', 3, true),
  ('legal', 'Disclaimer', '/disclaimer', 4, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 15: ADDITIONAL HELPER FUNCTIONS
-- =====================================================

-- 10.11 Calculate Total Price for Order
CREATE OR REPLACE FUNCTION public.calculate_order_total(
  p_subtotal NUMERIC,
  p_tax_rate NUMERIC DEFAULT 18
)
RETURNS TABLE(
  subtotal NUMERIC,
  tax_amount NUMERIC,
  shipping_amount NUMERIC,
  total_with_tax NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tax DECIMAL(10,2);
  v_shipping DECIMAL(10,2);
BEGIN
  v_tax := ROUND(p_subtotal * (p_tax_rate / 100), 2);
  v_shipping := CASE WHEN p_subtotal >= 10000 THEN 0 ELSE 500 END;
  
  RETURN QUERY SELECT 
    p_subtotal,
    v_tax,
    v_shipping,
    p_subtotal + v_tax + v_shipping;
END;
$$;

-- 10.12 Get Active Products Count
CREATE OR REPLACE FUNCTION public.get_active_products_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM products WHERE is_active = true;
$$;

-- 10.13 Get Total Orders Count
CREATE OR REPLACE FUNCTION public.get_total_orders_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM orders;
$$;

-- 10.14 Get Total Revenue
CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid';
$$;

-- 10.15 Get Low Stock Products
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
RETURNS TABLE(
  id UUID,
  name TEXT,
  stock_quantity INTEGER,
  low_stock_threshold INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, stock_quantity, low_stock_threshold
  FROM products
  WHERE stock_quantity <= COALESCE(low_stock_threshold, 5)
  AND is_active = true
  ORDER BY stock_quantity ASC;
$$;

-- 10.16 Search Products
CREATE OR REPLACE FUNCTION public.search_products(p_query TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.name, p.short_description, p.price,
    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1)
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.is_active = true
    AND (
      p.name ILIKE '%' || p_query || '%'
      OR p.description ILIKE '%' || p_query || '%'
      OR c.name ILIKE '%' || p_query || '%'
    )
  ORDER BY p.name ASC
  LIMIT 50;
$$;

-- 10.17 Get Best Selling Products
CREATE OR REPLACE FUNCTION public.get_best_selling_products(p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID,
  name TEXT,
  total_sold INTEGER,
  revenue NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, SUM(oi.quantity)::INTEGER, SUM(oi.total_price)
  FROM products p
  LEFT JOIN order_items oi ON p.id = oi.product_id
  LEFT JOIN orders o ON oi.order_id = o.id
  WHERE o.payment_status = 'paid' OR o IS NULL
  GROUP BY p.id, p.name
  ORDER BY SUM(oi.quantity) DESC NULLS LAST
  LIMIT p_limit;
$$;

-- 10.18 Update Product Stock After Return
CREATE OR REPLACE FUNCTION public.update_stock_after_return(
  p_return_id UUID,
  p_approve BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return_record RECORD;
  v_order_item RECORD;
BEGIN
  IF NOT p_approve THEN
    RETURN false;
  END IF;
  
  SELECT * INTO v_return_record FROM returns WHERE id = p_return_id;
  
  FOR v_order_item IN
    SELECT * FROM order_items WHERE order_id = v_return_record.order_id
  LOOP
    UPDATE products 
    SET stock_quantity = stock_quantity + v_order_item.quantity
    WHERE id = v_order_item.product_id;
  END LOOP;
  
  UPDATE returns SET status = 'approved' WHERE id = p_return_id;
  RETURN true;
END;
$$;

-- =====================================================
-- SECTION 15: DOCUMENTATION COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.validate_coupon IS 'Validates a coupon code against order subtotal. Handles percentage/fixed discounts, usage limits, and per-user limits.';
COMMENT ON FUNCTION public.create_order_with_items IS 'Atomically creates an order with items, validates stock, applies discounts, and updates inventory.';
COMMENT ON FUNCTION public.is_admin IS 'Checks if the current authenticated user has admin role.';
COMMENT ON FUNCTION public.has_role IS 'Checks if a specific user has a specific role.';
COMMENT ON FUNCTION public.calculate_order_total IS 'Calculates order total with tax and shipping based on subtotal.';
COMMENT ON FUNCTION public.get_active_products_count IS 'Returns count of all active products in the system.';
COMMENT ON FUNCTION public.get_total_orders_count IS 'Returns total number of orders placed.';
COMMENT ON FUNCTION public.get_total_revenue IS 'Returns total revenue from paid orders.';
COMMENT ON FUNCTION public.get_low_stock_products IS 'Returns list of products with stock below threshold.';
COMMENT ON FUNCTION public.search_products IS 'Full-text search for products by name, description, or category.';
COMMENT ON FUNCTION public.get_best_selling_products IS 'Returns best-selling products sorted by total quantity sold.';
COMMENT ON FUNCTION public.update_stock_after_return IS 'Updates product stock when a return is approved.';

COMMENT ON TABLE public.about_content IS 'Stores editable content for the About page including hero, story, owner, showroom, and stats sections.';
COMMENT ON TABLE public.store_settings IS 'Key-value store for global store configuration and settings.';
COMMENT ON TABLE public.footer_items IS 'Manages footer navigation links organized by section.';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Database setup is now complete!
-- 
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Update admin email in handle_new_user function settings
-- 3. Configure storage bucket permissions in Supabase console
-- 4. Set up Firebase if needed (optional)
-- 5. Initialize default product categories
-- 6. Test admin login and product creation
-- 7. Configure email notifications if required
--
-- Features Included:
-- ✓ Complete e-commerce schema
-- ✓ User authentication & roles
-- ✓ Product management with images & variants
-- ✓ Shopping cart & wishlists
-- ✓ Order management with status tracking
-- ✓ Coupon & discount system
-- ✓ Return management
-- ✓ Warranty system
-- ✓ Shipping zones
-- ✓ Admin notifications & activity logs
-- ✓ About page content management
-- ✓ Footer management
-- ✓ Row-level security (RLS)
-- ✓ Comprehensive triggers & functions
-- ✓ Production-ready database design
