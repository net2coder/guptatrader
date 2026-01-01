import { useEffect } from 'react';
import { useProducts, useCategories } from '@/hooks/useProducts';

const BASE_URL = import.meta.env.VITE_SITE_URL || 'https://www.guptatraders.net';

export default function SitemapPage() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  useEffect(() => {
    // Generate sitemap XML
    const urls: string[] = [];

    // Homepage
    urls.push(`
    <url>
      <loc>${BASE_URL}/</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    </url>`);

    // Products page
    urls.push(`
    <url>
      <loc>${BASE_URL}/products</loc>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    </url>`);

    // Category pages
    categories?.forEach(category => {
      urls.push(`
    <url>
      <loc>${BASE_URL}/products?category=${category.slug}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    </url>`);
    });

    // Product pages
    products?.forEach(product => {
      if (product.is_active) {
        urls.push(`
    <url>
      <loc>${BASE_URL}/product/${product.slug}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
      <lastmod>${product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    </url>`);
      }
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${urls.join('')}
</urlset>`;

    // Set content type and return XML
    document.contentType = 'application/xml';
    
    // For client-side rendering, we'll need to handle this differently
    // In production, this should be a server-side route
  }, [products, categories]);

  // Return XML response
  return (
    <div style={{ display: 'none' }}>
      {/* This page should be handled server-side or via a build-time generation */}
      Sitemap generation in progress...
    </div>
  );
}







