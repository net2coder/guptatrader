import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FooterItem {
  id: string;
  section: string;
  title: string;
  url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useFooterItems(includeInactive = false) {
  return useQuery({
    queryKey: ['footer-items', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('footer_items')
        .select('*')
        .order('section')
        .order('sort_order');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FooterItem[];
    },
  });
}

export function useCreateFooterItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<FooterItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('footer_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footer-items'] });
      toast({ title: 'Footer item created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating footer item', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFooterItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<FooterItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('footer_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footer-items'] });
      toast({ title: 'Footer item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating footer item', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFooterItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('footer_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footer-items'] });
      toast({ title: 'Footer item deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting footer item', description: error.message, variant: 'destructive' });
    },
  });
}
