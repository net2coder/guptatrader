import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StoreSetting {
  id: string;
  key: string;
  value: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  store_name: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  gst_number: string;
  tax_rate: string;
  auto_cancel_days: string;
  enable_order_notifications: string;
  enable_low_stock_alerts: string;
  low_stock_threshold: string;
  site_logo_url: string;
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*');

      if (error) throw error;
      
      // Convert array to object keyed by setting key
      const settings: Partial<StoreSettings> = {};
      (data as StoreSetting[]).forEach(item => {
        (settings as Record<string, string>)[item.key] = item.value || '';
      });
      
      return settings as StoreSettings;
    },
  });
}

export function useUpdateStoreSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase
        .from('store_settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating setting', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkUpdateStoreSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const updates = Object.entries(settings).map(([key, value]) =>
        supabase.from('store_settings').update({ value }).eq('key', key)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error('Some settings failed to update');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast({ title: 'Settings saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
    },
  });
}
