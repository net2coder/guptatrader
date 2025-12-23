import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { Product } from '@/types/product';

type SortOption = 'featured' | 'price-low' | 'price-high' | 'newest';

const priceRanges = [
  { label: 'Under ₹25,000', min: 0, max: 25000 },
  { label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
  { label: '₹50,000 - ₹1,00,000', min: 50000, max: 100000 },
  { label: 'Above ₹1,00,000', min: 100000, max: Infinity },
];

const materials = [
  'Solid Wood',
  'Engineered Wood',
  'Metal',
  'Fabric',
  'Leather',
  'Velvet',
  'Mesh',
];

const roomTypes = [
  'Living Room',
  'Bedroom',
  'Dining Room',
  'Office',
  'Study',
  'Kids Room',
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);

  const searchQuery = searchParams.get('search')?.toLowerCase() || '';

  // Fetch data from database
  const { data: products, isLoading: productsLoading } = useProducts({ search: searchQuery });
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let result = [...products] as Product[];

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(p =>
        selectedCategories.some(c => p.category?.slug?.toLowerCase() === c.toLowerCase())
      );
    }

    // Material filter
    if (selectedMaterials.length > 0) {
      result = result.filter(p =>
        selectedMaterials.some(m =>
          p.material?.toLowerCase().includes(m.toLowerCase())
        )
      );
    }

    // Room filter
    if (selectedRooms.length > 0) {
      result = result.filter(p => selectedRooms.includes(p.room_type || ''));
    }

    // Price filter
    if (selectedPriceRange !== null) {
      const range = priceRanges[selectedPriceRange];
      result = result.filter(p => p.price >= range.min && p.price <= range.max);
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      default:
        result.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    }

    return result;
  }, [products, selectedCategories, selectedMaterials, selectedRooms, selectedPriceRange, sortBy]);

  const toggleCategory = (categorySlug: string) => {
    setSelectedCategories(prev =>
      prev.includes(categorySlug)
        ? prev.filter(c => c !== categorySlug)
        : [...prev, categorySlug]
    );
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials(prev =>
      prev.includes(material)
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  };

  const toggleRoom = (room: string) => {
    setSelectedRooms(prev =>
      prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedMaterials([]);
    setSelectedRooms([]);
    setSelectedPriceRange(null);
    setSearchParams({});
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedMaterials.length > 0 ||
    selectedRooms.length > 0 ||
    selectedPriceRange !== null;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold">
          Categories
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {categories?.map(category => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${category.id}`}
                checked={selectedCategories.includes(category.slug)}
                onCheckedChange={() => toggleCategory(category.slug)}
              />
              <label
                htmlFor={`cat-${category.id}`}
                className="text-sm cursor-pointer flex-1"
              >
                {category.name}
              </label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold">
          Price Range
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {priceRanges.map((range, index) => (
            <div key={range.label} className="flex items-center gap-2">
              <Checkbox
                id={`price-${index}`}
                checked={selectedPriceRange === index}
                onCheckedChange={() =>
                  setSelectedPriceRange(prev => (prev === index ? null : index))
                }
              />
              <label htmlFor={`price-${index}`} className="text-sm cursor-pointer">
                {range.label}
              </label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Materials */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold">
          Material
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {materials.map(material => (
            <div key={material} className="flex items-center gap-2">
              <Checkbox
                id={`mat-${material}`}
                checked={selectedMaterials.includes(material)}
                onCheckedChange={() => toggleMaterial(material)}
              />
              <label htmlFor={`mat-${material}`} className="text-sm cursor-pointer">
                {material}
              </label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Room Type */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold">
          Room Type
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {roomTypes.map(room => (
            <div key={room} className="flex items-center gap-2">
              <Checkbox
                id={`room-${room}`}
                checked={selectedRooms.includes(room)}
                onCheckedChange={() => toggleRoom(room)}
              />
              <label htmlFor={`room-${room}`} className="text-sm cursor-pointer">
                {room}
              </label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearAllFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-4xl font-bold mb-2"
          >
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
          </motion.h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} products found
          </p>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-32">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              {/* Mobile filter button */}
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                        {selectedCategories.length +
                          selectedMaterials.length +
                          selectedRooms.length +
                          (selectedPriceRange !== null ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Active filters (desktop) */}
              <div className="hidden lg:flex flex-wrap gap-2">
                {selectedCategories.map(catSlug => {
                  const cat = categories?.find(c => c.slug === catSlug);
                  return (
                    <Button
                      key={catSlug}
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleCategory(catSlug)}
                      className="h-7"
                    >
                      {cat?.name || catSlug}
                      <X className="h-3 w-3 ml-1" />
                    </Button>
                  );
                })}
              </div>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products grid */}
            <ProductGrid products={filteredProducts} isLoading={productsLoading} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
