import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useReturns, useUpdateReturn, Return } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { 
  Search,
  RotateCcw,
  Eye,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
  approved: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', icon: CheckCircle },
  rejected: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
  completed: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', icon: Check },
};

export default function AdminReturns() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);

  const { data: returns = [], isLoading } = useReturns();
  const updateReturn = useUpdateReturn();

  const filteredReturns = returns.filter(r => {
    const matchesSearch = r.order?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const approvedCount = returns.filter(r => r.status === 'approved').length;
  const completedCount = returns.filter(r => r.status === 'completed').length;

  const handleApprove = async () => {
    if (!selectedReturn) return;
    await updateReturn.mutateAsync({
      id: selectedReturn.id,
      status: 'approved',
      refund_amount: refundAmount,
      refund_status: 'pending',
    });
    setSelectedReturn(null);
  };

  const handleReject = async (returnId: string) => {
    await updateReturn.mutateAsync({ id: returnId, status: 'rejected' });
  };

  const handleComplete = async (returnId: string) => {
    await updateReturn.mutateAsync({ id: returnId, status: 'completed', refund_status: 'processed' });
  };

  const stats = [
    { label: 'Total Returns', value: returns.length, icon: RotateCcw, color: 'text-admin-stat-1' },
    { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-amber-500' },
    { label: 'Approved', value: approvedCount, icon: CheckCircle, color: 'text-blue-500' },
    { label: 'Completed', value: completedCount, icon: Check, color: 'text-green-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Returns & Refunds</h1>
          <p className="text-muted-foreground mt-1">Handle return requests and process refunds</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-fade-in">
          {stats.map((stat) => (
            <div key={stat.label} className="admin-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-xl bg-muted/50", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="admin-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                Return Requests
                <Badge variant="secondary" className="ml-2">{returns.length}</Badge>
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32 bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search returns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-background" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filteredReturns.length > 0 ? (
              <div className="space-y-3 stagger-fade-in">
                {filteredReturns.map((returnItem) => {
                  const config = statusConfig[returnItem.status] || statusConfig.pending;
                  return (
                    <div key={returnItem.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-200", config.bg, "border-border/50")}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", config.bg)}>
                          <config.icon className={cn("h-5 w-5", config.text)} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold">{returnItem.order?.order_number || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{returnItem.reason}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(returnItem.created_at), 'PP')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">₹{returnItem.order?.total_amount?.toLocaleString() || '-'}</p>
                          {returnItem.refund_amount && <p className="text-sm text-green-600">Refund: ₹{returnItem.refund_amount.toLocaleString()}</p>}
                        </div>
                        <Badge className={cn(config.bg, config.text, "capitalize")}>{returnItem.status}</Badge>
                        <div className="flex gap-1">
                          {returnItem.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedReturn(returnItem); setRefundAmount(returnItem.order?.total_amount || 0); }}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleReject(returnItem.id)}><X className="h-4 w-4" /></Button>
                            </>
                          )}
                          {returnItem.status === 'approved' && returnItem.refund_status === 'pending' && (
                            <Button variant="ghost" size="icon" className="text-green-600" onClick={() => handleComplete(returnItem.id)}><Check className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4"><RotateCcw className="h-8 w-8 text-muted-foreground/50" /></div>
                <h3 className="text-lg font-medium mb-2">No return requests</h3>
                <p className="text-muted-foreground">{searchQuery || statusFilter !== 'all' ? 'Try different filters' : 'Return requests will appear here'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Approve Return Request</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><p className="text-sm text-muted-foreground">Order</p><p className="font-medium">{selectedReturn?.order?.order_number}</p></div>
              <div><p className="text-sm text-muted-foreground">Reason</p><p>{selectedReturn?.reason}</p></div>
              <div className="space-y-2">
                <Label>Refund Amount (₹)</Label>
                <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Order total: ₹{selectedReturn?.order?.total_amount?.toLocaleString()}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReturn(null)}>Cancel</Button>
              <Button onClick={handleApprove} disabled={updateReturn.isPending}>{updateReturn.isPending ? 'Approving...' : 'Approve & Process Refund'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}