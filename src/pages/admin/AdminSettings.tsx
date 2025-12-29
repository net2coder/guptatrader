import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Image,
  Globe,
  CreditCard,
  Package,
  Lock,
  Activity,
  Check,
  ChevronRight,
  MapPin
} from 'lucide-react';
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
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
  });

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
        facebook_url: storeSettings.facebook_url || '',
        instagram_url: storeSettings.instagram_url || '',
        twitter_url: storeSettings.twitter_url || '',
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

  const orderStatusFlow = [
    { label: 'Pending', color: 'bg-yellow-500' },
    { label: 'Confirmed', color: 'bg-blue-500' },
    { label: 'Processing', color: 'bg-indigo-500' },
    { label: 'Shipped', color: 'bg-purple-500' },
    { label: 'Delivered', color: 'bg-emerald-500' },
  ];

  if (settingsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 admin-page-enter">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your store preferences</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-lg h-auto">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-background text-xs sm:text-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-background text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="shipping" className="gap-2 data-[state=active]:bg-background text-xs sm:text-sm">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Shipping</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-background text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-background text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-background text-xs sm:text-sm">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Store Information */}
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Store Information</CardTitle>
                      <CardDescription className="text-xs">Basic store details and configuration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Store Name</Label>
                      <Input
                        value={localSettings.store_name}
                        onChange={(e) => setLocalSettings({ ...localSettings, store_name: e.target.value })}
                        className="bg-muted/50 border-0"
                        placeholder="Your Store Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Store Email</Label>
                      <Input
                        type="email"
                        value={localSettings.store_email}
                        onChange={(e) => setLocalSettings({ ...localSettings, store_email: e.target.value })}
                        className="bg-muted/50 border-0"
                        placeholder="store@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Store Phone</Label>
                      <Input
                        value={localSettings.store_phone}
                        onChange={(e) => setLocalSettings({ ...localSettings, store_phone: e.target.value })}
                        className="bg-muted/50 border-0"
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">GST Number</Label>
                      <Input
                        value={localSettings.gst_number}
                        onChange={(e) => setLocalSettings({ ...localSettings, gst_number: e.target.value })}
                        className="bg-muted/50 border-0"
                        placeholder="GSTIN: 06XXXXX1234X1ZX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={localSettings.tax_rate}
                        onChange={(e) => setLocalSettings({ ...localSettings, tax_rate: e.target.value })}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Store Address</Label>
                    <Textarea
                      value={localSettings.store_address}
                      onChange={(e) => setLocalSettings({ ...localSettings, store_address: e.target.value })}
                      rows={2}
                      className="bg-muted/50 border-0 resize-none"
                      placeholder="Full store address"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Site Logo */}
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Image className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Site Logo</CardTitle>
                      <CardDescription className="text-xs">Upload your store logo (displayed in header and invoices)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-32 bg-muted/50 rounded-xl flex items-center justify-center overflow-hidden">
                      {localSettings.site_logo_url ? (
                        <img 
                          src={localSettings.site_logo_url} 
                          alt="Store Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
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
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: PNG or SVG, max 2MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Social Media Links</CardTitle>
                      <CardDescription className="text-xs">Add your social media profile URLs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Facebook</Label>
                      <Input
                        placeholder="https://facebook.com/yourpage"
                        value={localSettings.facebook_url}
                        onChange={(e) => setLocalSettings({ ...localSettings, facebook_url: e.target.value })}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Instagram</Label>
                      <Input
                        placeholder="https://instagram.com/yourprofile"
                        value={localSettings.instagram_url}
                        onChange={(e) => setLocalSettings({ ...localSettings, instagram_url: e.target.value })}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Twitter/X</Label>
                      <Input
                        placeholder="https://x.com/yourhandle"
                        value={localSettings.twitter_url}
                        onChange={(e) => setLocalSettings({ ...localSettings, twitter_url: e.target.value })}
                        className="bg-muted/50 border-0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveStoreSettings} disabled={updateSettings.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          </TabsContent>

          {/* Order Settings */}
          <TabsContent value="orders">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Order Management</CardTitle>
                      <CardDescription className="text-xs">Configure order handling and automation</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Method */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Payment Method</h4>
                        <p className="text-xs text-muted-foreground">Manual confirmation (no online payment)</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Manual</Badge>
                  </div>

                  {/* Auto Cancel */}
                  <div className="p-4 rounded-xl bg-muted/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Auto-Cancel Pending Orders</h4>
                        <p className="text-xs text-muted-foreground">
                          Automatically cancel orders that remain pending
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-11">
                      <Label className="text-xs">Cancel after</Label>
                      <Input
                        type="number"
                        value={localSettings.auto_cancel_days}
                        onChange={(e) => setLocalSettings({ ...localSettings, auto_cancel_days: e.target.value })}
                        className="w-20 bg-background border-0"
                        min={1}
                        max={30}
                      />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                  </div>

                  {/* Order Status Flow */}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <h4 className="font-medium text-sm mb-4">Order Status Flow</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {orderStatusFlow.map((status, index) => (
                        <div key={status.label} className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background">
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            <span className="text-xs font-medium">{status.label}</span>
                          </div>
                          {index < orderStatusFlow.length - 1 && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleSaveStoreSettings} disabled={updateSettings.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Shipping Settings */}
          <TabsContent value="shipping">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="admin-card border-0">
                <CardHeader className="pb-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Shipping Zones</CardTitle>
                      <CardDescription className="text-xs">Configure delivery regions and rates</CardDescription>
                    </div>
                  </div>
                  <Dialog open={isZoneDialogOpen} onOpenChange={(open) => {
                    setIsZoneDialogOpen(open);
                    if (!open) resetZoneForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Zone
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="admin-card border-0">
                      <DialogHeader>
                        <DialogTitle>{editingZone ? 'Edit Shipping Zone' : 'Add Shipping Zone'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Zone Name</Label>
                          <Input
                            value={zoneForm.name}
                            onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                            placeholder="e.g. North India"
                            className="bg-muted/50 border-0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Regions (comma separated)</Label>
                          <Input
                            value={zoneForm.regions}
                            onChange={(e) => setZoneForm({ ...zoneForm, regions: e.target.value })}
                            placeholder="Delhi, Punjab, Haryana"
                            className="bg-muted/50 border-0"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Base Rate (₹)</Label>
                            <Input
                              type="number"
                              value={zoneForm.base_rate}
                              onChange={(e) => setZoneForm({ ...zoneForm, base_rate: Number(e.target.value) })}
                              className="bg-muted/50 border-0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Per KG Rate (₹)</Label>
                            <Input
                              type="number"
                              value={zoneForm.per_kg_rate}
                              onChange={(e) => setZoneForm({ ...zoneForm, per_kg_rate: Number(e.target.value) })}
                              className="bg-muted/50 border-0"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Free Shipping Threshold (₹)</Label>
                          <Input
                            type="number"
                            value={zoneForm.free_shipping_threshold}
                            onChange={(e) => setZoneForm({ ...zoneForm, free_shipping_threshold: Number(e.target.value) })}
                            className="bg-muted/50 border-0"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Min Delivery Days</Label>
                            <Input
                              type="number"
                              value={zoneForm.estimated_days_min}
                              onChange={(e) => setZoneForm({ ...zoneForm, estimated_days_min: Number(e.target.value) })}
                              className="bg-muted/50 border-0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Max Delivery Days</Label>
                            <Input
                              type="number"
                              value={zoneForm.estimated_days_max}
                              onChange={(e) => setZoneForm({ ...zoneForm, estimated_days_max: Number(e.target.value) })}
                              className="bg-muted/50 border-0"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Label className="text-sm">Active</Label>
                          <Switch
                            checked={zoneForm.is_active}
                            onCheckedChange={(checked) => setZoneForm({ ...zoneForm, is_active: checked })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsZoneDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveZone} disabled={createZone.isPending || updateZone.isPending} className="gap-2">
                          <Save className="h-4 w-4" />
                          {createZone.isPending || updateZone.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {zonesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : shippingZones.length > 0 ? (
                    <div className="space-y-3">
                      {shippingZones.map((zone, index) => (
                        <motion.div
                          key={zone.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/30 group hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="p-2 rounded-lg bg-background">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{zone.name}</h4>
                                <Badge variant={zone.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {zone.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate max-w-md">
                                {zone.regions.join(', ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-medium">₹{zone.base_rate}</p>
                              <p className="text-xs text-muted-foreground">
                                {zone.estimated_days_min}-{zone.estimated_days_max} days
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditZone(zone)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteZone.mutate(zone.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="p-4 rounded-full bg-muted/50 mb-4">
                        <Truck className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No shipping zones</h3>
                      <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
                        Add shipping zones to enable delivery
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Notification Preferences</CardTitle>
                      <CardDescription className="text-xs">Configure alerts and notifications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Notifications */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">New Order Notifications</h4>
                        <p className="text-xs text-muted-foreground">
                          Get notified when new orders are placed
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localSettings.enable_order_notifications === 'true'}
                      onCheckedChange={(checked) => setLocalSettings({ 
                        ...localSettings, 
                        enable_order_notifications: checked ? 'true' : 'false' 
                      })}
                    />
                  </div>

                  {/* Low Stock Alerts */}
                  <div className="p-4 rounded-xl bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Low Stock Alerts</h4>
                          <p className="text-xs text-muted-foreground">
                            Get notified when products are running low
                          </p>
                        </div>
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
                      <div className="flex items-center gap-4 pl-11">
                        <Label className="text-xs">Alert when stock falls below</Label>
                        <Input
                          type="number"
                          value={localSettings.low_stock_threshold}
                          onChange={(e) => setLocalSettings({ ...localSettings, low_stock_threshold: e.target.value })}
                          className="w-20 bg-background border-0"
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground">units</span>
                      </div>
                    )}
                  </div>

                  <Button onClick={handleSaveStoreSettings} disabled={updateSettings.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Security Settings</CardTitle>
                      <CardDescription className="text-xs">Manage security and access controls</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-background">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h4 className="font-medium text-sm">Admin Access</h4>
                    </div>
                    <p className="text-sm text-muted-foreground pl-11">
                      Only users with the admin role can access this panel. Admin roles are managed through the database.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium text-sm">Row Level Security</h4>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                        <Check className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-11">
                      All database tables have RLS enabled to ensure data security.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="admin-card border-0">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-500">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Activity Logs</CardTitle>
                      <CardDescription className="text-xs">Recent admin activities</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : activityLogs.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {activityLogs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-start gap-4 p-4 rounded-xl bg-muted/30"
                          >
                            <div className="p-2 rounded-lg bg-background shrink-0">
                              <History className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{log.action}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}...` : ''}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(log.created_at), 'MMM d, HH:mm')}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="p-4 rounded-full bg-muted/50 mb-4">
                        <History className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No activity logs</h3>
                      <p className="text-muted-foreground text-sm text-center max-w-sm">
                        Admin activities will be logged here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
