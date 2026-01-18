import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Calendar,
  BarChart4,
  ArrowRight,
  PieChart,
  Target,
  FileText,
  Package
} from 'lucide-react';
import {
  ProfitData,
  ProfitByPeriod,
  ProductProfitability,
  getTodayProfit,
  getYesterdayProfit,
  getWeekProfit,
  getMonthProfit,
  getProfitByDateRange,
  getDailyProfitBreakdown,
  getProductProfitability
} from '@/database/profit';
import { useToast } from '@/hooks/use-toast';
import { PrintProfitReportButton } from '@/components/PrintProfitReportButton';
import { getAdminSettings } from '@/database/settings';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const ProfitPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [dailyBreakdown, setDailyBreakdown] = useState<ProfitByPeriod[]>([]);
  const [productProfitability, setProductProfitability] = useState<ProductProfitability[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { toast } = useToast();

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      let data: ProfitData;
      let startDate: string;
      let endDate: string;

      switch (selectedPeriod) {
        case 'today':
          data = await getTodayProfit();
          startDate = endDate = new Date().toISOString().split('T')[0];
          break;
        case 'yesterday':
          data = await getYesterdayProfit();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = endDate = yesterday.toISOString().split('T')[0];
          break;
        case 'week':
          data = await getWeekProfit();
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startDate = startOfWeek.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          break;
        case 'month':
          data = await getMonthProfit();
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startDate = startOfMonth.toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            toast({
              title: "Error",
              description: "Please select both start and end dates for custom period.",
              variant: "destructive"
            });
            return;
          }
          data = await getProfitByDateRange(customStartDate, customEndDate);
          startDate = customStartDate;
          endDate = customEndDate;
          break;
        default:
          return;
      }

      setProfitData(data);
      const breakdown = await getDailyProfitBreakdown(startDate, endDate);
      const productData = await getProductProfitability(startDate, endDate);
      setDailyBreakdown(breakdown);
      setProductProfitability(productData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profit data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await getAdminSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
    if (selectedPeriod !== 'custom') {
      fetchProfitData();
    } else {
      setProfitData(null);
      setDailyBreakdown([]);
      setProductProfitability([]);
    }
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'custom': return `${customStartDate} to ${customEndDate}`;
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Profit Analysis</h1>
              <p className="text-slate-500 font-medium tracking-tight">Financial performance overview for {getPeriodLabel()}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <Select value={selectedPeriod} onValueChange={(value: PeriodType) => setSelectedPeriod(value)}>
                  <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200 text-xs font-black uppercase tracking-widest">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="today" className="text-[10px] font-black uppercase tracking-widest">Today</SelectItem>
                    <SelectItem value="yesterday" className="text-[10px] font-black uppercase tracking-widest">Yesterday</SelectItem>
                    <SelectItem value="week" className="text-[10px] font-black uppercase tracking-widest">This Week</SelectItem>
                    <SelectItem value="month" className="text-[10px] font-black uppercase tracking-widest">This Month</SelectItem>
                    <SelectItem value="custom" className="text-[10px] font-black uppercase tracking-widest">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="h-11 bg-white border-slate-200 text-xs font-bold" />
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="h-11 bg-white border-slate-200 text-xs font-bold" />
                  <Button onClick={fetchProfitData} className="bg-slate-900 text-white h-11 px-6 font-black uppercase tracking-widest text-[10px]">Generate</Button>
                </div>
              )}

              <PrintProfitReportButton
                profitData={profitData}
                dailyBreakdown={dailyBreakdown}
                productProfitability={productProfitability}
                periodLabel={getPeriodLabel()}
                settings={settings}
                disabled={!profitData || !settings}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {profitData ? (
            <motion.div
              key="report-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Primary Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 mb-4 group-hover:scale-110 transition-transform">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(profitData.totalRevenue)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 group-hover:scale-110 transition-transform">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Cost</p>
                    <p className="text-2xl font-black text-slate-400 mt-1">{formatCurrency(profitData.totalCost)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Gross Profit</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(profitData.grossProfit)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-4 group-hover:scale-110 transition-transform">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Total Expenses</p>
                    <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(profitData.totalExpenses)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Target className="w-5 h-5" />
                      </div>
                      <Badge className="bg-white/10 text-white border-none text-[8px] font-black uppercase">{profitData.profitMargin.toFixed(1)}% Margin</Badge>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Profit</p>
                    <p className={`text-2xl font-black mt-1 ${profitData.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                      {formatCurrency(profitData.netProfit)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Breakdown */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Daily Trajectory</CardTitle>
                      <CardDescription className="text-[10px] font-bold text-slate-400 mt-1">Period performance over time</CardDescription>
                    </div>
                    <BarChart4 className="w-5 h-5 text-slate-300" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6">Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Revenue</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Expenses</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right px-6">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyBreakdown.map((day) => (
                          <TableRow key={day.date} className="group hover:bg-slate-50 border-slate-50 transition-colors">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                <p className="text-xs font-bold text-slate-700">{format(new Date(day.date), 'MMM dd')}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <p className="text-xs font-black text-slate-900">{formatCurrency(day.revenue)}</p>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <p className="text-xs font-bold text-slate-400">{formatCurrency(day.expenses)}</p>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                              <p className={`text-xs font-black ${day.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatCurrency(day.netProfit)}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                        {dailyBreakdown.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No data for this period</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Product Profitability */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Product Efficiency</CardTitle>
                      <CardDescription className="text-[10px] font-bold text-slate-400 mt-1">Highest grossing inventory items</CardDescription>
                    </div>
                    <PieChart className="w-5 h-5 text-slate-300" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6">Item</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Sold</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Margin%</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right px-6">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productProfitability.map((product) => (
                          <TableRow key={product.productName} className="group hover:bg-slate-50 border-slate-50 transition-colors">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                                  <Package className="w-4 h-4" />
                                </div>
                                <p className="text-xs font-black text-slate-900 leading-tight">{product.productName}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Badge className="bg-slate-50 text-slate-900 border-slate-200 text-[10px] font-black px-2">{product.quantitySold}</Badge>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <p className={`text-[10px] font-black ${product.profitMargin >= 30 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {product.profitMargin.toFixed(1)}%
                              </p>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                              <p className="text-xs font-black text-slate-900">{formatCurrency(product.grossProfit)}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                        {productProfitability.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No inventory activity</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-96"
            >
              <div className="text-center group">
                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-200 mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-widest">Awaiting Analysis Parameters</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                  {selectedPeriod === 'custom'
                    ? "Specify a date range above and click generate to build your comprehensive profit analysis report."
                    : "Fetching financial data for your selected period. This usually takes just a moment."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Synchronizing Ledger Data...</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfitPage;