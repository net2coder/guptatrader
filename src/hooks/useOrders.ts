import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_email: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address: object | null;
  notes: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Fetch user's orders
export function useUserOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Fetch single order
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

// Admin: Fetch all orders
export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      // Fetch orders with items (no foreign key join for profiles)
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately for orders with user_id
      const userIds = orders
        ?.filter(o => o.user_id)
        .map(o => o.user_id) || [];
      
      let profilesMap: Record<string, { full_name: string | null; phone: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name, phone: p.phone };
        });
      }
      
      // Attach profiles to orders
      return orders?.map(order => ({
        ...order,
        profile: order.user_id ? profilesMap[order.user_id] : null
      })) || [];
    },
  });
}

// Admin: Update order status
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      status, 
      trackingNumber 
    }: { 
      orderId: string; 
      status: OrderStatus; 
      trackingNumber?: string;
    }) => {
      const updates: {
        status: OrderStatus;
        tracking_number?: string;
        shipped_at?: string;
        delivered_at?: string;
      } = { status };

      if (trackingNumber) {
        updates.tracking_number = trackingNumber;
      }

      if (status === 'shipped') {
        updates.shipped_at = new Date().toISOString();
      }

      if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      toast({ title: 'Order status updated' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating order', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Create order using secure RPC function
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      items,
      shippingAddress,
      guestEmail,
      discountAmount,
      couponCode,
    }: {
      items: { productId: string; quantity: number; name: string; sku?: string; price: number }[];
      shippingAddress: Order['shipping_address'];
      guestEmail?: string;
      discountAmount?: number;
      couponCode?: string;
    }) => {
      // Prepare items for the RPC function
      const itemsJsonb = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
      }));

      // Call secure server-side RPC function for atomic order creation
      const { data: orderId, error } = await supabase.rpc('create_order_with_items', {
        p_user_id: user?.id || null,
        p_guest_email: guestEmail || null,
        p_shipping_address: shippingAddress,
        p_items: itemsJsonb,
        p_discount_amount: discountAmount || 0,
        p_coupon_code: couponCode || null,
      });

      if (error) throw error;
      if (!orderId) throw new Error('Failed to create order');

      // Fetch the created order to return
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Order placed successfully!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error placing order', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
