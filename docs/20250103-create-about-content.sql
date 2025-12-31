-- Create about_content table
CREATE TABLE IF NOT EXISTS public.about_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  section_category TEXT NOT NULL CHECK (section_category IN ('hero', 'story', 'owner', 'showroom', 'stats')),
  title TEXT,
  content TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_about_content_updated_at ON about_content;
CREATE TRIGGER update_about_content_updated_at 
BEFORE UPDATE ON about_content 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.about_content ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read active about content" ON about_content 
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all about content" ON about_content 
FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage about content" ON about_content 
FOR ALL USING (is_admin());

-- Insert initial data
INSERT INTO about_content (section_key, section_category, title, content, image_url, sort_order, is_active)
VALUES
  ('hero_title', 'hero', 'Welcome to Gupta Traders', NULL, NULL, 0, true),
  ('hero_subtitle', 'hero', 'Premium Furniture for Your Home & Office', NULL, NULL, 1, true),
  ('story_title', 'story', 'Our Story', NULL, NULL, 0, true),
  ('story_content', 'story', 'Since 1961, Gupta Traders has been crafting beautiful spaces with quality furniture. Our commitment to excellence and customer satisfaction has made us a trusted name in the furniture industry.', NULL, NULL, 1, true),
  ('owner_name', 'owner', 'Founder & CEO', NULL, NULL, 0, true),
  ('owner_title', 'owner', 'Leading with Vision', NULL, NULL, 1, true),
  ('owner_quote', 'owner', 'Quality is not an act, it is a habit.', NULL, NULL, 2, true),
  ('owner_image', 'owner', NULL, NULL, NULL, 3, true),
  ('showroom_title', 'showroom', 'Visit Our Showroom', NULL, NULL, 0, true),
  ('showroom_subtitle', 'showroom', 'Experience our furniture collection in person at our state-of-the-art showroom.', NULL, NULL, 1, true),
  ('showroom_image_1', 'showroom', 'Gallery Image 1', NULL, NULL, 2, true),
  ('showroom_image_2', 'showroom', 'Gallery Image 2', NULL, NULL, 3, true),
  ('showroom_image_3', 'showroom', 'Gallery Image 3', NULL, NULL, 4, true),
  ('showroom_image_4', 'showroom', 'Gallery Image 4', NULL, NULL, 5, true),
  ('showroom_main', 'showroom', 'Main Showroom', NULL, NULL, 6, true),
  ('stat_years', 'stats', '60+', 'Years', NULL, 0, true),
  ('stat_customers', 'stats', '10,000+', 'Happy Customers', NULL, 1, true),
  ('stat_products', 'stats', '500+', 'Products', NULL, 2, true),
  ('stat_cities', 'stats', '25+', 'Cities', NULL, 3, true)
ON CONFLICT (section_key) DO NOTHING;

-- Create storage bucket for about-images (if using Supabase)
-- Run this in Supabase storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('about-images', 'about-images', true);
-- ALTER POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'about-images');
-- ALTER POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'about-images' AND auth.role() = 'authenticated');
