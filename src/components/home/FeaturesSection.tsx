import { motion } from 'framer-motion';
import { Truck, Shield, Headphones, RefreshCw } from 'lucide-react';
import { useShippingZones } from '@/hooks/useAdmin';

export function FeaturesSection() {
  const { data: shippingZones = [] } = useShippingZones();
  
  // Get free shipping threshold from active shipping zone
  const activeZone = shippingZones.find(zone => zone.is_active);
  const freeShippingThreshold = activeZone?.free_shipping_threshold ?? 10000;

  const features = [
    {
      icon: Truck,
      title: 'Free Delivery',
      description: `Free shipping on orders above ₹${freeShippingThreshold.toLocaleString()} across India`,
    },
    {
      icon: Shield,
      title: 'Quality Guarantee',
      description: 'Premium materials with up to 10 years warranty',
    },
    {
      icon: RefreshCw,
      title: 'Easy Returns',
      description: '30-day hassle-free returns and exchanges',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      description: 'Round the clock customer support assistance',
    },
  ];
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <feature.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-primary-foreground/70">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
