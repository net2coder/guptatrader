import { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, MapPin, Phone, Download, Home, ShoppingBag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useOrder } from '@/hooks/useOrders';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { formatPrice } from '@/lib/utils';

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

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, error } = useOrder(orderId || '');
  const { data: storeSettings } = useStoreSettings();
  const printRef = useRef<HTMLDivElement>(null);

  const storeName = storeSettings?.store_name || 'Gupta Traders';
  const storePhone = storeSettings?.store_phone || '+91 98765 43210';
  const storeAddress = storeSettings?.store_address || '123 Furniture Lane, Sector 45, Gurugram, Haryana 122001';
  const gstNumber = storeSettings?.gst_number || 'GSTIN: 06XXXXX1234X1ZX';

  const getShippingAddress = (): ShippingAddress => {
    return (order?.shipping_address as ShippingAddress) || {};
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Order Slip - ${order?.order_number}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .header h1 { font-size: 24px; margin-bottom: 8px; }
              .header .contact { color: #666; font-size: 12px; margin-top: 8px; }
              .header .gst { font-size: 11px; color: #888; margin-top: 4px; }
              .section { margin-bottom: 24px; }
              .section-title { font-weight: 600; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .info-block p { font-size: 14px; margin-bottom: 4px; color: #333; }
              .info-block .label { color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
              th { font-weight: 600; background: #f9f9f9; }
              .text-right { text-align: right; }
              .total-row { font-weight: 600; }
              .summary { margin-top: 20px; }
              .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
              .summary-total { font-size: 18px; font-weight: 600; border-top: 2px solid #333; padding-top: 12px; margin-top: 12px; }
              .status-badge { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 12px; font-weight: 500; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
              .store-footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #333; text-align: center; }
              .store-footer h4 { font-size: 14px; margin-bottom: 8px; }
              .store-footer p { font-size: 12px; color: #666; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find the order you're looking for.
          </p>
          <Button asChild>
            <Link to="/">Go to Homepage</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const address = getShippingAddress();

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. We'll contact you shortly to confirm.
          </p>
        </motion.div>

        {/* Order Slip - Printable */}
        <Card className="mb-6">
          <CardContent className="p-6" ref={printRef}>
            {/* Header with Store Info */}
            <div className="header text-center mb-6">
              <h1 className="text-2xl font-bold">{storeName}</h1>
              <p className="text-muted-foreground">Order Confirmation Slip</p>
              <p className="contact text-sm text-muted-foreground mt-2">
                Phone: {storePhone}
              </p>
              <p className="gst text-xs text-muted-foreground">
                {gstNumber}
              </p>
            </div>

            {/* Order Info */}
            <div className="section grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="info-block">
                <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                <p className="font-semibold text-lg">{order.order_number}</p>
              </div>
              <div className="info-block">
                <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                <p className="font-semibold">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="info-block">
                <p className="text-sm text-muted-foreground mb-1">Order Status</p>
                <span className="status-badge inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                  {order.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <div className="info-block">
                <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  order.payment_status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_status.toUpperCase()}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Shipping Address */}
            <div className="section mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">{address.full_name}</p>
                <p>{address.address_line_1}</p>
                {address.address_line_2 && <p>{address.address_line_2}</p>}
                <p>{address.city}, {address.state} {address.postal_code}</p>
                <p>{address.country}</p>
                <p className="flex items-center gap-1 mt-2">
                  <Phone className="h-3 w-3" />
                  {address.phone}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Order Items */}
            <div className="section mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium">Product</th>
                    <th className="text-center py-2 text-sm font-medium">Qty</th>
                    <th className="text-right py-2 text-sm font-medium">Price</th>
                    <th className="text-right py-2 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">
                        <p className="text-sm font-medium">{item.product_name}</p>
                        {item.product_sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                        )}
                      </td>
                      <td className="text-center py-3 text-sm">{item.quantity}</td>
                      <td className="text-right py-3 text-sm">{formatPrice(Number(item.unit_price))}</td>
                      <td className="text-right py-3 text-sm font-medium">{formatPrice(Number(item.total_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order Summary */}
            <div className="summary bg-muted/30 rounded-lg p-4">
              <div className="space-y-2">
                <div className="summary-row flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="summary-row flex justify-between text-sm">
                  <span>Tax (18% GST)</span>
                  <span>{formatPrice(Number(order.tax_amount))}</span>
                </div>
                <div className="summary-row flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    {Number(order.shipping_amount) === 0 
                      ? 'Free' 
                      : formatPrice(Number(order.shipping_amount))}
                  </span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="summary-row flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(Number(order.discount_amount))}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="summary-total flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>{formatPrice(Number(order.total_amount))}</span>
                </div>
              </div>
            </div>

            {/* Footer with Store Address */}
            <div className="footer text-center mt-8 pt-6 border-t text-sm text-muted-foreground">
              <p className="font-medium mb-1">Payment Method: Manual Confirmation</p>
              <p>Our team will contact you to confirm your order and collect payment.</p>
            </div>

            <div className="store-footer text-center mt-6 pt-4 border-t-2">
              <h4 className="font-semibold text-sm mb-2">{storeName}</h4>
              <p className="text-xs text-muted-foreground">{storeAddress}</p>
              <p className="text-xs text-muted-foreground mt-1">Phone: {storePhone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handlePrint} variant="outline" size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download Order Slip
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/profile?tab=orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              View My Orders
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>

        {/* Important Notice */}
        <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-300">What's Next?</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
              <li>• Our team will review and confirm your order within 24 hours.</li>
              <li>• You will receive a call or message for payment confirmation.</li>
              <li>• Once payment is confirmed, your order will be processed for shipping.</li>
              <li>• You can track your order status from your profile.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
