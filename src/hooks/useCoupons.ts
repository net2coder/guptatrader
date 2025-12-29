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
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .eq('is_announcement', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter dates client-side to avoid complex PostgREST filter issues
      const now = new Date();
      const filtered = (data || []).filter(coupon => {
        const startsValid = !coupon.starts_at || new Date(coupon.starts_at) <= now;
        const expiresValid = !coupon.expires_at || new Date(coupon.expires_at) > now;
        return startsValid && expiresValid;
      });
      
      return filtered as Coupon[];
    },
  });
}

// Validate coupon code at checkout
export function useValidateCoupon() {
  return {
    validateCoupon: async (code: string, subtotal: number, userId?: string) => {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code.toUpperCase(),
        p_order_subtotal: subtotal,
        p_user_id: userId || null,
      });

      if (error) throw error;
      
      // RPC returns an array with one result
      const result = data?.[0];
      if (!result) {
        return { valid: false, discount_amount: 0, message: 'Invalid coupon' };
      }
      
      return result as { valid: boolean; discount_amount: number; message: string };
    },
  };
}

// Fetch all coupons for admin
export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
  });
}
