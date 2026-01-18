import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  LineChart,
  Box,
  Target,
  BarChart3,
  History,
  ArrowRight
} from 'lucide-react';
import { getProductById, getProductPriceHistory, getProductAnalytics, getProductInventoryHistory } from '@/database/products';
import { ProductAnalytics, TProduct, TProductPriceHistory, TInventoryAdjustment, InventoryAdjustmentType } from '@/types/database';
import { formatAmount } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const ProductAnalysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<TProduct | null>(null);
  const [priceHistory, setPriceHistory] = useState<TProductPriceHistory[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<TInventoryAdjustment[]>([]);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [productData, priceHistoryData, inventoryHistoryData, analyticsData] = await Promise.all([
          getProductById(id),
          getProductPriceHistory(id),
          getProductInventoryHistory(id),
          getProductAnalytics(id)
        ]);

        setProduct(productData);
        setPriceHistory(priceHistoryData);
        setInventoryHistory(inventoryHistoryData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error loading product data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Scanning Asset Data...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-slate-900">Asset Not Found</p>
          <Button variant="ghost" onClick={() => navigate('/dashboard/stocks')} className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Return to Inventory</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50 pb-12"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/stocks')}
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 h-12 w-12 p-0 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-400 text-[8px] font-black uppercase tracking-[0.2em]">{product.category}</Badge>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ID: {product.id.slice(-8).toUpperCase()}</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{product.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Stock Optimal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Stock Metrics */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Package className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available</p>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">{product.quantity_on_hand}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Inventory Units</p>
            </CardContent>
          </Card>

          {/* Revenue Analytics */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yield</p>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">₦{analytics?.salesData?.totalRevenue.toLocaleString() || "0"}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Internal Revenue</p>
            </CardContent>
          </Card>

          {/* Profit Analytics */}
          <Card className="bg-slate-900 border-slate-800 shadow-xl shadow-slate-200 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net</p>
              </div>
              <h2 className="text-3xl font-black text-white mb-1">₦{analytics?.salesData?.totalProfit.toLocaleString() || "0"}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consolidated Earnings</p>
            </CardContent>
          </Card>

          {/* Margin Analytics */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase">High</span>
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">
                {analytics?.salesData?.totalRevenue ? (analytics.salesData.totalProfit / analytics.salesData.totalRevenue * 100).toFixed(1) : "0"}%
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Coefficient</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: History */}
          <div className="lg:col-span-8 space-y-8">
            <Tabs defaultValue="inventory" className="w-full">
              <TabsList className="bg-white border border-slate-200 h-14 p-1 rounded-2xl mb-6 shadow-sm">
                <TabsTrigger value="inventory" className="rounded-xl h-full px-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <Box className="w-3.5 h-3.5 mr-2" />
                  Inventory Operations
                </TabsTrigger>
                <TabsTrigger value="price" className="rounded-xl h-full px-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  <History className="w-3.5 h-3.5 mr-2" />
                  Valuation History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inventory" className="mt-0">
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Logistics Audit Trail</CardTitle>
                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical stock adjustments and movements</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y divide-slate-100">
                        {inventoryHistory.length > 0 ? inventoryHistory.map((adj, i) => (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={adj.id}
                            className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${adj.adjustment_type === InventoryAdjustmentType.INCREASE ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {adj.adjustment_type === InventoryAdjustmentType.INCREASE ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{adj.reason}</p>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(adj.created_at), 'PPP')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-black ${adj.adjustment_type === InventoryAdjustmentType.INCREASE ? 'text-emerald-600' : 'text-red-600'}`}>
                                {adj.adjustment_type === InventoryAdjustmentType.INCREASE ? '+' : '-'}{adj.quantity}
                              </p>
                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Internal Units</span>
                            </div>
                          </motion.div>
                        )) : (
                          <div className="p-12 text-center">
                            <Box className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">No adjustment logs available</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="price" className="mt-0">
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Marketplace Dynamics</CardTitle>
                    <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price evolution and margin adjustments</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y divide-slate-100">
                        {priceHistory.length > 0 ? priceHistory.map((hist, i) => (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={hist.id}
                            className="p-8 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase tracking-widest mb-2">{hist.change_reason}</Badge>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(hist.created_at), 'PPP')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Auth Profile</p>
                                <p className="text-xs font-bold text-slate-700">{hist.changed_by_name || "System Core"}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Acquisition Shift</p>
                                <div className="flex items-center gap-4">
                                  <span className="text-xs font-bold text-slate-400 line-through">₦{hist.old_cost_price.toLocaleString()}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                  <span className="text-sm font-black text-slate-900">₦{hist.new_cost_price.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Commercial Shift</p>
                                <div className="flex items-center gap-4">
                                  <span className="text-xs font-bold text-slate-400 line-through">₦{hist.old_selling_price.toLocaleString()}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                  <span className="text-sm font-black text-slate-900">₦{hist.new_selling_price.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )) : (
                          <div className="p-12 text-center">
                            <LineChart className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">No valuation logs available</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel: Performance & Details */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Supply Metrics</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Units Sold</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{analytics?.salesData?.totalSales || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <LineChart className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invoices</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{analytics?.salesData?.totalTransactions || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Valuation</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">₦{analytics?.salesData?.stockValue.toLocaleString() || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 shadow-sm overflow-hidden p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white mx-auto mb-6">
                <Target className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-2">Internal Efficiency</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">This asset operates at {analytics?.salesData?.totalRevenue ? (analytics.salesData.totalProfit / analytics.salesData.totalRevenue * 100).toFixed(1) : "0"}% margin efficiency.</p>
              <div className="mt-8 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics?.salesData?.totalRevenue ? (analytics.salesData.totalProfit / analytics.salesData.totalRevenue * 100).toFixed(1) : "0"}%` }}></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export default ProductAnalysis;