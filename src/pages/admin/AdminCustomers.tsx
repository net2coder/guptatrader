import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Users, 
  ShieldOff, 
  Shield, 
  Eye, 
  UserCircle,
  ShoppingBag,
  CreditCard,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  is_blocked: boolean;
  created_at: string;
  order_count: number;
  total_spent: number;
}

export default function AdminCustomers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const customersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('user_id', profile.user_id);

          const orderCount = orders?.length || 0;
          const totalSpent = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

          return {
            ...profile,
            email: null,
            order_count: orderCount,
            total_spent: totalSpent,
          };
        })
      );

      return customersWithStats as Customer[];
    },
  });

  const { data: customerOrders = [] } = useQuery({
    queryKey: ['customer-orders', selectedCustomer?.user_id],
    queryFn: async () => {
      if (!selectedCustomer?.user_id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('user_id', selectedCustomer.user_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer?.user_id,
  });

  const filteredCustomers = customers.filter(
    c => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.phone?.includes(searchQuery)
  );

  const activeCustomers = customers.filter(c => !c.is_blocked).length;
  const blockedCustomers = customers.filter(c => c.is_blocked).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);

  const handleToggleBlock = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !customer.is_blocked })
        .eq('id', customer.id);

      if (error) throw error;
      
      toast({ 
        title: customer.is_blocked ? 'Customer unblocked' : 'Customer blocked' 
      });
      refetch();
    } catch (error: any) {
      toast({ 
        title: 'Error updating customer', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const stats = [
    { label: 'Total Customers', value: customers.length, icon: Users, color: 'text-admin-stat-1' },
    { label: 'Active', value: activeCustomers, icon: UserCircle, color: 'text-green-500' },
    { label: 'Blocked', value: blockedCustomers, icon: ShieldOff, color: 'text-red-500' },
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: CreditCard, color: 'text-admin-stat-2' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">View and manage your customer base</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          {stats.map((stat) => (
            <div key={stat.label} className="admin-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-xl bg-muted/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customers List */}
        <Card className="admin-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                All Customers
                <Badge variant="secondary" className="ml-2">{customers.length}</Badge>
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="space-y-3 stagger-fade-in">
                {filteredCustomers.map((customer) => (
                  <div 
                    key={customer.id}
                    className={cn(
                      "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer",
                      customer.is_blocked 
                        ? 'bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30' 
                        : 'bg-background hover:bg-muted/30 border-border/50'
                    )}
                    onClick={() => handleViewDetails(customer)}
                  >
                    {/* Customer Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-primary">
                          {customer.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{customer.full_name || 'Unnamed'}</p>
                          {customer.is_blocked && (
                            <Badge variant="destructive" className="text-xs">Blocked</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{customer.phone || 'No phone'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Joined {new Date(customer.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 sm:gap-8">
                      <div className="text-center">
                        <p className="text-lg font-bold">{customer.order_count}</p>
                        <p className="text-xs text-muted-foreground">Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{formatPrice(customer.total_spent)}</p>
                        <p className="text-xs text-muted-foreground">Spent</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className={customer.is_blocked ? 'text-green-600' : 'text-destructive'}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {customer.is_blocked ? (
                                <Shield className="h-4 w-4" />
                              ) : (
                                <ShieldOff className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {customer.is_blocked ? 'Unblock' : 'Block'} Customer
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {customer.is_blocked ? 'unblock' : 'block'} {customer.full_name || 'this customer'}?
                                {!customer.is_blocked && ' They will not be able to place orders.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleToggleBlock(customer)}
                                className={customer.is_blocked ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
                              >
                                {customer.is_blocked ? 'Unblock' : 'Block'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(customer);
                          }}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">No customers found</h3>
                <p className="text-muted-foreground max-w-sm">
                  {searchQuery ? 'Try a different search term' : 'Customers will appear here once they sign up'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {selectedCustomer.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedCustomer.full_name || 'Unnamed'}</h3>
                  <p className="text-muted-foreground">{selectedCustomer.phone || 'No phone'}</p>
                </div>
                <Badge variant={selectedCustomer.is_blocked ? 'destructive' : 'default'}>
                  {selectedCustomer.is_blocked ? 'Blocked' : 'Active'}
                </Badge>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="text-sm">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold">{selectedCustomer.order_count}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(selectedCustomer.total_spent)}</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="font-semibold mb-3">Order History</h4>
                {customerOrders.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerOrders.map((order: any) => (
                      <div key={order.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN')} • {order.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(Number(order.total_amount))}</p>
                          <Badge variant="secondary" className="text-xs capitalize">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">No orders yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}