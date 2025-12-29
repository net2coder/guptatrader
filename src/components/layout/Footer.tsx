import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { useFooterItems } from '@/hooks/useFooterItems';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export function Footer() {
  const { data: footerItems = [] } = useFooterItems();
  const { data: storeSettings } = useStoreSettings();

  const quickLinks = footerItems.filter(item => item.section === 'quick_links');
  const customerService = footerItems.filter(item => item.section === 'customer_service');

  const storeName = storeSettings?.store_name || 'Gupta Traders';
  const storeEmail = storeSettings?.store_email || 'hello@guptatraders.com';
  const storePhone = storeSettings?.store_phone || '+91 98765 43210';
  const storeAddress = storeSettings?.store_address || '123 Furniture Lane, Sector 45, Gurugram, Haryana 122001';
  const facebookUrl = storeSettings?.facebook_url || '';
  const instagramUrl = storeSettings?.instagram_url || '';
  const twitterUrl = storeSettings?.twitter_url || '';

  return (
    <footer className="bg-foreground text-background">

      {/* Main footer */}
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div>
            <h4 className="font-display text-xl font-bold mb-4">{storeName}</h4>
            <p className="text-background/70 mb-6">
              Crafting beautiful spaces with quality furniture since 1985. Your trusted
              partner for home and office furnishing.
            </p>
            <div className="flex gap-4">
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-background/70 hover:text-background transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-background/70 hover:text-background transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {twitterUrl && (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-background/70 hover:text-background transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {!facebookUrl && !instagramUrl && !twitterUrl && (
                <span className="text-background/50 text-sm">No social links configured</span>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              {quickLinks.length > 0 ? (
                quickLinks.sort((a, b) => a.sort_order - b.sort_order).map(item => {
                  const url = item.url || '#';
                  const isExternal = url.startsWith('http://') || url.startsWith('https://');
                  
                  if (isExternal) {
                    return (
                      <a
                        key={item.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-background/70 hover:text-background transition-colors"
                      >
                        {item.title}
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.id}
                      to={url}
                      className="text-background/70 hover:text-background transition-colors"
                    >
                      {item.title}
                    </Link>
                  );
                })
              ) : (
                <>
                  <Link to="/products" className="text-background/70 hover:text-background transition-colors">
                    All Products
                  </Link>
                  <Link to="/products?category=sofas" className="text-background/70 hover:text-background transition-colors">
                    Sofas & Couches
                  </Link>
                  <Link to="/products?category=beds" className="text-background/70 hover:text-background transition-colors">
                    Beds & Mattresses
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <nav className="flex flex-col gap-2">
              {customerService.length > 0 ? (
                customerService.sort((a, b) => a.sort_order - b.sort_order).map(item => {
                  const url = item.url || '#';
                  const isExternal = url.startsWith('http://') || url.startsWith('https://');
                  
                  if (isExternal) {
                    return (
                      <a
                        key={item.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-background/70 hover:text-background transition-colors"
                      >
                        {item.title}
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.id}
                      to={url}
                      className="text-background/70 hover:text-background transition-colors"
                    >
                      {item.title}
                    </Link>
                  );
                })
              ) : (
                <>
                  <Link to="/profile?tab=orders" className="text-background/70 hover:text-background transition-colors">
                    Track Order
                  </Link>
                  <Link to="#" className="text-background/70 hover:text-background transition-colors">
                    Returns & Refunds
                  </Link>
                  <Link to="#" className="text-background/70 hover:text-background transition-colors">
                    FAQ
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-background/70 flex-shrink-0" />
                <span className="text-background/70">{storeAddress}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-background/70" />
                <span className="text-background/70">{storePhone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-background/70" />
                <span className="text-background/70">{storeEmail}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-background/10">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-background/60">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-background transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="hover:text-background transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
