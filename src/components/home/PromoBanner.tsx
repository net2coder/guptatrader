import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnnouncementCoupons } from '@/hooks/useCoupons';

export function PromoBanner() {
  const { data: coupons = [] } = useAnnouncementCoupons();

  // If no announcement coupons, show default promo or hide
  if (coupons.length === 0) {
    return (
      <section className="py-16 md:py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-8 md:p-16"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 max-w-2xl">
              <p className="text-primary-foreground/80 text-sm uppercase tracking-widest mb-4">
                Free Shipping
              </p>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
                Free Delivery on Orders Above ₹10,000
              </h2>
              <p className="text-primary-foreground/90 text-lg mb-8">
                Shop now and enjoy free delivery on all orders above ₹10,000.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="text-base"
              >
                <Link to="/products">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // Show announcement coupons
  const mainCoupon = coupons[0];
  const discountText = mainCoupon.discount_type === 'percentage' 
    ? `${mainCoupon.discount_value}% Off`
    : `₹${mainCoupon.discount_value} Off`;

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-8 md:p-16"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-2xl">
            <p className="text-primary-foreground/80 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Limited Time Offer
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
              Get {discountText} on Your Order
            </h2>
            <p className="text-primary-foreground/90 text-lg mb-8">
              {mainCoupon.description || `Use code`}{' '}
              <span className="font-bold bg-primary-foreground/20 px-2 py-1 rounded">
                {mainCoupon.code}
              </span>{' '}
              at checkout.
              {mainCoupon.minimum_order_amount && (
                <span className="block mt-2 text-sm">
                  *Minimum order of ₹{mainCoupon.minimum_order_amount}
                </span>
              )}
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-base"
            >
              <Link to="/products">
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Show multiple coupons as a ticker if more than one */}
          {coupons.length > 1 && (
            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-primary-foreground text-xs font-medium">
                  More offers available!
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
