# Supabase Migration Guide

This guide contains all SQL scripts and instructions to migrate your Lovable Cloud database to a standalone Supabase project.

## Prerequisites

1. Create a new Supabase project at https://supabase.com
2. Note your new project's URL and anon key
3. Access the SQL Editor in your new Supabase dashboard

## Step 1: Export Data from Current Database

Before running migration scripts, export your existing data. Use the Supabase dashboard or run these queries to get CSV exports:

```sql
-- Export each table's data (run in SQL editor, then export results)
SELECT * FROM profiles;
SELECT * FROM user_roles;
SELECT * FROM categories;
SELECT * FROM products;
SELECT * FROM product_images;
SELECT * FROM product_variants;
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM addresses;
SELECT * FROM cart_items;
SELECT * FROM wishlists;
SELECT * FROM reviews;
SELECT * FROM coupons;
SELECT * FROM shipping_zones;
SELECT * FROM returns;
SELECT * FROM store_settings;
SELECT * FROM footer_items;
SELECT * FROM admin_notifications;
SELECT * FROM admin_activity_logs;
```

## Step 2: Create Enums

Run this first to create the required enum types:

```sql
-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
```

## Step 3: Create Sequences

```sql
-- Create order number sequence
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
```

## Step 4: Create Tables

```sql
-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  phone text,
  avatar_url text,
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- USER ROLES TABLE
-- ==========================================
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'customer'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ==========================================
-- CATEGORIES TABLE
-- ==========================================
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  parent_id uuid REFERENCES public.categories(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  sku text,
  barcode text,
  price numeric NOT NULL,
  compare_at_price numeric,
  cost_price numeric,
  category_id uuid REFERENCES public.categories(id),
  material text,
  dimensions text,
  color text,
  room_type text,
  weight numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  meta_title text,
  meta_description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- PRODUCT IMAGES TABLE
-- ==========================================
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- PRODUCT VARIANTS TABLE
-- ==========================================
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price_modifier numeric DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  attributes jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- ADDRESSES TABLE
-- ==========================================
CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  user_id uuid,
  guest_email text,
  status order_status NOT NULL DEFAULT 'pending'::order_status,
  payment_status payment_status NOT NULL DEFAULT 'pending'::payment_status,
  subtotal numeric NOT NULL,
  tax_amount numeric NOT NULL DEFAULT 0,
  shipping_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  shipping_address jsonb NOT NULL,
  billing_address jsonb,
  tracking_number text,
  notes text,
  customer_gst_number text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  product_sku text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- CART ITEMS TABLE
-- ==========================================
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- WISHLISTS TABLE
-- ==========================================
CREATE TABLE public.wishlists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- REVIEWS TABLE
-- ==========================================
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  is_approved boolean DEFAULT false,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- COUPONS TABLE
-- ==========================================
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  minimum_order_amount numeric,
  maximum_discount numeric,
  usage_limit integer,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_announcement boolean DEFAULT false,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- SHIPPING ZONES TABLE
-- ==========================================
CREATE TABLE public.shipping_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  regions text[] NOT NULL DEFAULT '{}',
  base_rate numeric NOT NULL DEFAULT 0,
  per_kg_rate numeric DEFAULT 0,
  free_shipping_threshold numeric,
  estimated_days_min integer DEFAULT 3,
  estimated_days_max integer DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- RETURNS TABLE
-- ==========================================
CREATE TABLE public.returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  refund_amount numeric,
  refund_status text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- STORE SETTINGS TABLE
-- ==========================================
CREATE TABLE public.store_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  type text NOT NULL DEFAULT 'text',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- FOOTER ITEMS TABLE
-- ==========================================
CREATE TABLE public.footer_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section text NOT NULL,
  title text NOT NULL,
  url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==========================================
-- ADMIN NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- ADMIN ACTIVITY LOGS TABLE
-- ==========================================
CREATE TABLE public.admin_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);
```

## Step 5: Create Functions

```sql
-- ==========================================
-- UPDATE TIMESTAMP FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================
-- HAS ROLE FUNCTION (Security Definer)
-- ==========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- ==========================================
-- IS ADMIN FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- ==========================================
-- GENERATE ORDER NUMBER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'GT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================
-- HANDLE NEW USER FUNCTION
-- ==========================================
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
  
  -- Get admin email from settings (set this in your Supabase project settings)
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

-- ==========================================
-- CREATE ADMIN NOTIFICATION FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type text, 
  p_title text, 
  p_message text, 
  p_data jsonb DEFAULT NULL
)
RETURNS uuid
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

-- ==========================================
-- LOG ADMIN ACTIVITY FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action text, 
  p_entity_type text, 
  p_entity_id text DEFAULT NULL, 
  p_old_values jsonb DEFAULT NULL, 
  p_new_values jsonb DEFAULT NULL
)
RETURNS uuid
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

-- ==========================================
-- CHECK LOW STOCK FUNCTION
-- ==========================================
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

-- ==========================================
-- NOTIFY NEW ORDER FUNCTION
-- ==========================================
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

-- ==========================================
-- VALIDATE COUPON FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_order_subtotal numeric)
RETURNS TABLE(valid boolean, discount_amount numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_discount DECIMAL;
BEGIN
  -- Find coupon
  SELECT * INTO v_coupon FROM coupons
  WHERE code = p_code AND is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (expires_at IS NULL OR expires_at > now());
  
  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 'Invalid or expired coupon code'::TEXT;
    RETURN;
  END IF;
  
  -- Check global usage limit
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, 'Coupon usage limit reached'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum order amount
  IF v_coupon.minimum_order_amount IS NOT NULL AND p_order_subtotal < v_coupon.minimum_order_amount THEN
    RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, ('Minimum order amount of ' || v_coupon.minimum_order_amount || ' required')::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := p_order_subtotal * (v_coupon.discount_value / 100);
    IF v_coupon.maximum_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.maximum_discount);
    END IF;
  ELSE -- fixed
    v_discount := v_coupon.discount_value;
  END IF;
  
  RETURN QUERY SELECT true::BOOLEAN, v_discount, 'Coupon applied successfully'::TEXT;
END;
$$;

-- ==========================================
-- CREATE ORDER WITH ITEMS FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id uuid, 
  p_guest_email text, 
  p_shipping_address jsonb, 
  p_items jsonb, 
  p_discount_amount numeric DEFAULT 0, 
  p_coupon_code text DEFAULT NULL
)
RETURNS uuid
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
BEGIN
  -- Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Calculate subtotal and validate stock for each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Lock the product row for update to prevent race conditions
    SELECT * INTO v_product FROM products 
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;
    
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'product_id';
    END IF;
    
    IF v_product.stock_quantity < (v_item->>'quantity')::INT THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
    END IF;
    
    v_subtotal := v_subtotal + (v_product.price * (v_item->>'quantity')::INT);
  END LOOP;

  -- Calculate amounts
  v_tax_amount := v_subtotal * 0.18; -- 18% GST
  v_shipping_amount := CASE WHEN v_subtotal >= 10000 THEN 0 ELSE 500 END;
  v_total_amount := v_subtotal + v_tax_amount + v_shipping_amount - v_discount;

  -- Update coupon usage if a coupon was applied
  IF p_coupon_code IS NOT NULL AND v_discount > 0 THEN
    UPDATE coupons 
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE code = p_coupon_code;
  END IF;

  -- Create the order
  INSERT INTO orders (
    order_number,
    user_id,
    guest_email,
    subtotal,
    tax_amount,
    shipping_amount,
    discount_amount,
    total_amount,
    shipping_address
  ) VALUES (
    'TEMP-' || extract(epoch from now())::text,
    p_user_id,
    p_guest_email,
    v_subtotal,
    v_tax_amount,
    v_shipping_amount,
    v_discount,
    v_total_amount,
    p_shipping_address
  ) RETURNING id INTO v_order_id;

  -- Process each item atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products 
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;
    
    -- Deduct stock
    UPDATE products 
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT
    WHERE id = v_product.id;
    
    -- Create order item
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.sku,
      (v_item->>'quantity')::INT,
      v_product.price,
      v_product.price * (v_item->>'quantity')::INT
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;
```

## Step 6: Create Triggers

```sql
-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON shipping_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_footer_items_updated_at BEFORE UPDATE ON footer_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order number generation trigger
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- New user trigger (on auth.users)
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Low stock notification trigger
CREATE TRIGGER check_low_stock_trigger AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- New order notification trigger
CREATE TRIGGER notify_new_order_trigger AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION notify_new_order();
```

## Step 7: Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE footer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
```

## Step 8: Create RLS Policies

```sql
-- ==========================================
-- PROFILES POLICIES
-- ==========================================
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());

-- ==========================================
-- USER ROLES POLICIES
-- ==========================================
CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (is_admin());

-- ==========================================
-- CATEGORIES POLICIES
-- ==========================================
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all categories" ON categories FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (is_admin());

-- ==========================================
-- PRODUCTS POLICIES
-- ==========================================
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all products" ON products FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (is_admin());

-- ==========================================
-- PRODUCT IMAGES POLICIES
-- ==========================================
CREATE POLICY "Anyone can view product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage product images" ON product_images FOR ALL USING (is_admin());

-- ==========================================
-- PRODUCT VARIANTS POLICIES
-- ==========================================
CREATE POLICY "Anyone can view active variants" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage variants" ON product_variants FOR ALL USING (is_admin());

-- ==========================================
-- ADDRESSES POLICIES
-- ==========================================
CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- ORDERS POLICIES
-- ==========================================
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage orders" ON orders FOR ALL USING (is_admin());

-- ==========================================
-- ORDER ITEMS POLICIES
-- ==========================================
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create order items for own orders" ON order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND ((orders.user_id = auth.uid()) OR (orders.user_id IS NULL))));
CREATE POLICY "Admins can view all order items" ON order_items FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage order items" ON order_items FOR ALL USING (is_admin());

-- ==========================================
-- CART ITEMS POLICIES
-- ==========================================
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- WISHLISTS POLICIES
-- ==========================================
CREATE POLICY "Users can manage own wishlists" ON wishlists FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- REVIEWS POLICIES
-- ==========================================
CREATE POLICY "Anyone can view approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage reviews" ON reviews FOR ALL USING (is_admin());

-- ==========================================
-- COUPONS POLICIES
-- ==========================================
CREATE POLICY "Only admins can view all coupons" ON coupons FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage coupons" ON coupons FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view active announcement coupons" ON coupons FOR SELECT USING (is_active = true AND is_announcement = true);

-- ==========================================
-- SHIPPING ZONES POLICIES
-- ==========================================
CREATE POLICY "Anyone can view active shipping zones" ON shipping_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage shipping zones" ON shipping_zones FOR ALL USING (is_admin());

-- ==========================================
-- RETURNS POLICIES
-- ==========================================
CREATE POLICY "Users can view own returns" ON returns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create returns" ON returns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage returns" ON returns FOR ALL USING (is_admin());

-- ==========================================
-- STORE SETTINGS POLICIES
-- ==========================================
CREATE POLICY "Anyone can read store settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage store settings" ON store_settings FOR ALL USING (is_admin());

-- ==========================================
-- FOOTER ITEMS POLICIES
-- ==========================================
CREATE POLICY "Anyone can read active footer items" ON footer_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all footer items" ON footer_items FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage footer items" ON footer_items FOR ALL USING (is_admin());

-- ==========================================
-- ADMIN NOTIFICATIONS POLICIES
-- ==========================================
CREATE POLICY "Admins can view notifications" ON admin_notifications FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage notifications" ON admin_notifications FOR ALL USING (is_admin());

-- ==========================================
-- ADMIN ACTIVITY LOGS POLICIES
-- ==========================================
CREATE POLICY "Admins can view activity logs" ON admin_activity_logs FOR SELECT USING (is_admin());
CREATE POLICY "Admins can create activity logs" ON admin_activity_logs FOR INSERT WITH CHECK (is_admin());
```

## Step 9: Create Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true);

-- Storage policies for product-images
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admins can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND (SELECT is_admin()));
CREATE POLICY "Admins can update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND (SELECT is_admin()));
CREATE POLICY "Admins can delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND (SELECT is_admin()));

-- Storage policies for category-images
CREATE POLICY "Anyone can view category images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "Admins can upload category images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-images' AND (SELECT is_admin()));
CREATE POLICY "Admins can update category images" ON storage.objects FOR UPDATE USING (bucket_id = 'category-images' AND (SELECT is_admin()));
CREATE POLICY "Admins can delete category images" ON storage.objects FOR DELETE USING (bucket_id = 'category-images' AND (SELECT is_admin()));

-- Storage policies for site-assets
CREATE POLICY "Anyone can view site assets" ON storage.objects FOR SELECT USING (bucket_id = 'site-assets');
CREATE POLICY "Admins can upload site assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-assets' AND (SELECT is_admin()));
CREATE POLICY "Admins can update site assets" ON storage.objects FOR UPDATE USING (bucket_id = 'site-assets' AND (SELECT is_admin()));
CREATE POLICY "Admins can delete site assets" ON storage.objects FOR DELETE USING (bucket_id = 'site-assets' AND (SELECT is_admin()));
```

## Step 10: Configure Admin Email

In your new Supabase project, set the admin email configuration:

1. Go to **Project Settings** → **Database** → **Database Settings**
2. Add this to the `postgresql.conf` or use:

```sql
-- Set admin email (replace with your admin email)
ALTER DATABASE postgres SET app.settings.admin_email = 'your-admin@email.com';
```

## Step 11: Import Data

After running all schema scripts, import your exported data using the Supabase dashboard's CSV import feature or use INSERT statements:

```sql
-- Example: Import store settings
INSERT INTO store_settings (key, value, type) VALUES
  ('store_name', 'Your Store Name', 'text'),
  ('store_email', 'contact@yourstore.com', 'text'),
  ('store_phone', '+91 1234567890', 'text'),
  ('gst_number', 'XXXXXXXXXXXX', 'text');

-- Import other data from your exported CSVs...
```

## Step 12: Update Application Configuration

Update your application's `.env` file with the new Supabase credentials:

```env
VITE_SUPABASE_URL="https://your-new-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
VITE_SUPABASE_PROJECT_ID="your-new-project-id"
```

## Step 13: Configure Authentication

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production URL
3. Add redirect URLs for your domains

## Step 14: Enable Leaked Password Protection (Recommended)

1. Go to **Authentication** → **Providers** → **Email**
2. Enable "Leaked Password Protection"

## Verification Checklist

- [ ] All enums created
- [ ] All tables created with correct columns
- [ ] All functions created
- [ ] All triggers attached
- [ ] RLS enabled on all tables
- [ ] All RLS policies created
- [ ] Storage buckets created with policies
- [ ] Admin email configured
- [ ] Data imported successfully
- [ ] Application environment updated
- [ ] Authentication configured
- [ ] Test login/signup works
- [ ] Test admin access works
- [ ] Test product viewing works
- [ ] Test order creation works
