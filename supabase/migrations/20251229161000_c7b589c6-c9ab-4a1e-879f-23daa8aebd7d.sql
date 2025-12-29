-- Add policy to allow public access to active announcement coupons
CREATE POLICY "Anyone can view active announcement coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true AND is_announcement = true);