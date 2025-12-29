-- Add per_user_limit column to coupons table
ALTER TABLE public.coupons ADD COLUMN per_user_limit integer DEFAULT NULL;

-- Create coupon_usages table to track per-user usage
CREATE TABLE public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Add index for efficient lookups
CREATE INDEX idx_coupon_usages_coupon_user ON public.coupon_usages(coupon_id, user_id);

-- Enable RLS on coupon_usages
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupon_usages
CREATE POLICY "Admins can manage coupon usages"
ON public.coupon_usages
FOR ALL
USING (is_admin());

CREATE POLICY "Users can view own coupon usages"
ON public.coupon_usages
FOR SELECT
USING (auth.uid() = user_id);

-- Update validate_coupon function to check per-user limits
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_order_subtotal numeric, p_user_id uuid DEFAULT NULL)
RETURNS TABLE(valid boolean, discount_amount numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon RECORD;
  v_discount DECIMAL;
  v_user_usage_count INT;
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
  
  -- Check per-user usage limit
  IF v_coupon.per_user_limit IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM coupon_usages 
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_coupon.per_user_limit THEN
      RETURN QUERY SELECT false::BOOLEAN, 0::DECIMAL, ('You have already used this coupon ' || v_coupon.per_user_limit || ' time(s)')::TEXT;
      RETURN;
    END IF;
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
$function$;