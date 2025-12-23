// Shared product type for both frontend and admin
export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  description: string | null;
  short_description: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  weight: number | null;
  room_type: string | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  sku: string | null;
  meta_title: string | null;
  meta_description: string | null;
  category_id: string | null;
  created_at?: string;
  updated_at?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  images?: {
    id: string;
    image_url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
  }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

// Helper function to get primary image or fallback
export function getProductImage(product: Product): string {
  if (product.images && product.images.length > 0) {
    const primaryImage = product.images.find(img => img.is_primary);
    return primaryImage?.image_url || product.images[0].image_url;
  }
  return '/placeholder.svg';
}

// Helper function to check if product is in stock
export function isInStock(product: Product): boolean {
  return product.stock_quantity > 0;
}

// Helper function to calculate discount percentage
export function getDiscountPercentage(product: Product): number {
  if (product.compare_at_price && product.compare_at_price > product.price) {
    return Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
  }
  return 0;
}

// Format price in INR
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}
