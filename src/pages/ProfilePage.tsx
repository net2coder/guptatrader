import { useState } from 'react';
import { useNavigate, Navigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { useUserOrders, OrderStatus, PaymentStatus } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  User, 
  Package, 
  MapPin, 
  Edit, 
  Plus, 
  Trash2,
  Phone,
  Mail,
  Calendar,
  Eye,
  Download,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import { escapeHtml } from '@/lib/sanitize';
import logo from '@/assets/logo.png';

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

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

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  returned: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  partially_refunded: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const statusIcons: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  returned: XCircle,
};

const statusSteps: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function ProfilePage() {
  const { user, profile, isLoading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    phone: '',
  });
  
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    label: 'Home',
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders = [], isLoading: ordersLoading } = useUserOrders();
  
  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data as Address[];
    },
    enabled: !!user,
  });

  const createAddress = useMutation({
    mutationFn: async (address: Partial<Address>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          full_name: address.full_name || '',
          phone: address.phone || '',
          address_line_1: address.address_line_1 || '',
          address_line_2: address.address_line_2 || null,
          city: address.city || '',
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country || 'India',
          label: address.label || 'Home',
          is_default: address.is_default || false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      setIsAddingAddress(false);
      resetAddressForm();
      toast({ title: 'Address added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding address', description: error.message, variant: 'destructive' });
    },
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, ...address }: Partial<Address> & { id: string }) => {
      const { data, error } = await supabase
        .from('addresses')
        .update(address)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      setEditingAddress(null);
      setIsAddingAddress(false);
      toast({ title: 'Address updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating address', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      toast({ title: 'Address deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting address', description: error.message, variant: 'destructive' });
    },
  });

  const resetAddressForm = () => {
    setNewAddress({
      label: 'Home',
      full_name: '',
      phone: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: false,
    });
    setEditingAddress(null);
  };

  const handleEditProfile = () => {
    setEditedProfile({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const { error } = await updateProfile(editedProfile);
    if (!error) {
      setIsEditing(false);
    }
  };

  const handleSaveAddress = () => {
    if (editingAddress) {
      updateAddress.mutate({ ...newAddress, id: editingAddress.id } as Address & { id: string });
    } else {
      createAddress.mutate(newAddress);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setNewAddress(address);
    setIsAddingAddress(true);
  };

  const getShippingAddress = (order: any): ShippingAddress => {
    return (order.shipping_address as ShippingAddress) || {};
  };

  const getOrderStatusIndex = (status: OrderStatus): number => {
    if (status === 'cancelled' || status === 'returned') return -1;
    return statusSteps.indexOf(status);
  };

  const handlePrintOrderSlip = (order: any) => {
    const address = getShippingAddress(order);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Slip - ${escapeHtml(order.order_number)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 24px; margin-bottom: 8px; }
            .section { margin-bottom: 24px; }
            .section-title { font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
            th { background: #f9f9f9; }
            .text-right { text-align: right; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .summary-total { font-size: 18px; font-weight: 600; border-top: 2px solid #333; padding-top: 12px; margin-top: 12px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" alt="Gupta Traders" style="height: 48px; margin: 0 auto 8px;" />
            <h1>Gupta Traders</h1>
            <p>Order Confirmation Slip</p>
          </div>
          <div class="grid">
            <div>
              <p><strong>Order Number:</strong> ${escapeHtml(order.order_number)}</p>
              <p><strong>Date:</strong> ${escapeHtml(format(new Date(order.created_at), 'PPP'))}</p>
              <p><strong>Status:</strong> ${escapeHtml(order.status?.toUpperCase())}</p>
              <p><strong>Payment:</strong> ${escapeHtml(order.payment_status?.toUpperCase())}</p>
            </div>
            <div>
              <p><strong>Ship To:</strong></p>
              <p>${escapeHtml(address.full_name)}</p>
              <p>${escapeHtml(address.address_line_1)}</p>
              ${address.address_line_2 ? `<p>${escapeHtml(address.address_line_2)}</p>` : ''}
              <p>${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postal_code)}</p>
              <p>Phone: ${escapeHtml(address.phone)}</p>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">Order Items</h3>
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                ${order.items?.map((item: any) => `
                  <tr>
                    <td>${escapeHtml(item.product_name)}</td>
                    <td>${escapeHtml(String(item.quantity))}</td>
                    <td class="text-right">₹${Number(item.unit_price).toLocaleString()}</td>
                    <td class="text-right">₹${Number(item.total_price).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="section" style="max-width: 300px; margin-left: auto;">
            <div class="summary-row"><span>Subtotal</span><span>₹${Number(order.subtotal).toLocaleString()}</span></div>
            <div class="summary-row"><span>Tax</span><span>₹${Number(order.tax_amount).toLocaleString()}</span></div>
            <div class="summary-row"><span>Shipping</span><span>${Number(order.shipping_amount) === 0 ? 'Free' : '₹' + Number(order.shipping_amount).toLocaleString()}</span></div>
            ${Number(order.discount_amount) > 0 ? `<div class="summary-row"><span>Discount</span><span>-₹${Number(order.discount_amount).toLocaleString()}</span></div>` : ''}
            <div class="summary-row summary-total"><span>Total</span><span>₹${Number(order.total_amount).toLocaleString()}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with Gupta Traders!</p>
            <p>For questions, contact us at support@guptatraders.com</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <h1 className="text-3xl font-display font-bold mb-8">My Account</h1>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
              {orders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                  {orders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Addresses</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Manage your personal details</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={handleEditProfile}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editedProfile.full_name}
                        onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editedProfile.phone}
                        onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-display font-bold text-primary">
                          {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{profile?.full_name || 'Not set'}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{profile?.phone || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Member since {format(new Date(user.created_at), 'MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>View and track your orders</CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order: any) => {
                      const StatusIcon = statusIcons[order.status as OrderStatus] || Clock;
                      return (
                        <motion.div 
                          key={order.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-lg overflow-hidden"
                        >
                          {/* Order Header */}
                          <div className="p-4 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusColors[order.status as OrderStatus]}`}>
                                <StatusIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(order.created_at), 'PPP')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={statusColors[order.status as OrderStatus]}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                              <Badge className={paymentColors[order.payment_status as PaymentStatus]}>
                                {order.payment_status === 'pending' ? 'Unpaid' : order.payment_status}
                              </Badge>
                            </div>
                          </div>

                          {/* Order Items Preview */}
                          <div className="p-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {order.items?.slice(0, 3).map((item: any) => (
                                <div key={item.id} className="text-sm bg-muted/50 rounded px-2 py-1">
                                  {item.product_name} × {item.quantity}
                                </div>
                              ))}
                              {order.items?.length > 3 && (
                                <span className="text-sm text-muted-foreground">
                                  +{order.items.length - 3} more
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between pt-3 border-t">
                              <p className="text-lg font-semibold">{formatPrice(Number(order.total_amount))}</p>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handlePrintOrderSlip(order)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Order Slip
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
                    <Button onClick={() => navigate('/products')}>Browse Products</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Saved Addresses</CardTitle>
                  <CardDescription>Manage your delivery addresses</CardDescription>
                </div>
                <Button onClick={() => { resetAddressForm(); setIsAddingAddress(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </CardHeader>
              <CardContent>
                {addressesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : addresses.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                      <div key={address.id} className="border rounded-lg p-4 relative">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{address.label}</Badge>
                            {address.is_default && (
                              <Badge variant="outline">Default</Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAddress(address)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteAddress.mutate(address.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="font-medium">{address.full_name}</p>
                        <p className="text-sm text-muted-foreground">{address.address_line_1}</p>
                        {address.address_line_2 && (
                          <p className="text-sm text-muted-foreground">{address.address_line_2}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Phone className="h-3 w-3 inline mr-1" />
                          {address.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No addresses saved</h3>
                    <p className="text-muted-foreground mb-4">Add an address for faster checkout</p>
                    <Button onClick={() => { resetAddressForm(); setIsAddingAddress(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Address Dialog */}
        <Dialog open={isAddingAddress} onOpenChange={(open) => {
          setIsAddingAddress(open);
          if (!open) resetAddressForm();
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="Home, Office, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={newAddress.full_name}
                    onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 1 *</Label>
                <Input
                  value={newAddress.address_line_1}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line_1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={newAddress.address_line_2 || ''}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line_2: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PIN Code *</Label>
                  <Input
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={newAddress.country} disabled />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingAddress(false)}>Cancel</Button>
              <Button onClick={handleSaveAddress} disabled={createAddress.isPending || updateAddress.isPending}>
                {createAddress.isPending || updateAddress.isPending ? 'Saving...' : 'Save Address'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Order {selectedOrder.order_number}</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status Timeline */}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'returned' && (
                    <div>
                      <h4 className="font-medium mb-4">Order Progress</h4>
                      <div className="flex items-center justify-between relative">
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
                        <div 
                          className="absolute top-4 left-0 h-0.5 bg-primary transition-all"
                          style={{ 
                            width: `${(getOrderStatusIndex(selectedOrder.status) / (statusSteps.length - 1)) * 100}%` 
                          }}
                        />
                        {statusSteps.map((step, index) => {
                          const StepIcon = statusIcons[step];
                          const isCompleted = getOrderStatusIndex(selectedOrder.status) >= index;
                          const isCurrent = selectedOrder.status === step;
                          return (
                            <div key={step} className="relative z-10 flex flex-col items-center">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                                <StepIcon className="h-4 w-4" />
                              </div>
                              <span className={`text-xs mt-2 capitalize ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={statusColors[selectedOrder.status as OrderStatus]}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Payment:</span>
                      <Badge className={paymentColors[selectedOrder.payment_status as PaymentStatus]}>
                        <CreditCard className="h-3 w-3 mr-1" />
                        {selectedOrder.payment_status === 'pending' ? 'Unpaid' : selectedOrder.payment_status}
                      </Badge>
                    </div>
                  </div>

                  {/* Tracking */}
                  {selectedOrder.tracking_number && (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Tracking Number</p>
                      <p className="font-mono font-medium">{selectedOrder.tracking_number}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
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
                      <p className="mt-1">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {getShippingAddress(selectedOrder).phone}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-2">Items</h4>
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

                  <Separator />

                  {/* Summary */}
                  <div className="space-y-2">
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
                          ? 'Free' 
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

                <DialogFooter>
                  <Button variant="outline" onClick={() => handlePrintOrderSlip(selectedOrder)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Order Slip
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
