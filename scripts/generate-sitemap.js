/**
 * Sitemap Generator Script
 * Run this script to generate a sitemap.xml file
 * Usage: node scripts/generate-sitemap.js
 * 
 * Note: This requires Supabase credentials to fetch products and categories
 * For production, consider running this as a build step or scheduled job
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.VITE_SITE_URL || 'https://www.guptatraders.net';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateSitemap() {
  console.log('Generating sitemap...');

  const urls = [];

  // Homepage
  urls.push({
    loc: `${BASE_URL}/`,
    changefreq: 'daily',
    priority: '1.0',
    lastmod: new Date().toISOString().split('T')[0],
  });

  // Products page
  urls.push({
    loc: `${BASE_URL}/products`,
    changefreq: 'daily',
    priority: '0.9',
    lastmod: new Date().toISOString().split('T')[0],
  });

  try {
    // Fetch categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true);

    if (catError) {
      console.error('Error fetching categories:', catError);
    } else {
      categories?.forEach(category => {
        urls.push({
          loc: `${BASE_URL}/products?category=${category.slug}`,
          changefreq: 'weekly',
          priority: '0.8',
          lastmod: category.updated_at ? new Date(category.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        });
      });
    }

    // Fetch products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('slug, updated_at, images:product_images(image_url)')
      .eq('is_active', true);

    if (prodError) {
      console.error('Error fetching products:', prodError);
    } else {
      products?.forEach(product => {
        const urlEntry = {
          loc: `${BASE_URL}/product/${product.slug}`,
          changefreq: 'weekly',
          priority: '0.7',
          lastmod: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        };

        // Add image if available
        if (product.images && product.images.length > 0) {
          urlEntry.image = product.images[0].image_url;
        }

        urls.push(urlEntry);
      });
    }

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    <lastmod>${url.lastmod}</lastmod>${url.image ? `
    <image:image>
      <image:loc>${escapeXml(url.image)}</image:loc>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;

    // Write to public directory
    const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemap, 'utf8');

    console.log(`✅ Sitemap generated successfully with ${urls.length} URLs`);
    console.log(`📄 Saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

generateSitemap();
