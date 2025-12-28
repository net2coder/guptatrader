-- Add is_announcement column to coupons table for showing promo announcements
ALTER TABLE public.coupons ADD COLUMN is_announcement boolean DEFAULT false;

-- Update create_order_with_items function to accept coupon discount
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
AS $function$
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
    'TEMP-' || extract(epoch from now())::text, -- Will be replaced by trigger
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
$function$;