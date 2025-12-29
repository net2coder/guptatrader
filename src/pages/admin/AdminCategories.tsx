import { useState, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search,
  Tag,
  Edit,
  Trash2,
  Upload,
  Image,
  FolderOpen,
  ArrowUpRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  sort_order: string;
}

const defaultFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  is_active: true,
  sort_order: '0',
};

export default function AdminCategories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const filteredCategories = categories.filter(
    c => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCategories = categories.filter(c => c.is_active).length;

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active ?? true,
      sort_order: String(category.sort_order || 0),
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `category-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'Image uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error uploading image', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) return;
    
    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      sort_order: Number(formData.sort_order) || 0,
    };

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...payload });
    } else {
      await createCategory.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    setFormData(defaultFormData);
    setEditingCategory(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Categories</h1>
            <p className="text-muted-foreground mt-1">Organize your product catalog</p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 stagger-fade-in">
          <div className="admin-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold mt-1">{categories.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-admin-stat-1">
                <FolderOpen className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="admin-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold mt-1">{activeCategories}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-green-500">
                <Tag className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="admin-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold mt-1">{categories.length - activeCategories}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-muted-foreground">
                <Tag className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <Card className="admin-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-muted-foreground" />
                All Categories
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filteredCategories.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-fade-in">
                {filteredCategories.map((category) => (
                  <div 
                    key={category.id}
                    className="group bg-background border border-border/50 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    {/* Image */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Image className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">/{category.slug}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          Order: {category.sort_order || 0}
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 gap-1"
                          onClick={() => handleOpenEdit(category)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.name}"? Products in this category will be unassigned.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCategory.mutate(category.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Tag className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">No categories found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try a different search term' : 'Get started by creating your first category'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleOpenCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Living Room"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name,
                      slug: editingCategory ? prev.slug : generateSlug(name),
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  placeholder="living-room"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this category"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category Image</Label>
              <div className="flex items-center gap-4">
                {formData.image_url ? (
                  <div className="h-20 w-20 bg-muted rounded-xl overflow-hidden">
                    <img 
                      src={formData.image_url} 
                      alt="Category" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 bg-muted rounded-xl flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-8">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.slug || createCategory.isPending || updateCategory.isPending}
            >
              {createCategory.isPending || updateCategory.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}