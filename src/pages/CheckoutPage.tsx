import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, Ticket, ShoppingBag, Phone, User, AlertCircle, FileText, Navigation } from 'lucide-react';
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
import { useShippingZones } from '@/hooks/useAdmin';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, calculateShippingAmount, ShippingBreakdown, ShippingZone, formatPriceWithGst, getGstPercentage } from '@/lib/utils';
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
  const { data: shippingZones = [] } = useShippingZones();
  const { data: storeSettings } = useStoreSettings();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // GST Number (optional)
  const [customerGstNumber, setCustomerGstNumber] = useState('');

  // Distance-based shipping
  const [deliveryDistance, setDeliveryDistance] = useState<number>(0);

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
  const subtotal = getCartTotal(); // Total price (already includes GST configured by admin)
  
  // Get GST percentage from Admin Settings
  const gstPercentage = getGstPercentage(storeSettings?.tax_rate);
  
  // In the new pricing model, prices shown are GST-inclusive
  // No additional GST calculation or addition needed
  // The subtotal already contains the GST configured by admin
  
  // Calculate shipping dynamically based on admin-configured shipping zones
  // Threshold, rates, and distance all come from the active shipping zone
  const shippingResult = calculateShippingAmount(
    subtotal,
    deliveryDistance,
    (shippingZones as ShippingZone[]) || []
  );
  const shippingAmount = shippingResult.amount;
  const shippingBreakdown: ShippingBreakdown | null = shippingResult.breakdown;
  
  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;
  
  // Final calculation: Price (already includes configured GST) + Shipping - Discount
  // No additional GST is added; the price shown is the final payable amount
  const totalAmount = subtotal + shippingAmount - discountAmount;

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
        p_user_id: user?.id || null,
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
        customerGstNumber: customerGstNumber.trim() || undefined,
        deliveryDistance: deliveryDistance,
        shippingBreakdown: shippingBreakdown,
      });

      // Clear cart after successful order
      await clearCart();

      // Navigate to order confirmation
      navigate(`/order-confirmation/${order.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Failed to place order',
        description: errorMessage,
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
                        Guest checkout - Please enter your details below
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Distance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Delivery Distance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="distance">Distance from Store (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      value={deliveryDistance}
                      onChange={(e) => setDeliveryDistance(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Enter distance in kilometers"
                      className="mt-2"
                    />
                  </div>
                  {deliveryDistance > 0 && shippingBreakdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm space-y-1"
                    >
                      <p className="font-medium text-blue-900 dark:text-blue-200">
                        Shipping Breakdown
                      </p>
                      {shippingBreakdown.is_free_shipping ? (
                        <p className="text-green-600 dark:text-green-400 font-medium">
                          ✓ Free Shipping (within {shippingBreakdown.distance_free_radius}km radius)
                        </p>
                      ) : (
                        <>
                          <p className="text-muted-foreground">
                            {shippingBreakdown.distance_charged > 0 && (
                              <>
                                Distance Charge: {shippingBreakdown.distance_charged.toFixed(1)}km × {formatPrice(shippingBreakdown.per_km_rate)}/km = {formatPrice(shippingBreakdown.distance_charge)}
                              </>
                            )}
                            {shippingBreakdown.distance_charged === 0 && (
                              <>Within free radius</>
                            )}
                          </p>
                          <Separator className="my-2" />
                          <p className="font-medium text-blue-900 dark:text-blue-200">
                            Total Shipping: {formatPrice(shippingBreakdown.total_shipping_charge)}
                          </p>
                        </>
                      )}
                    </motion.div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the distance from our store to your delivery address. Shipping rates are calculated based on distance and eligibility for free shipping ({shippingBreakdown?.distance_free_radius || 5}km free radius for qualifying orders).
                  </p>
                </div>
              </CardContent>
            </Card>

            {user ? null : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Guest Checkout
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                        <Label>Phone Number *</Label>
                        <Input
                          type="tel"
                          value={guestAddress.phone}
                          onChange={(e) => setGuestAddress(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter 10-digit mobile number"
                          required
                          className={!guestAddress.phone.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                        {!guestAddress.phone.trim() && (
                          <p className="text-xs text-destructive mt-1">Phone number is required</p>
                        )}
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
                </CardContent>
              </Card>
            )}

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

            {/* GST Number (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GST Number (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter GST Number (e.g., 22AAAAA0000A1Z5)"
                    value={customerGstNumber}
                    onChange={(e) => setCustomerGstNumber(e.target.value.toUpperCase())}
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have a GST number, enter it here to include on your invoice. This is optional and won't affect pricing.
                  </p>
                </div>
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
              <CardContent className="space-y-3">
                {/* COD Not Available */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                        Cash on Delivery (COD) not available for now
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        Please use the manual payment option below.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Manual Payment Option */}
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
                    <span className="text-right">
                      <div>{formatPrice(subtotal)}</div>
                      <div className="text-xs text-amber-600 font-medium">(includes {gstPercentage}% GST)</div>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {shippingBreakdown && shippingBreakdown.is_free_shipping ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : deliveryDistance <= 0 ? (
                        <span className="text-muted-foreground text-xs">Please enter distance in km.</span>
                      ) : (
                        <span>{formatPrice(shippingAmount)}</span>
                      )}
                    </span>
                  </div>
                  {deliveryDistance > 0 && shippingBreakdown && shippingBreakdown.distance_charged > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {shippingBreakdown.distance_charged.toFixed(1)}km beyond free radius
                    </p>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total Amount (Payable)</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || deliveryDistance <= 0 || (user ? !selectedAddressId : !isGuestCheckoutValid())}
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
