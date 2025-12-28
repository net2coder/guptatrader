-- Create store_settings table for dynamic configuration
CREATE TABLE public.store_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  type text NOT NULL DEFAULT 'text',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read store settings
CREATE POLICY "Anyone can read store settings"
ON public.store_settings FOR SELECT
USING (true);

-- Only admins can manage store settings
CREATE POLICY "Admins can manage store settings"
ON public.store_settings FOR ALL
USING (is_admin());

-- Create footer_items table for dynamic footer management
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

-- Enable RLS
ALTER TABLE public.footer_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read active footer items
CREATE POLICY "Anyone can read active footer items"
ON public.footer_items FOR SELECT
USING (is_active = true);

-- Admins can view all footer items
CREATE POLICY "Admins can view all footer items"
ON public.footer_items FOR SELECT
USING (is_admin());

-- Admins can manage footer items
CREATE POLICY "Admins can manage footer items"
ON public.footer_items FOR ALL
USING (is_admin());

-- Insert default store settings
INSERT INTO public.store_settings (key, value, type) VALUES
('store_name', 'Gupta Traders', 'text'),
('store_email', 'hello@guptatraders.com', 'text'),
('store_phone', '+91 98765 43210', 'text'),
('store_address', '123 Furniture Lane, Sector 45, Gurugram, Haryana 122001', 'text'),
('gst_number', 'GSTIN: 06XXXXX1234X1ZX', 'text'),
('tax_rate', '18', 'number'),
('auto_cancel_days', '7', 'number'),
('enable_order_notifications', 'true', 'boolean'),
('enable_low_stock_alerts', 'true', 'boolean'),
('low_stock_threshold', '5', 'number'),
('site_logo_url', '', 'text');

-- Insert default footer items
INSERT INTO public.footer_items (section, title, url, sort_order) VALUES
('quick_links', 'All Products', '/products', 1),
('quick_links', 'Sofas & Couches', '/products?category=sofas', 2),
('quick_links', 'Beds & Mattresses', '/products?category=beds', 3),
('quick_links', 'Dining Sets', '/products?category=dining', 4),
('quick_links', 'Office Furniture', '/products?category=office', 5),
('customer_service', 'Track Order', '/profile?tab=orders', 1),
('customer_service', 'Returns & Refunds', '#', 2),
('customer_service', 'Shipping Info', '#', 3),
('customer_service', 'FAQ', '#', 4),
('customer_service', 'Contact Us', '#', 5);

-- Create trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_items_updated_at
BEFORE UPDATE ON public.footer_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create category-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create site-assets bucket for logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for category-images
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Admins can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-images' AND (SELECT is_admin()));

CREATE POLICY "Admins can update category images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-images' AND (SELECT is_admin()));

CREATE POLICY "Admins can delete category images"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-images' AND (SELECT is_admin()));

-- Storage policies for site-assets
CREATE POLICY "Anyone can view site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND (SELECT is_admin()));

CREATE POLICY "Admins can update site assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND (SELECT is_admin()));

CREATE POLICY "Admins can delete site assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND (SELECT is_admin()));