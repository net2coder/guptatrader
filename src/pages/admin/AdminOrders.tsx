import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrder, OrderStatus, PaymentStatus } from '@/hooks/useOrders';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import OrderSlipPrint from '@/components/admin/OrderSlipPrint';
import { 
  Search, 
  ShoppingCart,
  Eye,
  Truck,
  CheckCircle,
  XCircle,
  CreditCard,
  Phone,
  MapPin,
  Trash2,
  Printer,
  Download
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
  DialogFooter,
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
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  returned: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  partially_refunded: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
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
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: orders = [], isLoading, refetch } = useAdminOrders();
  const { data: storeSettings } = useStoreSettings();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getShippingAddress = (order: any): ShippingAddress => {
    return (order.shipping_address as ShippingAddress) || {};
  };

  const filteredOrders = orders.filter(order => {
    const address = getShippingAddress(order);
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.guest_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Sort: pending first, then by date
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleConfirmOrder = async (orderId: string) => {
    await updateStatus.mutateAsync({ orderId, status: 'confirmed' });
    setSelectedOrder(null);
  };

  const handleCancelOrder = async (orderId: string) => {
    await updateStatus.mutateAsync({ orderId, status: 'cancelled' });
    setSelectedOrder(null);
  };

  const handleShipOrder = async (orderId: string) => {
    await updateStatus.mutateAsync({ 
      orderId, 
      status: 'shipped',
      trackingNumber: trackingNumber || undefined 
    });
    setTrackingNumber('');
    setSelectedOrder(null);
  };

  const handleDeliverOrder = async (orderId: string) => {
    await updateStatus.mutateAsync({ orderId, status: 'delivered' });
    setSelectedOrder(null);
  };

  const handleMarkPaid = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);

      if (error) throw error;

      toast({ title: 'Payment marked as received' });
      setSelectedOrder(null);
      // Invalidate and refetch orders
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    } catch (error) {
      toast({ 
        title: 'Error updating payment status', 
        variant: 'destructive' 
      });
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const unpaidCount = orders.filter(o => o.payment_status === 'pending' && o.status !== 'cancelled').length;

  const handlePrintOrderSlip = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Order Slip - ${selectedOrder?.order_number}</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                  @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  }
                </style>
                <script src="https://cdn.tailwindcss.com"></script>
              </head>
              <body>
                ${printContents}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
      setShowPrintPreview(false);
    }, 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Orders</h1>
            <p className="text-muted-foreground">Manage and track customer orders</p>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingCount} Pending Approval
              </Badge>
            )}
            {unpaidCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {unpaidCount} Awaiting Payment
              </Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                All Orders ({orders.length})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
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
                    <SelectValue placeholder="Order status" />
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
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment</SelectItem>
                    <SelectItem value="pending">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
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
            ) : sortedOrders.length > 0 ? (
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
                    {sortedOrders.map((order) => {
                      const address = getShippingAddress(order);
                      return (
                      <TableRow key={order.id} className={order.status === 'pending' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{address.full_name || 'Guest'}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.guest_email || address.phone || '-'}
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
                          <span className={`text-xs px-2 py-1 rounded-full ${paymentStatusColors[order.payment_status]}`}>
                            {order.payment_status === 'pending' ? 'Unpaid' : order.payment_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
                  {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                    ? 'Try adjusting your filters' 
                    : 'Orders will appear here once customers start purchasing'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.order_number}</span>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[selectedOrder.status]}`}>
                      {selectedOrder.status}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${paymentStatusColors[selectedOrder.payment_status]}`}>
                      {selectedOrder.payment_status === 'pending' ? 'Unpaid' : selectedOrder.payment_status}
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Customer & Shipping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </h4>
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                      <p className="font-medium text-foreground">{getShippingAddress(selectedOrder).full_name}</p>
                      <p>{getShippingAddress(selectedOrder).address_line_1}</p>
                      {getShippingAddress(selectedOrder).address_line_2 && (
                        <p>{getShippingAddress(selectedOrder).address_line_2}</p>
                      )}
                      <p>
                        {getShippingAddress(selectedOrder).city}, {getShippingAddress(selectedOrder).state} {getShippingAddress(selectedOrder).postal_code}
                      </p>
                      <p className="flex items-center gap-1 mt-2">
                        <Phone className="h-3 w-3" />
                        {getShippingAddress(selectedOrder).phone}
                      </p>
                      {selectedOrder.guest_email && (
                        <p className="text-xs mt-1">{selectedOrder.guest_email}</p>
                      )}
                      {selectedOrder.customer_gst_number && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium text-foreground">Customer GST Number:</p>
                          <p className="font-mono text-sm">{selectedOrder.customer_gst_number}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Order Summary</h4>
                    <div className="text-sm space-y-2 bg-muted/30 rounded-lg p-4">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatPrice(Number(selectedOrder.subtotal))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (18% GST)</span>
                        <span>{formatPrice(Number(selectedOrder.tax_amount))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>
                          {Number(selectedOrder.shipping_amount) === 0 
                            ? 'Free' 
                            : formatPrice(Number(selectedOrder.shipping_amount))}
                        </span>
                      </div>
                      {Number(selectedOrder.discount_amount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatPrice(Number(selectedOrder.discount_amount))}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatPrice(Number(selectedOrder.total_amount))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {formatPrice(Number(item.unit_price))}
                          </p>
                        </div>
                        <span className="font-medium">{formatPrice(Number(item.total_price))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Number (for shipped orders) */}
                {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                  <div>
                    <Label htmlFor="tracking">Tracking Number (optional)</Label>
                    <Input
                      id="tracking"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number before shipping"
                      className="mt-1"
                    />
                  </div>
                )}

                {selectedOrder.tracking_number && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm font-medium">Tracking Number</p>
                    <p className="text-lg">{selectedOrder.tracking_number}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {/* Payment Actions */}
                {selectedOrder.payment_status === 'pending' && selectedOrder.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    onClick={() => handleMarkPaid(selectedOrder.id)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}

                {/* Order Status Actions */}
                {selectedOrder.status === 'pending' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                    <Button
                      onClick={() => handleConfirmOrder(selectedOrder.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Order
                    </Button>
                  </>
                )}

                {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                  <Button
                    onClick={() => handleShipOrder(selectedOrder.id)}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Shipped
                  </Button>
                )}

                {selectedOrder.status === 'shipped' && (
                  <Button
                    onClick={() => handleDeliverOrder(selectedOrder.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
                {/* Export/Print Order Slip */}
                <Button
                  variant="outline"
                  onClick={handlePrintOrderSlip}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print / Export
                </Button>

                {/* Delete Order */}
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setOrderToDelete(selectedOrder);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Order
                </Button>
              </DialogFooter>

              {/* Hidden Print Template */}
              <div className="hidden">
                <OrderSlipPrint
                  ref={printRef}
                  order={selectedOrder}
                  storeSettings={storeSettings}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order <strong>{orderToDelete?.order_number}</strong>? 
              This action cannot be undone and will permanently remove the order and all its items from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (orderToDelete) {
                  await deleteOrder.mutateAsync(orderToDelete.id);
                  setOrderToDelete(null);
                  setSelectedOrder(null);
                }
              }}
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
