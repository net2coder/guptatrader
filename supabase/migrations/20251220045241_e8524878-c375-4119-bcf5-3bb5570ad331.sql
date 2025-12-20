-- Fix 1: Replace the permissive order_items INSERT policy with proper authorization
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

CREATE POLICY "Users can create order items for own orders" ON public.order_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
    )
  );

-- Fix 2: Create atomic order creation function to prevent race conditions
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id UUID,
  p_guest_email TEXT,
  p_shipping_address JSONB,
  p_items JSONB
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
  v_total_amount := v_subtotal + v_tax_amount + v_shipping_amount;

  -- Create the order
  INSERT INTO orders (
    order_number,
    user_id,
    guest_email,
    subtotal,
    tax_amount,
    shipping_amount,
    total_amount,
    shipping_address
  ) VALUES (
    'TEMP-' || extract(epoch from now())::text, -- Will be replaced by trigger
    p_user_id,
    p_guest_email,
    v_subtotal,
    v_tax_amount,
    v_shipping_amount,
    v_total_amount,
    p_shipping_address
  ) RETURNING id INTO v_order_id;

  -- Process each item atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get product with lock (already locked above in same transaction)
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

-- Fix 3: Replace coupon public visibility with a validation RPC
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- Only admins can view all coupons
CREATE POLICY "Only admins can view all coupons" ON public.coupons 
  FOR SELECT 
  USING (is_admin());

-- Create secure coupon validation function
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_order_subtotal DECIMAL
) 
RETURNS TABLE (
  valid BOOLEAN,
  discount_amount DECIMAL,
  message TEXT
)
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

-- Add stock validation trigger as additional protection
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

DROP TRIGGER IF EXISTS validate_stock_before_order_item ON public.order_items;
CREATE TRIGGER validate_stock_before_order_item
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.check_stock_before_order_item();