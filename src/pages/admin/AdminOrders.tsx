import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAdminOrders, useUpdateOrderStatus, OrderStatus } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/utils';
import { 
  Search, 
  ShoppingCart,
  Eye,
  Truck,
  CheckCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
};

interface ShippingAddress {
  full_name?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export default function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: orders = [], isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();

  const getShippingAddress = (order: any): ShippingAddress => {
    return (order.shipping_address as ShippingAddress) || {};
  };

  const filteredOrders = orders.filter(order => {
    const address = getShippingAddress(order);
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage and track customer orders</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                All Orders ({orders.length})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-48"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Payment</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const address = getShippingAddress(order);
                      return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{address.full_name || 'Guest'}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.guest_email || '-'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(Number(order.total_amount))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Order {order.order_number}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Shipping Address</h4>
                                      <div className="text-sm text-muted-foreground">
                                        <p>{address.full_name}</p>
                                        <p>{address.address_line_1}</p>
                                        {address.address_line_2 && (
                                          <p>{address.address_line_2}</p>
                                        )}
                                        <p>
                                          {address.city}, {address.state} {address.postal_code}
                                        </p>
                                        <p>Phone: {address.phone}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Order Summary</h4>
                                      <div className="text-sm space-y-1">
                                        <div className="flex justify-between">
                                          <span>Subtotal</span>
                                          <span>{formatPrice(Number(order.subtotal))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Tax</span>
                                          <span>{formatPrice(Number(order.tax_amount))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Shipping</span>
                                          <span>{formatPrice(Number(order.shipping_amount))}</span>
                                        </div>
                                        <div className="flex justify-between font-medium pt-2 border-t">
                                          <span>Total</span>
                                          <span>{formatPrice(Number(order.total_amount))}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-medium mb-2">Items</h4>
                                    <div className="space-y-2">
                                      {order.items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between p-2 bg-muted/50 rounded">
                                          <span>{item.product_name} × {item.quantity}</span>
                                          <span>{formatPrice(Number(item.total_price))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    {order.status === 'pending' && (
                                      <Button
                                        onClick={() => updateStatus.mutate({ orderId: order.id, status: 'confirmed' })}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Confirm Order
                                      </Button>
                                    )}
                                    {(order.status === 'confirmed' || order.status === 'processing') && (
                                      <Button
                                        onClick={() => updateStatus.mutate({ orderId: order.id, status: 'shipped' })}
                                      >
                                        <Truck className="h-4 w-4 mr-2" />
                                        Mark Shipped
                                      </Button>
                                    )}
                                    {order.status === 'shipped' && (
                                      <Button
                                        onClick={() => updateStatus.mutate({ orderId: order.id, status: 'delivered' })}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark Delivered
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Orders will appear here once customers start purchasing'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
