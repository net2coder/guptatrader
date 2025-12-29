import { useState } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminProducts, useDeleteProduct, useUpdateProduct, useCreateProduct, useCategories } from '@/hooks/useProducts';
import { useProductVariants, useCreateProductVariant, useUpdateProductVariant, useDeleteProductVariant } from '@/hooks/useAdmin';
import { formatPrice } from '@/lib/utils';
import { ProductImageGallery } from '@/components/admin/ProductImageGallery';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Package,
  Layers,
  ImageIcon,
  Star,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Box,
  Tag,
  Settings2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  sku: string;
  barcode: string;
  stock_quantity: string;
  low_stock_threshold: string;
  category_id: string;
  material: string;
  color: string;
  dimensions: string;
  weight: string;
  room_type: string;
  meta_title: string;
  meta_description: string;
  is_active: boolean;
  is_featured: boolean;
}

const defaultFormData: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  short_description: '',
  price: '',
  compare_at_price: '',
  cost_price: '',
  sku: '',
  barcode: '',
  stock_quantity: '0',
  low_stock_threshold: '5',
  category_id: '',
  material: '',
  color: '',
  dimensions: '',
  weight: '',
  room_type: '',
  meta_title: '',
  meta_description: '',
  is_active: true,
  is_featured: false,
};

export default function AdminProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState({ name: '', sku: '', price_modifier: '0', stock_quantity: '0' });

  const { data: products = [], isLoading } = useAdminProducts();
  const { data: categories = [] } = useCategories();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  
  const { data: variants = [] } = useProductVariants(selectedProductId || '');
  const createVariant = useCreateProductVariant();
  const updateVariant = useUpdateProductVariant();
  const deleteVariant = useDeleteProductVariant();

  const filteredProducts = products.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProducts = products.filter(p => p.is_active).length;
  const featuredProducts = products.filter(p => p.is_featured).length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5)).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await updateProduct.mutateAsync({ id, is_active: !currentStatus });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      short_description: product.short_description || '',
      price: String(product.price || ''),
      compare_at_price: String(product.compare_at_price || ''),
      cost_price: String(product.cost_price || ''),
      sku: product.sku || '',
      barcode: product.barcode || '',
      stock_quantity: String(product.stock_quantity || 0),
      low_stock_threshold: String(product.low_stock_threshold || 5),
      category_id: product.category_id || '',
      material: product.material || '',
      color: product.color || '',
      dimensions: product.dimensions || '',
      weight: String(product.weight || ''),
      room_type: product.room_type || '',
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: formData.name,
      slug: formData.slug || generateSlug(formData.name),
      description: formData.description || null,
      short_description: formData.short_description || null,
      price: Number(formData.price),
      compare_at_price: formData.compare_at_price ? Number(formData.compare_at_price) : null,
      cost_price: formData.cost_price ? Number(formData.cost_price) : null,
      sku: formData.sku || null,
      barcode: formData.barcode || null,
      stock_quantity: Number(formData.stock_quantity),
      low_stock_threshold: Number(formData.low_stock_threshold),
      category_id: formData.category_id || null,
      material: formData.material || null,
      color: formData.color || null,
      dimensions: formData.dimensions || null,
      weight: formData.weight ? Number(formData.weight) : null,
      room_type: formData.room_type || null,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    setFormData(defaultFormData);
    setEditingProduct(null);
  };

  const handleOpenVariants = (productId: string) => {
    setSelectedProductId(productId);
    setVariantsDialogOpen(true);
  };

  const handleAddVariant = async () => {
    if (!selectedProductId || !newVariant.name) return;
    await createVariant.mutateAsync({
      product_id: selectedProductId,
      name: newVariant.name,
      sku: newVariant.sku || null,
      price_modifier: Number(newVariant.price_modifier) || 0,
      stock_quantity: Number(newVariant.stock_quantity) || 0,
      is_active: true,
    });
    setNewVariant({ name: '', sku: '', price_modifier: '0', stock_quantity: '0' });
  };

  const stats = [
    { label: 'Total Products', value: products.length, icon: Package, color: 'text-primary' },
    { label: 'Active', value: activeProducts, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Featured', value: featuredProducts, icon: Star, color: 'text-amber-500' },
    { label: 'Low Stock', value: lowStockProducts, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 admin-page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your product catalog</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="admin-stat-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-muted/50 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Inventory Value Card */}
        <Card className="admin-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Inventory Value</p>
                  <p className="text-xl font-bold">{formatPrice(totalInventoryValue)}</p>
                </div>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="admin-card border-0 overflow-hidden group">
                  {/* Product Image */}
                  <div className="aspect-square bg-muted/50 relative overflow-hidden">
                    {product.images?.[0] ? (
                      <img 
                        src={product.images[0].image_url} 
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    
                    {/* Status Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {product.is_featured && (
                        <Badge className="bg-amber-500/90 text-white border-0 text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {!product.is_active && (
                        <Badge variant="secondary" className="bg-muted/90 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    {/* Stock Badge */}
                    {product.stock_quantity <= (product.low_stock_threshold || 5) && (
                      <Badge 
                        className="absolute top-3 right-3 bg-red-500/90 text-white border-0 text-xs"
                      >
                        Low Stock
                      </Badge>
                    )}

                    {/* Quick Actions Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 rounded-full"
                        onClick={() => handleOpenEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 rounded-full"
                        onClick={() => handleOpenVariants(product.id)}
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-9 w-9 rounded-full"
                        onClick={() => toggleActive(product.id, product.is_active)}
                      >
                        {product.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-9 w-9 rounded-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="admin-card border-0">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{product.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProduct.mutate(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Product Info */}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {product.sku || 'No SKU'} · {product.category?.name || 'Uncategorized'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div>
                        <p className="font-bold text-primary">{formatPrice(Number(product.price))}</p>
                        {product.compare_at_price && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(Number(product.compare_at_price))}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          product.stock_quantity <= (product.low_stock_threshold || 5) 
                            ? 'text-red-500' 
                            : 'text-muted-foreground'
                        }`}>
                          {product.stock_quantity} in stock
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="admin-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
                {searchQuery ? 'Try a different search term' : 'Get started by adding your first product'}
              </p>
              {!searchQuery && (
                <Button onClick={handleOpenCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 admin-card border-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0 sticky top-0 bg-admin-card z-10">
            <DialogTitle className="text-lg font-semibold">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <div className="p-6 pt-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-lg">
                  <TabsTrigger value="basic" className="gap-1.5 text-xs data-[state=active]:bg-background">
                    <Box className="h-3.5 w-3.5" />
                    Basic
                  </TabsTrigger>
                  <TabsTrigger value="images" disabled={!editingProduct} className="gap-1.5 text-xs data-[state=active]:bg-background">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Images
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="gap-1.5 text-xs data-[state=active]:bg-background">
                    <DollarSign className="h-3.5 w-3.5" />
                    Pricing
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="gap-1.5 text-xs data-[state=active]:bg-background">
                    <Package className="h-3.5 w-3.5" />
                    Inventory
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="gap-1.5 text-xs data-[state=active]:bg-background">
                    <Tag className="h-3.5 w-3.5" />
                    SEO
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          name: e.target.value,
                          slug: generateSlug(e.target.value)
                        }))}
                        placeholder="Product name"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Slug</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="product-slug"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Short Description</Label>
                    <Textarea
                      value={formData.short_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                      placeholder="Brief product description"
                      rows={2}
                      className="bg-muted/50 border-0 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Full Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed product description"
                      rows={4}
                      className="bg-muted/50 border-0 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Category</Label>
                      <Select 
                        value={formData.category_id} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}
                      >
                        <SelectTrigger className="bg-muted/50 border-0">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Room Type</Label>
                      <Input
                        value={formData.room_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, room_type: e.target.value }))}
                        placeholder="e.g. Living Room"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Material</Label>
                      <Input
                        value={formData.material}
                        onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                        placeholder="e.g. Wood"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Color</Label>
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="e.g. Brown"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Dimensions</Label>
                      <Input
                        value={formData.dimensions}
                        onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                        placeholder="e.g. 180x90x75 cm"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                  <div className="flex gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label className="text-sm">Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                      />
                      <Label className="text-sm">Featured</Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 pt-4">
                  {editingProduct ? (
                    <ProductImageGallery productId={editingProduct.id} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Save the product first to add images.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Price *</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Compare at Price</Label>
                      <Input
                        type="number"
                        value={formData.compare_at_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: e.target.value }))}
                        placeholder="Original price"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Cost Price</Label>
                      <Input
                        type="number"
                        value={formData.cost_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                        placeholder="Your cost"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">SKU</Label>
                      <Input
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="Stock keeping unit"
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Barcode</Label>
                      <Input
                        value={formData.barcode}
                        onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                        placeholder="UPC, EAN, etc."
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Stock Quantity</Label>
                      <Input
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Low Stock Alert</Label>
                      <Input
                        type="number"
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Meta Title</Label>
                    <Input
                      value={formData.meta_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                      placeholder="SEO title"
                      className="bg-muted/50 border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Meta Description</Label>
                    <Textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                      placeholder="SEO description"
                      rows={3}
                      className="bg-muted/50 border-0 resize-none"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-admin-card sticky bottom-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.price || updateProduct.isPending || createProduct.isPending}
            >
              {updateProduct.isPending || createProduct.isPending ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variants Dialog */}
      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
        <DialogContent className="max-w-2xl admin-card border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Product Variants
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Variant name (e.g. Large, Blue)"
                value={newVariant.name}
                onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 bg-muted/50 border-0"
              />
              <Input
                placeholder="SKU"
                value={newVariant.sku}
                onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                className="w-24 bg-muted/50 border-0"
              />
              <Input
                type="number"
                placeholder="Price +/-"
                value={newVariant.price_modifier}
                onChange={(e) => setNewVariant(prev => ({ ...prev, price_modifier: e.target.value }))}
                className="w-24 bg-muted/50 border-0"
              />
              <Input
                type="number"
                placeholder="Stock"
                value={newVariant.stock_quantity}
                onChange={(e) => setNewVariant(prev => ({ ...prev, stock_quantity: e.target.value }))}
                className="w-20 bg-muted/50 border-0"
              />
              <Button onClick={handleAddVariant} disabled={!newVariant.name || createVariant.isPending} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-2">
                {variants.map((variant) => (
                  <div key={variant.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{variant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {variant.sku || 'No SKU'} · Stock: {variant.stock_quantity}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {Number(variant.price_modifier) >= 0 ? '+' : ''}{formatPrice(Number(variant.price_modifier))}
                    </Badge>
                    <Switch
                      checked={variant.is_active ?? true}
                      onCheckedChange={(checked) => updateVariant.mutate({ 
                        id: variant.id, 
                        product_id: variant.product_id,
                        is_active: checked 
                      })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => deleteVariant.mutate({ id: variant.id, productId: variant.product_id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No variants yet. Add size, color, or other options above.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
