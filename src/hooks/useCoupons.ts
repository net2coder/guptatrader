import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  is_announcement: boolean | null;
  created_at: string;
  updated_at: string;
}

// Fetch announcement coupons for promo banner (public)
export function useAnnouncementCoupons() {
  return useQuery({
    queryKey: ['announcement-coupons'],
    queryFn: async () => {
      // Get current date for filtering
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .eq('is_announcement', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
  });
}
