import { useEffect } from 'react';
import { useStoreSettings } from './useStoreSettings';

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  product?: {
    name: string;
    price: number;
    currency?: string;
    availability?: 'in stock' | 'out of stock' | 'preorder';
    condition?: 'new' | 'used' | 'refurbished';
    brand?: string;
    category?: string;
  };
}

export const BASE_URL = import.meta.env.VITE_SITE_URL || 'https://www.guptatraders.net';
export const DEFAULT_TITLE = 'Gupta Traders - Premium Furniture Store | Quality Home & Office Furniture';
export const DEFAULT_DESCRIPTION = 'Shop premium quality furniture at Gupta Traders. Discover sofas, beds, dining tables, office chairs & more. Free delivery, 5-year warranty, easy returns. India\'s trusted furniture destination.';
export const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

export function useSEO(seoData?: SEOData) {
  const { data: storeSettings } = useStoreSettings();
  const storeName = storeSettings?.store_name || 'Gupta Traders';

  useEffect(() => {
    if (!seoData) {
      // Set default SEO
      updateMetaTags({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        url: BASE_URL,
        type: 'website',
      });
      return;
    }

    const title = seoData.title 
      ? `${seoData.title} | ${storeName}`
      : DEFAULT_TITLE;
    
    const description = seoData.description || DEFAULT_DESCRIPTION;
    const image = seoData.image || DEFAULT_IMAGE;
    const url = seoData.url || BASE_URL;
    const type = seoData.type || 'website';

    updateMetaTags({
      title,
      description,
      image,
      url,
      type,
      keywords: seoData.keywords,
      product: seoData.product,
    });
  }, [seoData, storeName]);
}

function updateMetaTags(data: {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  keywords?: string;
  product?: SEOData['product'];
}) {
  // Primary Meta Tags
  document.title = data.title;
  updateMetaTag('name', 'title', data.title);
  updateMetaTag('name', 'description', data.description);
  if (data.keywords) {
    updateMetaTag('name', 'keywords', data.keywords);
  }
  updateMetaTag('name', 'robots', 'index, follow');
  updateMetaTag('property', 'og:url', data.url);
  updateMetaTag('rel', 'canonical', data.url);

  // Open Graph / Facebook
  updateMetaTag('property', 'og:type', data.type);
  updateMetaTag('property', 'og:title', data.title);
  updateMetaTag('property', 'og:description', data.description);
  updateMetaTag('property', 'og:image', data.image);
  updateMetaTag('property', 'og:site_name', 'Gupta Traders');
  updateMetaTag('property', 'og:locale', 'en_IN');

  // Twitter
  updateMetaTag('name', 'twitter:card', 'summary_large_image');
  updateMetaTag('name', 'twitter:url', data.url);
  updateMetaTag('name', 'twitter:title', data.title);
  updateMetaTag('name', 'twitter:description', data.description);
  updateMetaTag('name', 'twitter:image', data.image);

  // Product-specific meta tags
  if (data.type === 'product' && data.product) {
    updateMetaTag('property', 'product:price:amount', data.product.price.toString());
    updateMetaTag('property', 'product:price:currency', data.product.currency || 'INR');
    updateMetaTag('property', 'product:availability', data.product.availability || 'in stock');
    updateMetaTag('property', 'product:condition', data.product.condition || 'new');
    if (data.product.brand) {
      updateMetaTag('property', 'product:brand', data.product.brand);
    }
  }
}

function updateMetaTag(attribute: 'name' | 'property' | 'rel', key: string, value: string) {
  if (attribute === 'rel') {
    // Handle canonical link
    let link = document.querySelector(`link[rel="canonical"]`) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = value;
    return;
  }

  let meta = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = value;
}

export function generateProductStructuredData(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  images?: Array<{ image_url: string; alt_text: string | null }>;
  category?: { name: string; slug: string } | null;
  stock_quantity: number;
  sku: string | null;
  material: string | null;
  brand?: string;
}) {
  const image = product.images?.[0]?.image_url || `${BASE_URL}/placeholder.svg`;
  const availability = product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const offer = {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'INR',
    availability: availability,
    url: `${BASE_URL}/product/${product.slug}`,
    priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
  };

  if (product.compare_at_price && product.compare_at_price > product.price) {
    offer.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: product.price,
      priceCurrency: 'INR',
      referenceQuantity: {
        '@type': 'QuantitativeValue',
        value: 1,
        unitCode: 'C62', // unit
      },
    };
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - Premium furniture from Gupta Traders`,
    image: product.images?.map(img => img.image_url) || [image],
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Gupta Traders',
    },
    category: product.category?.name || 'Furniture',
    offers: offer,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: '0',
    },
  };

  if (product.material) {
    structuredData.additionalProperty = [
      {
        '@type': 'PropertyValue',
        name: 'Material',
        value: product.material,
      },
    ];
  }

  return structuredData;
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

