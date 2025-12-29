import { useEffect } from 'react';
import { useSEO, generateProductStructuredData, generateBreadcrumbStructuredData, SEOData } from '@/hooks/useSEO';
import type { Product } from '@/types/product';

interface SEOProps {
  data?: SEOData;
  product?: Product;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export function SEO({ data, product, breadcrumbs }: SEOProps) {
  useSEO(data);

  useEffect(() => {
    // Remove existing structured data scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => {
      // Keep the base organization/website schemas, remove product-specific ones
      const content = script.textContent || '';
      if (content.includes('"@type":"Product"') || content.includes('"@type":"BreadcrumbList"')) {
        script.remove();
      }
    });

    // Add product structured data
    if (product) {
      const productSchema = generateProductStructuredData({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || null,
        price: product.price,
        compare_at_price: product.compare_at_price,
        images: product.images?.map(img => ({
          image_url: img.image_url,
          alt_text: img.alt_text,
        })),
        category: product.category || null,
        stock_quantity: product.stock_quantity,
        sku: product.sku || null,
        material: product.material || null,
        brand: 'Gupta Traders',
      });

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(productSchema);
      document.head.appendChild(script);
    }

    // Add breadcrumb structured data
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = generateBreadcrumbStructuredData(breadcrumbs);
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(script);
    }
  }, [product, breadcrumbs]);

  return null; // This component doesn't render anything
}
