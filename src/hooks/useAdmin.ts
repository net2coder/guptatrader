import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface ShippingZone {
  id: string;
  name: string;
  regions: string[];
  base_rate: number;
  per_kg_rate: number | null;
  free_shipping_threshold: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Return {
  id: string;
  order_id: string;
  user_id: string | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  refund_amount: number | null;
  refund_status: 'pending' | 'processed' | 'failed' | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_number: string;
    total_amount: number;
  };
}

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'low_stock' | 'payment' | 'return_request' | 'system';
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_modifier: number;
  stock_quantity: number;
  attributes: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order_amount: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_announcement: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  created_at: string;
  order_count?: number;
  total_spent?: number;
}

// Shipping Zones
export function useShippingZones() {
  return useQuery({
    queryKey: ['shipping-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ShippingZone[];
    },
  });
}

export function useCreateShippingZone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (zone: Omit<ShippingZone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('shipping_zones')
        .insert(zone)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast({ title: 'Shipping zone created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating shipping zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateShippingZone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...zone }: Partial<ShippingZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('shipping_zones')
        .update(zone)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast({ title: 'Shipping zone updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating shipping zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteShippingZone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipping_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast({ title: 'Shipping zone deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting shipping zone', description: error.message, variant: 'destructive' });
    },
  });
}

// Returns
export function useReturns() {
  return useQuery({
    queryKey: ['admin-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          order:orders(order_number, total_amount)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Return[];
    },
  });
}

export function useUpdateReturn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Return> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('returns')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      toast({ title: 'Return request updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating return', description: error.message, variant: 'destructive' });
    },
  });
}

// Admin Notifications
export function useAdminNotifications() {
  return useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AdminNotification[];
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });
}

// Activity Logs
export function useActivityLogs() {
  return useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}

// Product Variants
export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductVariant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (variant: { product_id: string; name: string; sku?: string; price_modifier?: number; stock_quantity?: number; attributes?: Record<string, unknown>; is_active?: boolean; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('product_variants')
        .insert({
          ...variant,
          attributes: variant.attributes as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', data.product_id] });
      toast({ title: 'Variant created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating variant', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProductVariant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, product_id, ...variant }: { id: string; product_id: string; name?: string; sku?: string; price_modifier?: number; stock_quantity?: number; attributes?: Record<string, unknown>; is_active?: boolean; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('product_variants')
        .update({
          ...variant,
          attributes: variant.attributes as any,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, product_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', data.product_id] });
      toast({ title: 'Variant updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating variant', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProductVariant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast({ title: 'Variant deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting variant', description: error.message, variant: 'destructive' });
    },
  });
}

// Coupons
export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
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

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (coupon: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'used_count'>) => {
      const { data, error } = await supabase
        .from('coupons')
        .insert(coupon)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Coupon created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating coupon', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...coupon }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update(coupon)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Coupon updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating coupon', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Coupon deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting coupon', description: error.message, variant: 'destructive' });
    },
  });
}

// Customers
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          orders:orders(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(customer => ({
        ...customer,
        order_count: (customer.orders as any)?.[0]?.count || 0,
      })) as Customer[];
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Customer> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating customer', description: error.message, variant: 'destructive' });
    },
  });
}

// Analytics
export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      // Get total revenue and order count
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status, payment_status, created_at');

      if (ordersError) throw ordersError;

      // Get product count
      const { count: productCount, error: productError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productError) throw productError;

      // Get customer count
      const { count: customerCount, error: customerError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (customerError) throw customerError;

      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const paidOrders = orders?.filter(o => o.payment_status === 'paid') || [];
      const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
      const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed') || [];
      
      // Get top products
      const { data: topProducts, error: topError } = await supabase
        .from('order_items')
        .select('product_name, quantity, total_price')
        .order('quantity', { ascending: false })
        .limit(5);

      if (topError) throw topError;

      // Monthly revenue (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const recentOrders = orders?.filter(o => new Date(o.created_at) >= sixMonthsAgo) || [];
      const monthlyData = recentOrders.reduce((acc, order) => {
        const month = new Date(order.created_at).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + Number(order.total_amount);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalRevenue,
        paidRevenue,
        totalOrders: orders?.length || 0,
        pendingOrders: pendingOrders.length,
        productCount: productCount || 0,
        customerCount: customerCount || 0,
        topProducts: topProducts || [],
        monthlyRevenue: Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue })),
      };
    },
  });
}

// Product Images
export function useProductImages(productId: string) {
  return useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order');

      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
}

export function useCreateProductImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (image: { product_id: string; image_url: string; alt_text?: string; is_primary?: boolean; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('product_images')
        .insert(image)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', data.product_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Image added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding image', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: 'Image deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting image', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProductImageOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ images, productId }: { images: { id: string; sort_order: number }[]; productId: string }) => {
      for (const image of images) {
        const { error } = await supabase
          .from('product_images')
          .update({ sort_order: image.sort_order })
          .eq('id', image.id);

        if (error) throw error;
      }
      return { productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
    },
  });
}

// Categories with full CRUD
export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...category }: { id: string; name?: string; slug?: string; description?: string; is_active?: boolean; image_url?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: 'Category updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating category', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: 'Category deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting category', description: error.message, variant: 'destructive' });
    },
  });
}
