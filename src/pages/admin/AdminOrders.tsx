import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAdminOrders, useUpdateOrderStatus, useDeleteOrder, OrderStatus, PaymentStatus, OrderItem, Order } from '@/hooks/useOrders';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import OrderSlipPrint from '@/components/admin/OrderSlipPrint';
import { escapeHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';
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
  Package,
  Clock,
  Filter,
  Mail,
  Calendar,
  Receipt,
  ArrowUpRight,
  Shield
} from 'lucide-react';
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

const statusConfig: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending: { 
    bg: 'bg-amber-50 dark:bg-amber-950/30', 
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  confirmed: { 
    bg: 'bg-blue-50 dark:bg-blue-950/30', 
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500'
  },
  processing: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500'
  },
  shipped: { 
    bg: 'bg-cyan-50 dark:bg-cyan-950/30', 
    text: 'text-cyan-700 dark:text-cyan-400',
    dot: 'bg-cyan-500'
  },
  delivered: { 
    bg: 'bg-green-50 dark:bg-green-950/30', 
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500'
  },
  cancelled: { 
    bg: 'bg-red-50 dark:bg-red-950/30', 
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500'
  },
  returned: { 
    bg: 'bg-gray-50 dark:bg-gray-950/30', 
    text: 'text-gray-700 dark:text-gray-400',
    dot: 'bg-gray-500'
  },
};

const paymentConfig: Record<PaymentStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  paid: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
  failed: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
  refunded: { bg: 'bg-gray-100 dark:bg-gray-900/40', text: 'text-gray-700 dark:text-gray-300' },
  partially_refunded: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
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

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize",
      config.bg, config.text
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = paymentConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize",
      config.bg, config.text
    )}>
      {status === 'pending' ? 'Unpaid' : status.replace('_', ' ')}
    </span>
  );
}

export default function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: orders = [], isLoading } = useAdminOrders();
  const { data: storeSettings } = useStoreSettings();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getShippingAddress = (order: Order): ShippingAddress => {
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
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

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
                <title>Order Slip - ${escapeHtml(selectedOrder?.order_number)}</title>
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

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'text-admin-stat-1' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-amber-500' },
    { label: 'Delivered', value: deliveredCount, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Revenue', value: formatPrice(totalRevenue), icon: CreditCard, color: 'text-admin-stat-2' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Orders</h1>
            <p className="text-muted-foreground mt-1">Manage and track customer orders</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {pendingCount} Pending
              </Badge>
            )}
            {unpaidCount > 0 && (
              <Badge variant="secondary" className="gap-1.5">
                <CreditCard className="h-3 w-3" />
                {unpaidCount} Unpaid
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
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

        {/* Filters */}
        <Card className="admin-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-muted-foreground" />
                All Orders
                <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-56 bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-background">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Status" />
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
                    <SelectTrigger className="w-full sm:w-36 bg-background">
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : sortedOrders.length > 0 ? (
              <div className="space-y-3 stagger-fade-in">
                {sortedOrders.map((order) => {
                  const address = getShippingAddress(order);
                  return (
                    <div 
                      key={order.id}
                      className={cn(
                        "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer",
                        order.status === 'pending' 
                          ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30' 
                          : 'bg-background hover:bg-muted/30 border-border/50'
                      )}
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Order Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="hidden sm:flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{order.order_number}</p>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:flex items-center gap-1 truncate">
                              {address.full_name || 'Guest'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Amount & Payment */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatPrice(Number(order.total_amount))}</p>
                          <PaymentBadge status={order.payment_status} />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground max-w-sm">
                  {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                    ? 'Try adjusting your search or filters' 
                    : 'Orders will appear here once customers start purchasing'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          {selectedOrder && (
            <>
              {/* Dialog Header */}
              <div className="sticky top-0 z-10 bg-background border-b border-border p-6">
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <DialogTitle className="text-xl font-display">
                      Order {selectedOrder.order_number}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={selectedOrder.status} />
                      <PaymentBadge status={selectedOrder.payment_status} />
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Dialog Body */}
              <div className="p-6 space-y-6">
                {/* Customer & Summary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Shipping Address */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Shipping Address
                    </h4>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                      <p className="font-medium">{getShippingAddress(selectedOrder).full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getShippingAddress(selectedOrder).address_line_1}
                        {getShippingAddress(selectedOrder).address_line_2 && (
                          <>, {getShippingAddress(selectedOrder).address_line_2}</>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getShippingAddress(selectedOrder).city}, {getShippingAddress(selectedOrder).state} {getShippingAddress(selectedOrder).postal_code}
                      </p>
                      <div className="flex items-center gap-4 pt-2 border-t border-border/50 mt-3">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {getShippingAddress(selectedOrder).phone}
                        </span>
                        {selectedOrder.guest_email && (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {selectedOrder.guest_email}
                          </span>
                        )}
                      </div>
                      {selectedOrder.customer_gst_number && (
                        <div className="pt-2 border-t border-border/50 mt-2">
                          <p className="text-xs text-muted-foreground">GST Number</p>
                          <p className="font-mono text-sm">{selectedOrder.customer_gst_number}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      Order Summary
                    </h4>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(Number(selectedOrder.subtotal))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (18% GST)</span>
                        <span>{formatPrice(Number(selectedOrder.tax_amount))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>
                          {Number(selectedOrder.shipping_amount) === 0 
                            ? <span className="text-green-600">Free</span>
                            : formatPrice(Number(selectedOrder.shipping_amount))}
                        </span>
                      </div>
                      {Number(selectedOrder.discount_amount) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>-{formatPrice(Number(selectedOrder.discount_amount))}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatPrice(Number(selectedOrder.total_amount))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Order Items ({selectedOrder.items?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: OrderItem) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {formatPrice(Number(item.unit_price))}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold">{formatPrice(Number(item.total_price))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warranty Information */}
                {storeSettings?.warranty_terms && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-2">Warranty Information</h4>
                        <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed whitespace-pre-line">
                          {storeSettings.warranty_terms}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracking Number */}
                {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                  <div className="space-y-3">
                    <Label htmlFor="tracking" className="font-semibold">Tracking Number (optional)</Label>
                    <Input
                      id="tracking"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number before shipping"
                      className="bg-background"
                    />
                  </div>
                )}

                {selectedOrder.tracking_number && (
                  <div className="bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4">
                    <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Tracking Number</p>
                    <p className="text-lg font-mono">{selectedOrder.tracking_number}</p>
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="sticky bottom-0 bg-background border-t border-border p-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Payment Actions */}
                  {selectedOrder.payment_status === 'pending' && selectedOrder.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => handleMarkPaid(selectedOrder.id)}
                      className="gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Mark as Paid
                    </Button>
                  )}

                  {/* Order Status Actions */}
                  {selectedOrder.status === 'pending' && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleConfirmOrder(selectedOrder.id)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Confirm Order
                      </Button>
                    </>
                  )}

                  {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                    <Button onClick={() => handleShipOrder(selectedOrder.id)} className="gap-2">
                      <Truck className="h-4 w-4" />
                      Ship Order
                    </Button>
                  )}

                  {selectedOrder.status === 'shipped' && (
                    <Button onClick={() => handleDeliverOrder(selectedOrder.id)} className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Mark Delivered
                    </Button>
                  )}

                  <Button variant="outline" onClick={handlePrintOrderSlip} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>

                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    onClick={() => setOrderToDelete(selectedOrder)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

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
              This action cannot be undone.
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