import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomers, useUpdateCustomer } from '@/hooks/useAdmin';
import { Search, Users, ShieldOff, Shield, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatPrice } from '@/lib/utils';

export default function AdminCustomers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: customers = [], isLoading } = useCustomers();
  const updateCustomer = useUpdateCustomer();

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

  const handleToggleBlock = async (customer: any) => {
    await updateCustomer.mutateAsync({ 
      id: customer.id, 
      is_blocked: !customer.is_blocked 
    });
  };

  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground">View and manage your customer base</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Customers ({customers.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">Orders</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {customer.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{customer.full_name || 'Unnamed'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {customer.phone || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {customer.order_count || 0} orders
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={customer.is_blocked ? 'destructive' : 'default'}>
                            {customer.is_blocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(customer.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewDetails(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className={customer.is_blocked ? 'text-green-600' : 'text-destructive'}
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No customers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Customers will appear here once they sign up'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-medium text-primary">
                    {selectedCustomer.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.full_name || 'Unnamed'}</h3>
                  <p className="text-muted-foreground">{selectedCustomer.phone || 'No phone'}</p>
                  <Badge variant={selectedCustomer.is_blocked ? 'destructive' : 'default'} className="mt-1">
                    {selectedCustomer.is_blocked ? 'Blocked' : 'Active'}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Order History ({customerOrders.length})</h4>
                {customerOrders.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerOrders.map((order: any) => (
                      <div key={order.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('en-IN')} • {order.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(Number(order.total_amount))}</p>
                          <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No orders yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}