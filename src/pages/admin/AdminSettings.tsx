import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  useShippingZones, 
  useCreateShippingZone, 
  useUpdateShippingZone,
  useDeleteShippingZone,
  useActivityLogs,
} from '@/hooks/useAdmin';
import { useStoreSettings, useBulkUpdateStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Truck, 
  Shield, 
  History,
  Plus,
  Edit,
  Trash2,
  Save,
  Store,
  Clock,
  Bell,
  AlertCircle,
  Upload,
  Image
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
import { format } from 'date-fns';

export default function AdminSettings() {
  const { toast } = useToast();
  const { data: shippingZones = [], isLoading: zonesLoading } = useShippingZones();
  const { data: activityLogs = [], isLoading: logsLoading } = useActivityLogs();
  const { data: storeSettings, isLoading: settingsLoading } = useStoreSettings();
  
  const createZone = useCreateShippingZone();
  const updateZone = useUpdateShippingZone();
  const deleteZone = useDeleteShippingZone();
  const updateSettings = useBulkUpdateStoreSettings();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    regions: '',
    base_rate: 0,
    per_kg_rate: 0,
    free_shipping_threshold: 0,
    estimated_days_min: 3,
    estimated_days_max: 7,
    is_active: true,
  });

  // Local form state for store settings
  const [localSettings, setLocalSettings] = useState({
    store_name: '',
    store_email: '',
    store_phone: '',
    store_address: '',
    gst_number: '',
    tax_rate: '18',
    auto_cancel_days: '7',
    enable_order_notifications: 'true',
    enable_low_stock_alerts: 'true',
    low_stock_threshold: '5',
    site_logo_url: '',
  });

  // Sync local settings with fetched data
  useEffect(() => {
    if (storeSettings) {
      setLocalSettings({
        store_name: storeSettings.store_name || '',
        store_email: storeSettings.store_email || '',
        store_phone: storeSettings.store_phone || '',
        store_address: storeSettings.store_address || '',
        gst_number: storeSettings.gst_number || '',
        tax_rate: storeSettings.tax_rate || '18',
        auto_cancel_days: storeSettings.auto_cancel_days || '7',
        enable_order_notifications: storeSettings.enable_order_notifications || 'true',
        enable_low_stock_alerts: storeSettings.enable_low_stock_alerts || 'true',
        low_stock_threshold: storeSettings.low_stock_threshold || '5',
        site_logo_url: storeSettings.site_logo_url || '',
      });
    }
  }, [storeSettings]);

  const resetZoneForm = () => {
    setZoneForm({
      name: '',
      regions: '',
      base_rate: 0,
      per_kg_rate: 0,
      free_shipping_threshold: 0,
      estimated_days_min: 3,
      estimated_days_max: 7,
      is_active: true,
    });
    setEditingZone(null);
  };

  const handleEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      regions: zone.regions.join(', '),
      base_rate: zone.base_rate,
      per_kg_rate: zone.per_kg_rate || 0,
      free_shipping_threshold: zone.free_shipping_threshold || 0,
      estimated_days_min: zone.estimated_days_min,
      estimated_days_max: zone.estimated_days_max,
      is_active: zone.is_active,
    });
    setIsZoneDialogOpen(true);
  };

  const handleSaveZone = async () => {
    const zoneData = {
      name: zoneForm.name,
      regions: zoneForm.regions.split(',').map(r => r.trim()).filter(Boolean),
      base_rate: zoneForm.base_rate,
      per_kg_rate: zoneForm.per_kg_rate || null,
      free_shipping_threshold: zoneForm.free_shipping_threshold || null,
      estimated_days_min: zoneForm.estimated_days_min,
      estimated_days_max: zoneForm.estimated_days_max,
      is_active: zoneForm.is_active,
    };

    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone.id, ...zoneData });
    } else {
      await createZone.mutateAsync(zoneData);
    }
    setIsZoneDialogOpen(false);
    resetZoneForm();
  };

  const handleSaveStoreSettings = async () => {
    await updateSettings.mutateAsync(localSettings);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(fileName);

      setLocalSettings(prev => ({ ...prev, site_logo_url: publicUrl }));
      toast({ title: 'Logo uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error uploading logo', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (settingsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your store settings</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general" className="gap-2">
              <Store className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Clock className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="shipping" className="gap-2">
              <Truck className="h-4 w-4" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                  <CardDescription>Basic store details and configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input
                        id="storeName"
                        value={localSettings.store_name}
                        onChange={(e) => setLocalSettings({ ...localSettings, store_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storeEmail">Store Email</Label>
                      <Input
                        id="storeEmail"
                        type="email"
                        value={localSettings.store_email}
                        onChange={(e) => setLocalSettings({ ...localSettings, store_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storePhone">Store Phone</Label>
                      <Input
                        id="storePhone"
                        value={localSettings.store_phone}
                        onChange={(e) => setLocalSettings({ ...localSettings, store_phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstNumber">GST Number</Label>
                      <Input
                        id="gstNumber"
                        value={localSettings.gst_number}
                        onChange={(e) => setLocalSettings({ ...localSettings, gst_number: e.target.value })}
                        placeholder="GSTIN: 06XXXXX1234X1ZX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        value={localSettings.tax_rate}
                        onChange={(e) => setLocalSettings({ ...localSettings, tax_rate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeAddress">Store Address</Label>
                    <Textarea
                      id="storeAddress"
                      value={localSettings.store_address}
                      onChange={(e) => setLocalSettings({ ...localSettings, store_address: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Site Logo</CardTitle>
                  <CardDescription>Upload your store logo (displayed in header and invoices)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {localSettings.site_logo_url ? (
                      <div className="h-16 w-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        <img 
                          src={localSettings.site_logo_url} 
                          alt="Store Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-32 bg-muted rounded-lg flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: PNG or SVG, max 2MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveStoreSettings} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          {/* Order Settings */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Configure order handling and automation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Payment Method</h4>
                      <p className="text-sm text-muted-foreground">Manual confirmation (no online payment)</p>
                    </div>
                    <Badge>Manual</Badge>
                  </div>

                  <div className="p-4 border rounded-lg space-y-4">
                    <div>
                      <h4 className="font-medium">Auto-Cancel Pending Orders</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically cancel orders that remain pending for too long
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Label htmlFor="autoCancelDays">Cancel after (days)</Label>
                      <Input
                        id="autoCancelDays"
                        type="number"
                        value={localSettings.auto_cancel_days}
                        onChange={(e) => setLocalSettings({ ...localSettings, auto_cancel_days: e.target.value })}
                        className="w-24"
                        min={1}
                        max={30}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Orders pending for more than {localSettings.auto_cancel_days} days will be auto-cancelled
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Order Status Flow</h4>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">Pending</Badge>
                      <span>→</span>
                      <Badge variant="outline">Confirmed</Badge>
                      <span>→</span>
                      <Badge variant="outline">Processing</Badge>
                      <span>→</span>
                      <Badge variant="outline">Shipped</Badge>
                      <span>→</span>
                      <Badge variant="outline">Delivered</Badge>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveStoreSettings} disabled={updateSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipping Settings */}
          <TabsContent value="shipping">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shipping Zones</CardTitle>
                  <CardDescription>Configure delivery regions and rates</CardDescription>
                </div>
                <Dialog open={isZoneDialogOpen} onOpenChange={(open) => {
                  setIsZoneDialogOpen(open);
                  if (!open) resetZoneForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Zone
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingZone ? 'Edit Shipping Zone' : 'Add Shipping Zone'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Zone Name</Label>
                        <Input
                          value={zoneForm.name}
                          onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                          placeholder="e.g. North India"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Regions (comma separated)</Label>
                        <Input
                          value={zoneForm.regions}
                          onChange={(e) => setZoneForm({ ...zoneForm, regions: e.target.value })}
                          placeholder="Delhi, Punjab, Haryana"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Base Rate (₹)</Label>
                          <Input
                            type="number"
                            value={zoneForm.base_rate}
                            onChange={(e) => setZoneForm({ ...zoneForm, base_rate: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Per KG Rate (₹)</Label>
                          <Input
                            type="number"
                            value={zoneForm.per_kg_rate}
                            onChange={(e) => setZoneForm({ ...zoneForm, per_kg_rate: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Free Shipping Threshold (₹)</Label>
                        <Input
                          type="number"
                          value={zoneForm.free_shipping_threshold}
                          onChange={(e) => setZoneForm({ ...zoneForm, free_shipping_threshold: Number(e.target.value) })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Min Delivery Days</Label>
                          <Input
                            type="number"
                            value={zoneForm.estimated_days_min}
                            onChange={(e) => setZoneForm({ ...zoneForm, estimated_days_min: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Delivery Days</Label>
                          <Input
                            type="number"
                            value={zoneForm.estimated_days_max}
                            onChange={(e) => setZoneForm({ ...zoneForm, estimated_days_max: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Active</Label>
                        <Switch
                          checked={zoneForm.is_active}
                          onCheckedChange={(checked) => setZoneForm({ ...zoneForm, is_active: checked })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveZone} disabled={createZone.isPending || updateZone.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {createZone.isPending || updateZone.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {zonesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : shippingZones.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zone</TableHead>
                        <TableHead>Regions</TableHead>
                        <TableHead>Base Rate</TableHead>
                        <TableHead>Free Above</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippingZones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">{zone.name}</TableCell>
                          <TableCell className="max-w-xs truncate">{zone.regions.join(', ')}</TableCell>
                          <TableCell>₹{zone.base_rate}</TableCell>
                          <TableCell>{zone.free_shipping_threshold ? `₹${zone.free_shipping_threshold}` : '-'}</TableCell>
                          <TableCell>{zone.estimated_days_min}-{zone.estimated_days_max} days</TableCell>
                          <TableCell>
                            <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                              {zone.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditZone(zone)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => deleteZone.mutate(zone.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No shipping zones</h3>
                    <p className="text-muted-foreground mb-4">Add shipping zones to enable delivery</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">New Order Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when new orders are placed
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.enable_order_notifications === 'true'}
                      onCheckedChange={(checked) => setLocalSettings({ 
                        ...localSettings, 
                        enable_order_notifications: checked ? 'true' : 'false' 
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Low Stock Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when products are running low
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.enable_low_stock_alerts === 'true'}
                      onCheckedChange={(checked) => setLocalSettings({ 
                        ...localSettings, 
                        enable_low_stock_alerts: checked ? 'true' : 'false' 
                      })}
                    />
                  </div>

                  {localSettings.enable_low_stock_alerts === 'true' && (
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center gap-4">
                        <Label htmlFor="lowStockThreshold">Low stock threshold</Label>
                        <Input
                          id="lowStockThreshold"
                          type="number"
                          value={localSettings.low_stock_threshold}
                          onChange={(e) => setLocalSettings({ ...localSettings, low_stock_threshold: e.target.value })}
                          className="w-24"
                          min={1}
                        />
                        <span className="text-sm text-muted-foreground">units</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveStoreSettings} disabled={updateSettings.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Admin Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Only users with the admin role can access this panel. Admin roles are managed through the database.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Row Level Security</h4>
                  <p className="text-sm text-muted-foreground">
                    All database tables have RLS enabled to ensure data security.
                  </p>
                  <Badge variant="secondary" className="mt-2">Enabled</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent admin activities</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : activityLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.action}</TableCell>
                          <TableCell>{log.entity_type}{log.entity_id ? ` (${log.entity_id.slice(0, 8)}...)` : ''}</TableCell>
                          <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No activity logs</h3>
                    <p className="text-muted-foreground">Admin activities will be logged here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
