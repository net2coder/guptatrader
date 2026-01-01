-- ==========================================
-- DISTANCE-BASED SHIPPING MIGRATION
-- ==========================================
-- This migration adds distance-based shipping logic to complement the existing free delivery threshold.
--
-- New Logic:
-- 1. If order value >= free_shipping_threshold: 
--    - Distance <= distance_free_radius (5km): FREE SHIPPING
--    - Distance > distance_free_radius: ₹/km rate applies
-- 2. If order value < free_shipping_threshold:
--    - Shipping = base_rate + (distance * per_km_rate) where distance > distance_free_radius
--
-- ==========================================

-- Add new columns to shipping_zones table
ALTER TABLE public.shipping_zones
ADD COLUMN IF NOT EXISTS distance_free_radius numeric NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS per_km_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_shipping_distance numeric,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create or replace the trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_shipping_zones_updated_at ON public.shipping_zones;

-- Create trigger for updated_at
CREATE TRIGGER update_shipping_zones_updated_at
BEFORE UPDATE ON public.shipping_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- ORDERS TABLE - Add distance column
-- ==========================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_distance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_breakdown jsonb;

-- shipping_breakdown format:
-- {
--   "base_rate": 0,
--   "distance_km": 5.5,
--   "distance_free_radius": 5,
--   "distance_charged": 0.5,
--   "per_km_rate": 50,
--   "distance_charge": 25,
--   "is_free_shipping": true,
--   "order_value": 15000,
--   "free_shipping_threshold": 10000
-- }

-- ==========================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ==========================================
COMMENT ON COLUMN public.shipping_zones.free_shipping_threshold IS 'Order value threshold for free shipping (e.g., 10000)';
COMMENT ON COLUMN public.shipping_zones.distance_free_radius IS 'Free delivery radius in km when order value >= free_shipping_threshold (e.g., 5)';
COMMENT ON COLUMN public.shipping_zones.per_km_rate IS 'Shipping charge per km for distances beyond free radius (₹/km, e.g., 50)';
COMMENT ON COLUMN public.shipping_zones.base_rate IS 'Base shipping charge for orders below free_shipping_threshold';
COMMENT ON COLUMN public.shipping_zones.max_shipping_distance IS 'Maximum delivery distance in km (optional limit)';
COMMENT ON COLUMN public.orders.delivery_distance IS 'Delivery distance in km from store to delivery address';
COMMENT ON COLUMN public.orders.shipping_breakdown IS 'Detailed breakdown of shipping calculation (see format above)';

-- ==========================================
-- SAMPLE DATA UPDATE
-- ==========================================
-- Update existing shipping zone with distance parameters
UPDATE public.shipping_zones
SET 
  distance_free_radius = 5,
  per_km_rate = 100,
  max_shipping_distance = 100
WHERE id = (
  SELECT id FROM public.shipping_zones 
  WHERE (name = 'Local' OR name ILIKE '%local%' OR is_active = true)
  ORDER BY created_at DESC
  LIMIT 1
);

-- ==========================================
-- STORE SETTINGS FOR SHIPPING CONFIGURATION
-- ==========================================
-- Add default admin settings for shipping (if not already present)
INSERT INTO public.store_settings (key, value, type) VALUES
('free_shipping_threshold', '10000', 'number'),
('distance_free_radius', '5', 'number'),
('shipping_per_km_rate', '100', 'number'),
('base_shipping_rate', '500', 'number')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- MIGRATION NOTES
-- ==========================================
-- After running this migration:
-- 1. Configure admin settings in store_settings table:
--    - free_shipping_threshold (order amount in rupees)
--    - distance_free_radius (km radius for free delivery)
--    - shipping_per_km_rate (rupees per km for excess distance)
--    - base_shipping_rate (base shipping charge for orders below threshold)
-- 2. All values are fully configurable - NO hardcoded values
-- 3. Changes take effect immediately (via useStoreSettings hook)
-- 4. Fallbacks: ₹10K threshold, 5km radius, ₹100/km, ₹500 base
