import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Truck,
  Shield,
  Award,
  Minus,
  Plus,
  Check,
  Share2,
  Package,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { useProduct, useProducts } from '@/hooks/useProducts';
import { useShippingZones } from '@/hooks/useAdmin';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { toast } from 'sonner';
import { getProductImage, getDiscountPercentage, formatPrice, isInStock } from '@/types/product';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug || '');
  const { data: shippingZones = [] } = useShippingZones();
  const { data: storeSettings } = useStoreSettings();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const { data: allProducts } = useProducts();
  const relatedProducts = allProducts
    ?.filter(p => p.category_id === product?.category_id && p.id !== product?.id)
    .slice(0, 4) || [];

  // Get free shipping threshold from active shipping zone
  const activeZone = shippingZones.find(zone => zone.is_active);
  const freeShippingThreshold = activeZone?.free_shipping_threshold ?? 10000;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6 md:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="w-16 h-16 rounded-lg flex-shrink-0" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="max-w-md mx-auto">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h1 className="font-display text-2xl font-bold mb-3">Product Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild size="lg">
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const images = product.images?.length ? product.images.sort((a, b) => a.sort_order - b.sort_order) : [];
  const currentImage = images[currentImageIndex]?.image_url || getProductImage(product);
  const discountPercentage = getDiscountPercentage(product);
  const inStock = isInStock(product);
  const categoryName = product.category?.name || 'Uncategorized';

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    toast.success(`${product.name} added to cart`);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    toast.success(
      isInWishlist(product.id)
        ? `${product.name} removed from wishlist`
        : `${product.name} added to wishlist`
    );
  };

  const handleBuyNow = () => {
    addToCart(product.id, quantity);
    navigate('/checkout');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || product.name,
          url: window.location.href,
        });
      } catch (err) {
        // Share was cancelled or failed, no action needed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <Layout>
      <div className="container py-4 md:py-8">
        {/* Breadcrumbs - Hidden on mobile */}
        <nav className="hidden md:flex text-sm text-muted-foreground mb-6">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li>
              <Link to="/products" className="hover:text-foreground transition-colors">
                Products
              </Link>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li>
              <Link
                to={`/products?category=${product.category?.slug || ''}`}
                className="hover:text-foreground transition-colors"
              >
                {categoryName}
              </Link>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li className="text-foreground truncate max-w-[200px]">{product.name}</li>
          </ol>
        </nav>

        {/* Mobile back button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden mb-4 -ml-2 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Image gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3 md:space-y-4"
          >
            <div className="relative aspect-square bg-secondary rounded-xl md:rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={currentImage}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Badges */}
              <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-col gap-2">
                {product.is_featured && (
                  <Badge className="bg-accent text-accent-foreground text-xs font-medium">
                    Featured
                  </Badge>
                )}
                {discountPercentage > 0 && (
                  <Badge variant="destructive" className="text-xs font-medium">
                    {discountPercentage}% OFF
                  </Badge>
                )}
              </div>

              {/* Share button - Mobile */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 md:top-4 md:right-4 h-9 w-9 rounded-full shadow-md"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg opacity-90 hover:opacity-100"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg opacity-90 hover:opacity-100"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Image indicators - Mobile */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-primary w-4'
                          : 'bg-primary/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails - Desktop only */}
            {images.length > 1 && (
              <div className="hidden md:flex gap-3 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      index === currentImageIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || `${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-5 md:space-y-6"
          >
            <div>
              <Link
                to={`/products?category=${product.category?.slug || ''}`}
                className="text-sm text-primary font-medium uppercase tracking-wide hover:underline"
              >
                {categoryName}
              </Link>
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold mt-2 text-foreground">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
              {product.compare_at_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
              {discountPercentage > 0 && (
                <Badge className="bg-success text-success-foreground text-xs">
                  Save {discountPercentage}%
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {product.description || product.short_description || 'No description available.'}
            </p>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              {inStock ? (
                <div className="flex items-center gap-2 text-success">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="font-medium text-sm">Available</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="font-medium text-sm">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Warranty Information */}
            {product.has_warranty && product.warranty_years && (
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-green-900 dark:text-green-100">
                      {product.warranty_years} Year{Number(product.warranty_years) > 1 ? 's' : ''} Warranty
                    </span>
                  </div>
                  {storeSettings?.warranty_terms && (
                    <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                      {storeSettings.warranty_terms}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Quantity and actions */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Quantity</span>
                <div className="flex items-center bg-secondary rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-l-lg"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold text-foreground">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-r-lg"
                    onClick={() =>
                      setQuantity(q => Math.min(product.stock_quantity, q + 1))
                    }
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action buttons - Large, Touch-Friendly */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="flex-1 h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 touch-manipulation"
                    onClick={handleAddToCart}
                    disabled={!inStock}
                  >
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                    {isInCart(product.id) ? 'Add More' : 'Add to Cart'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 sm:h-16 w-14 sm:w-16 rounded-xl border-2 flex-shrink-0 active:scale-[0.98] transition-all duration-200 touch-manipulation"
                    onClick={handleToggleWishlist}
                  >
                    <Heart
                      className={`h-6 w-6 ${
                        isInWishlist(product.id) ? 'fill-current text-destructive' : ''
                      }`}
                    />
                  </Button>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-xl border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all duration-200 touch-manipulation"
                  onClick={handleBuyNow}
                  disabled={!inStock}
                >
                  Buy Now
                </Button>
              </div>
            </div>

            {/* Features - Cards on mobile, inline on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              {[
                { icon: Truck, title: 'Free Delivery', desc: `On orders above ₹${freeShippingThreshold.toLocaleString()}` },
                ...(product.has_warranty && product.warranty_years ? [
                  { icon: Shield, title: `${product.warranty_years} Year${Number(product.warranty_years) > 1 ? 's' : ''} Warranty`, desc: 'Manufacturer warranty' }
                ] : []),
                { icon: Award, title: 'Best Price', desc: 'Quality at best prices' },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10 md:mt-16"
        >
          <Tabs defaultValue="specifications" className="w-full">
            <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent overflow-x-auto">
              <TabsTrigger
                value="specifications"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap"
              >
                Specifications
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap"
              >
                Shipping Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="specifications" className="py-6">
              <div className="max-w-2xl">
                {(product.dimensions || product.weight || product.material || product.color || product.sku) ? (
                  <div className="bg-secondary/30 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {product.dimensions && (
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 font-medium text-foreground w-1/3">Dimensions</td>
                            <td className="py-3 px-4 text-muted-foreground">{product.dimensions}</td>
                          </tr>
                        )}
                        {product.weight && (
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 font-medium text-foreground">Weight</td>
                            <td className="py-3 px-4 text-muted-foreground">{product.weight} kg</td>
                          </tr>
                        )}
                        {product.material && (
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 font-medium text-foreground">Material</td>
                            <td className="py-3 px-4 text-muted-foreground">{product.material}</td>
                          </tr>
                        )}
                        {product.color && (
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 font-medium text-foreground">Color</td>
                            <td className="py-3 px-4 text-muted-foreground">{product.color}</td>
                          </tr>
                        )}
                        {product.sku && (
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 font-medium text-foreground">SKU</td>
                            <td className="py-3 px-4 text-muted-foreground font-mono text-sm">{product.sku}</td>
                          </tr>
                        )}
                        {product.has_warranty && product.warranty_years && (
                          <tr>
                            <td className="py-3 px-4 font-medium text-foreground">Warranty</td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {product.warranty_years} Year{Number(product.warranty_years) > 1 ? 's' : ''}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No specifications available.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="py-6">
              <div className="max-w-2xl space-y-6">
                <div className="bg-secondary/30 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Shipping</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Free shipping on orders above ₹{freeShippingThreshold.toLocaleString()}. Standard delivery takes 5-7
                        business days. Express delivery available at additional cost.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-secondary/30 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Warranty & Support</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        All our products come with a manufacturer warranty of up to 5 years.
                        For any issues, our support team is available 24/7 to assist you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-12 md:mt-20"
          >
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
                You May Also Like
              </h2>
              <Button variant="ghost" asChild className="text-primary">
                <Link to={`/products?category=${product.category?.slug || ''}`}>
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <ProductGrid products={relatedProducts} />
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
