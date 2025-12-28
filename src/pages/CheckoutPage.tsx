import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, Ticket, ShoppingBag, Phone, User, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface CouponValidation {
  valid: boolean;
  discount_amount: number;
  message: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCartItems, getCartTotal, clearCart, isLoading: cartLoading } = useCart();
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Guest checkout fields
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState({
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const cartItems = getCartItems();
  const subtotal = getCartTotal();
  const taxAmount = subtotal * 0.18; // 18% GST
  const shippingAmount = subtotal >= 10000 ? 0 : 500;
  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;
  const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

  // Fetch user addresses
  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, cartLoading, navigate]);

  const fetchAddresses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    if (!error && data) {
      setAddresses(data);
      const defaultAddr = data.find(a => a.is_default) || data[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: 'Please enter a coupon code', variant: 'destructive' });
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.toUpperCase(),
        p_order_subtotal: subtotal,
      });

      if (error) throw error;

      const result = data?.[0] as CouponValidation;
      if (result?.valid) {
        setAppliedCoupon(result);
        toast({ title: 'Coupon applied!', description: result.message });
      } else {
        toast({ 
          title: 'Invalid coupon', 
          description: result?.message || 'This coupon is not valid.',
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({ title: 'Error validating coupon', variant: 'destructive' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const getSelectedAddress = (): Address | null => {
    return addresses.find(a => a.id === selectedAddressId) || null;
  };

  const isGuestCheckoutValid = () => {
    return (
      guestEmail.trim() &&
      guestAddress.full_name.trim() &&
      guestAddress.phone.trim() &&
      guestAddress.address_line_1.trim() &&
      guestAddress.city.trim() &&
      guestAddress.state.trim() &&
      guestAddress.postal_code.trim()
    );
  };

  const handlePlaceOrder = async () => {
    // Validate
    if (user && !selectedAddressId) {
      toast({ title: 'Please select a delivery address', variant: 'destructive' });
      return;
    }

    if (!user && !isGuestCheckoutValid()) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const shippingAddress = user
        ? {
            full_name: getSelectedAddress()?.full_name || '',
            phone: getSelectedAddress()?.phone || '',
            address_line_1: getSelectedAddress()?.address_line_1 || '',
            address_line_2: getSelectedAddress()?.address_line_2 || '',
            city: getSelectedAddress()?.city || '',
            state: getSelectedAddress()?.state || '',
            postal_code: getSelectedAddress()?.postal_code || '',
            country: getSelectedAddress()?.country || 'India',
          }
        : guestAddress;

      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.product?.name || '',
        sku: '',
        price: item.product?.price || 0,
      }));

      const order = await createOrder.mutateAsync({
        items: orderItems,
        shippingAddress,
        guestEmail: user ? undefined : guestEmail,
        discountAmount: discountAmount,
        couponCode: appliedCoupon?.valid ? couponCode.toUpperCase() : undefined,
      });

      // Clear cart after successful order
      await clearCart();

      // Navigate to order confirmation
      navigate(`/order-confirmation/${order.id}`);
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: 'Failed to place order',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/cart">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>
        </Button>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl md:text-4xl font-bold mb-8"
        >
          Checkout
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main checkout form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user ? (
                  <div className="space-y-4">
                    {addresses.length > 0 ? (
                      <div className="grid gap-4">
                        {addresses.map(addr => (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedAddressId === addr.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{addr.full_name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {addr.label}
                                  </Badge>
                                  {addr.is_default && (
                                    <Badge variant="outline" className="text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {addr.address_line_1}
                                  {addr.address_line_2 && `, ${addr.address_line_2}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {addr.city}, {addr.state} {addr.postal_code}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Phone: {addr.phone}
                                </p>
                              </div>
                              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                selectedAddressId === addr.id ? 'border-primary' : 'border-muted-foreground/30'
                              }`}>
                                {selectedAddressId === addr.id && (
                                  <div className="h-3 w-3 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-4">No saved addresses</p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/profile?tab=addresses')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Address
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Guest checkout - Your order details will be sent to your email
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <Label>Full Name *</Label>
                        <Input
                          value={guestAddress.full_name}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label>Phone *</Label>
                        <Input
                          value={guestAddress.phone}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Address Line 1 *</Label>
                        <Input
                          value={guestAddress.address_line_1}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, address_line_1: e.target.value }))}
                          placeholder="House/Flat No., Building Name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Address Line 2</Label>
                        <Input
                          value={guestAddress.address_line_2}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, address_line_2: e.target.value }))}
                          placeholder="Street, Locality"
                        />
                      </div>
                      <div>
                        <Label>City *</Label>
                        <Input
                          value={guestAddress.city}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Mumbai"
                        />
                      </div>
                      <div>
                        <Label>State *</Label>
                        <Input
                          value={guestAddress.state}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="Maharashtra"
                        />
                      </div>
                      <div>
                        <Label>PIN Code *</Label>
                        <Input
                          value={guestAddress.postal_code}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                          placeholder="400001"
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input
                          value={guestAddress.country}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button variant="outline" asChild>
                        <Link to="/auth">
                          <User className="h-4 w-4 mr-2" />
                          Sign in for faster checkout
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coupon */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Apply Coupon
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appliedCoupon?.valid ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        {couponCode.toUpperCase()} applied
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        You save {formatPrice(appliedCoupon.discount_amount)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCoupon}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1"
                    />
                    <Button 
                      onClick={validateCoupon} 
                      disabled={isValidatingCoupon}
                      variant="secondary"
                    >
                      {isValidatingCoupon ? 'Checking...' : 'Apply'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="font-medium mb-2">Manual Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will contact you to confirm your order and payment. 
                    No online payment is collected at this time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-32">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.productId} className="flex gap-3">
                      <div className="h-16 w-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {item.product?.images?.[0] && (
                          <img
                            src={item.product.images[0].image_url}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">
                          {item.product?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-sm font-medium">
                          {formatPrice((item.product?.price || 0) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (18% GST)</span>
                    <span>{formatPrice(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {shippingAmount === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        formatPrice(shippingAmount)
                      )}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || (user ? !selectedAddressId : !isGuestCheckoutValid())}
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By placing this order, you agree to our Terms & Conditions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
