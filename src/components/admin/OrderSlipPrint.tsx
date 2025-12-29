import { forwardRef } from 'react';
import { formatPrice } from '@/lib/utils';
import { StoreSettings } from '@/hooks/useStoreSettings';

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

interface OrderItem {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_address: ShippingAddress;
  guest_email?: string;
  customer_gst_number?: string;
  tracking_number?: string;
  created_at: string;
  items?: OrderItem[];
}

interface OrderSlipPrintProps {
  order: Order;
  storeSettings?: StoreSettings;
}

const OrderSlipPrint = forwardRef<HTMLDivElement, OrderSlipPrintProps>(
  ({ order, storeSettings }, ref) => {
    const address = order.shipping_address || {};

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto font-sans">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {storeSettings?.store_name || 'Gharaunda'}
            </h1>
            {storeSettings?.store_address && (
              <p className="text-sm text-gray-600 mt-1 max-w-xs">
                {storeSettings.store_address}
              </p>
            )}
            {storeSettings?.store_phone && (
              <p className="text-sm text-gray-600">Phone: {storeSettings.store_phone}</p>
            )}
            {storeSettings?.store_email && (
              <p className="text-sm text-gray-600">Email: {storeSettings.store_email}</p>
            )}
            {storeSettings?.gst_number && (
              <p className="text-sm font-medium text-gray-700 mt-2">
                GSTIN: {storeSettings.gst_number}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">ORDER SLIP / INVOICE</h2>
            <p className="text-lg font-semibold text-gray-700 mt-2">{order.order_number}</p>
            <p className="text-sm text-gray-600 mt-1">
              Date: {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div className="mt-2 flex gap-2 justify-end">
              <span className="text-xs px-2 py-1 bg-gray-200 rounded uppercase font-medium">
                {order.status}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-200 rounded uppercase font-medium">
                {order.payment_status === 'pending' ? 'Unpaid' : order.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Ship To
            </h3>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="font-semibold text-gray-900">{address.full_name}</p>
              <p className="text-sm text-gray-600">{address.address_line_1}</p>
              {address.address_line_2 && (
                <p className="text-sm text-gray-600">{address.address_line_2}</p>
              )}
              <p className="text-sm text-gray-600">
                {address.city}, {address.state} - {address.postal_code}
              </p>
              <p className="text-sm text-gray-600">{address.country || 'India'}</p>
              {address.phone && (
                <p className="text-sm text-gray-700 mt-2 font-medium">
                  Phone: {address.phone}
                </p>
              )}
              {order.guest_email && (
                <p className="text-sm text-gray-600">Email: {order.guest_email}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
              Order Info
            </h3>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-1">
              <p className="text-sm">
                <span className="text-gray-600">Order Date:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Date(order.created_at).toLocaleDateString('en-IN')}
                </span>
              </p>
              {order.tracking_number && (
                <p className="text-sm">
                  <span className="text-gray-600">Tracking:</span>{' '}
                  <span className="font-medium text-gray-900">{order.tracking_number}</span>
                </p>
              )}
              {order.customer_gst_number && (
                <p className="text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Customer GSTIN:</span>{' '}
                  <span className="font-bold text-gray-900">{order.customer_gst_number}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
            Order Items
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left py-3 px-4 text-sm font-semibold">#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Item</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
                <th className="text-center py-3 px-4 text-sm font-semibold">Qty</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Unit Price</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 text-sm border-b border-gray-200">{index + 1}</td>
                  <td className="py-3 px-4 text-sm border-b border-gray-200 font-medium">
                    {item.product_name}
                  </td>
                  <td className="py-3 px-4 text-sm border-b border-gray-200 text-gray-600">
                    {item.product_sku || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm border-b border-gray-200 text-center">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-4 text-sm border-b border-gray-200 text-right">
                    {formatPrice(Number(item.unit_price))}
                  </td>
                  <td className="py-3 px-4 text-sm border-b border-gray-200 text-right font-medium">
                    {formatPrice(Number(item.total_price))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Summary */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Tax (GST 18%)</span>
                <span className="font-medium">{formatPrice(Number(order.tax_amount))}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {Number(order.shipping_amount) === 0
                    ? 'Free'
                    : formatPrice(Number(order.shipping_amount))}
                </span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-sm py-1 text-green-700">
                  <span>Discount</span>
                  <span className="font-medium">-{formatPrice(Number(order.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 mt-2 pt-2">
                <span>Total</span>
                <span>{formatPrice(Number(order.total_amount))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
          <p>Thank you for your order!</p>
          {storeSettings?.store_name && (
            <p className="mt-1">© {new Date().getFullYear()} {storeSettings.store_name}. All rights reserved.</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Terms & Conditions: Guarantee and warranty are provided by the respective company, not the seller.
          </p>
        </div>
      </div>
    );
  }
);

OrderSlipPrint.displayName = 'OrderSlipPrint';

export default OrderSlipPrint;
