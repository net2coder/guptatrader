import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sofa, BedDouble, UtensilsCrossed, Armchair, Archive, Briefcase, LucideIcon } from 'lucide-react';
import { useCategories } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

// Default icons for common category names (fallback when no image)
const categoryIcons: Record<string, LucideIcon> = {
  'sofas': Sofa,
  'beds': BedDouble,
  'dining': UtensilsCrossed,
  'chairs': Armchair,
  'storage': Archive,
  'office': Briefcase,
};

const categoryColors: Record<string, string> = {
  'sofas': 'bg-amber-100',
  'beds': 'bg-rose-100',
  'dining': 'bg-emerald-100',
  'chairs': 'bg-sky-100',
  'storage': 'bg-violet-100',
  'office': 'bg-orange-100',
};

export function CategorySection() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="container">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const displayCategories = categories?.slice(0, 6) || [];

  return (
    <section className="py-16 md:py-24 bg-secondary/50">
      <div className="container">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-bold mb-4"
          >
            Shop by Category
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            Find the perfect piece for every room in your home
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {displayCategories.map((category, index) => {
            const IconComponent = categoryIcons[category.slug.toLowerCase()] || Sofa;
            const bgColor = categoryColors[category.slug.toLowerCase()] || 'bg-gray-100';
            const hasImage = !!category.image_url;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/products?category=${category.slug}`}
                  className="group block"
                >
                  <div className="bg-card rounded-xl p-6 text-center card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 rounded-full ${!hasImage ? bgColor : ''} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 overflow-hidden`}
                    >
                      {hasImage ? (
                        <img 
                          src={category.image_url!} 
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <IconComponent className="w-7 h-7 text-foreground/70" />
                      )}
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {category.description}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
