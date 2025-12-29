
-- =====================================================
-- PRODUCTION-READY DATABASE MIGRATION SCRIPT
-- Ensures robust coupon fetching and error-free operations
-- =====================================================

-- 1. Drop and recreate validate_coupon function with improved error handling
DROP FUNCTION IF EXISTS public.validate_coupon(text, numeric);
DROP FUNCTION IF EXISTS public.validate_coupon(text, numeric, uuid);

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text, 
  p_order_subtotal numeric, 
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(valid boolean, discount_amount numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Check per-user usage limit (only if user is logged in)
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
    v_discount := LEAST(v_coupon.discount_value, p_order_subtotal); -- Can't discount more than order total
  END IF;
  
  RETURN QUERY SELECT true::BOOLEAN, v_discount, 'Coupon applied successfully!'::TEXT;
END;
$$;

-- 2. Drop and recreate create_order_with_items with improved handling
DROP FUNCTION IF EXISTS public.create_order_with_items(uuid, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.create_order_with_items(uuid, text, jsonb, jsonb, numeric, text);

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
SET search_path TO 'public'
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
  v_tax_amount := ROUND(v_subtotal * 0.18, 2); -- 18% GST
  v_shipping_amount := CASE WHEN v_subtotal >= 10000 THEN 0 ELSE 500 END;
  
  -- Ensure discount doesn't exceed subtotal
  v_discount := LEAST(v_discount, v_subtotal);
  
  v_total_amount := v_subtotal + v_tax_amount + v_shipping_amount - v_discount;

  -- Update coupon usage if a coupon was applied
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) != '' AND v_discount > 0 THEN
    SELECT id INTO v_coupon_id FROM coupons WHERE UPPER(code) = UPPER(TRIM(p_coupon_code));
    
    IF v_coupon_id IS NOT NULL THEN
      UPDATE coupons 
      SET used_count = COALESCE(used_count, 0) + 1
      WHERE id = v_coupon_id;
      
      -- Track per-user usage if user is logged in
      IF p_user_id IS NOT NULL THEN
        INSERT INTO coupon_usages (coupon_id, user_id, order_id)
        VALUES (v_coupon_id, p_user_id, NULL); -- order_id will be updated below
      END IF;
    END IF;
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
    shipping_address,
    status,
    payment_status
  ) VALUES (
    'TEMP-' || extract(epoch from now())::text, -- Will be replaced by trigger
    p_user_id,
    CASE WHEN p_user_id IS NULL THEN p_guest_email ELSE NULL END,
    v_subtotal,
    v_tax_amount,
    v_shipping_amount,
    v_discount,
    v_total_amount,
    p_shipping_address,
    'pending',
    'pending'
  ) RETURNING id INTO v_order_id;

  -- Update coupon usage with order_id
  IF v_coupon_id IS NOT NULL AND p_user_id IS NOT NULL THEN
    UPDATE coupon_usages 
    SET order_id = v_order_id 
    WHERE coupon_id = v_coupon_id 
      AND user_id = p_user_id 
      AND order_id IS NULL;
  END IF;

  -- Process each item atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product FROM products 
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;
    
    -- Deduct stock
    UPDATE products 
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::INT,
        updated_at = now()
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

-- 3. Create index for faster coupon lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons (UPPER(code)) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_announcement ON coupons (is_announcement, is_active) WHERE is_announcement = true AND is_active = true;

-- 4. Create index for faster coupon usage checks
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_coupon ON coupon_usages (user_id, coupon_id);

-- 5. Ensure RLS policy for coupon validation allows public access for active announcement coupons
-- (Already exists, but let's make sure it's correct)
DROP POLICY IF EXISTS "Anyone can view active announcement coupons" ON coupons;
CREATE POLICY "Anyone can view active announcement coupons" 
ON coupons 
FOR SELECT 
USING (is_active = true AND is_announcement = true);

-- 6. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(uuid, text, jsonb, jsonb, numeric, text) TO anon, authenticated;

-- 7. Create helper function to get coupon by code (for admin use)
CREATE OR REPLACE FUNCTION public.get_coupon_by_code(p_code text)
RETURNS TABLE(
  id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  minimum_order_amount numeric,
  maximum_discount numeric,
  is_active boolean,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.id,
    c.code,
    c.discount_type,
    c.discount_value,
    c.minimum_order_amount,
    c.maximum_discount,
    c.is_active,
    c.expires_at
  FROM coupons c
  WHERE UPPER(c.code) = UPPER(TRIM(p_code));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coupon_by_code(text) TO authenticated;

-- 8. Add comment for documentation
COMMENT ON FUNCTION public.validate_coupon IS 'Validates a coupon code against order subtotal and returns discount amount. Handles percentage and fixed discounts, usage limits, and per-user limits.';
COMMENT ON FUNCTION public.create_order_with_items IS 'Atomically creates an order with items, validates stock, applies discounts, and updates inventory. Returns the new order UUID.';
