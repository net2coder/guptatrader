import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { CategorySection } from '@/components/home/CategorySection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { PromoBanner } from '@/components/home/PromoBanner';
import { SEO } from '@/components/SEO';

const Index = () => {
  return (
    <Layout>
      <SEO />
      <HeroSection />
      <CategorySection />
      <FeaturedProducts />
      <PromoBanner />
    </Layout>
  );
};

export default Index;
