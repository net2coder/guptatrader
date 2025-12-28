import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  useCoupons, 
  useCreateCoupon, 
  useUpdateCoupon,
  useDeleteCoupon,
} from '@/hooks/useAdmin';
import { 
  Plus, 
  Search,
  Ticket,
  Edit,
  Trash2,
  Copy,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminCoupons() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const { toast } = useToast();

  const { data: coupons = [], isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    minimum_order_amount: 0,
    maximum_discount: 0,
    usage_limit: 0,
    starts_at: '',
    expires_at: '',
    is_active: true,
    is_announcement: false,
  });

  const filteredCoupons = coupons.filter(
    c => c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      minimum_order_amount: 0,
      maximum_discount: 0,
      usage_limit: 0,
      starts_at: '',
      expires_at: '',
      is_active: true,
      is_announcement: false,
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_order_amount: coupon.minimum_order_amount || 0,
      maximum_discount: coupon.maximum_discount || 0,
      usage_limit: coupon.usage_limit || 0,
      starts_at: coupon.starts_at ? coupon.starts_at.split('T')[0] : '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: coupon.is_active,
      is_announcement: coupon.is_announcement || false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const couponData = {
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      minimum_order_amount: formData.minimum_order_amount || null,
      maximum_discount: formData.maximum_discount || null,
      usage_limit: formData.usage_limit || null,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      is_active: formData.is_active,
      is_announcement: formData.is_announcement,
    };

    if (editingCoupon) {
      await updateCoupon.mutateAsync({ id: editingCoupon.id, ...couponData });
    } else {
      await createCoupon.mutateAsync(couponData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied to clipboard' });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Coupons</h1>
            <p className="text-muted-foreground">Manage discount codes and offers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, discount_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Summer sale - 20% off on all products"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      placeholder={formData.discount_type === 'percentage' ? '20' : '500'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Discount (₹)</Label>
                    <Input
                      type="number"
                      value={formData.maximum_discount}
                      onChange={(e) => setFormData({ ...formData, maximum_discount: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Order Amount (₹)</Label>
                    <Input
                      type="number"
                      value={formData.minimum_order_amount}
                      onChange={(e) => setFormData({ ...formData, minimum_order_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usage Limit</Label>
                    <Input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: Number(e.target.value) })}
                      placeholder="0 = unlimited"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Starts At</Label>
                    <Input
                      type="date"
                      value={formData.starts_at}
                      onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires At</Label>
                    <Input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show as Announcement</Label>
                    <p className="text-xs text-muted-foreground">Display this coupon in the promo banner on the homepage</p>
                  </div>
                  <Switch
                    checked={formData.is_announcement}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_announcement: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.code || !formData.discount_value || createCoupon.isPending || updateCoupon.isPending}
                >
                  {createCoupon.isPending || updateCoupon.isPending ? 'Saving...' : 'Save Coupon'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                All Coupons ({coupons.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search coupons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredCoupons.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Min Order</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{coupon.code}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(coupon.code)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}%`
                            : `₹${coupon.discount_value}`
                          }
                          {coupon.maximum_discount && (
                            <span className="text-xs text-muted-foreground block">
                              Max ₹{coupon.maximum_discount}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {coupon.minimum_order_amount ? `₹${coupon.minimum_order_amount}` : '-'}
                        </TableCell>
                        <TableCell>
                          {coupon.used_count} / {coupon.usage_limit || '∞'}
                        </TableCell>
                        <TableCell>
                          {coupon.expires_at ? (
                            <span className={isExpired(coupon.expires_at) ? 'text-destructive' : ''}>
                              {format(new Date(coupon.expires_at), 'PP')}
                            </span>
                          ) : (
                            'No expiry'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isExpired(coupon.expires_at) ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                              {coupon.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => deleteCoupon.mutate(coupon.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No coupons found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try a different search' : 'Create your first discount code'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
