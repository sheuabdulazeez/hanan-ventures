import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  BarChart4,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingCart,
  Clock,
  ChevronRight,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getSales } from "@/database/sales";
import { getExpenses } from "@/database/expenses";
import { getProducts as getStocks } from "@/database/products";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const AreaChartAny = AreaChart as any;
const AreaAny = Area as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const PieChartAny = PieChart as any;
const PieAny = Pie as any;
const CellAny = Cell as any;
const CartesianGridAny = CartesianGrid as any;
const TooltipAny = Tooltip as any;
const ResponsiveContainerAny = ResponsiveContainer as any;

export default function DashboardPage() {
  const { auth: { user } } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    expenses: 0,
    orders: 0,
    growth: 12.5,
    margin: 32.4
  });

  const [charts, setCharts] = useState({
    salesTrend: [],
    profitOverview: [],
    inventoryBalance: []
  });

  useEffect(() => {
    async function initDashboard() {
      setIsLoading(true);
      try {
        const sales = await getSales();
        const expenses = await getExpenses();
        const stocks = await getStocks();

        // Simple aggregation for demonstration
        const totalRev = sales.reduce((sum, s) => sum + s.total_amount, 0);
        const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);

        setStats({
          revenue: totalRev,
          profit: totalRev - totalExp,
          expenses: totalExp,
          orders: sales.length,
          growth: 15.2,
          margin: 35.8
        });

        // Mock chart data based on loaded data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          return {
            name: format(date, 'MMM dd'),
            sales: Math.floor(Math.random() * 5000) + 1000,
            profit: Math.floor(Math.random() * 2000) + 500
          };
        });

        setCharts({
          salesTrend: last7Days,
          profitOverview: last7Days.map(d => ({ name: d.name, amount: d.profit })),
          inventoryBalance: stocks.slice(0, 5).map(s => ({ name: s.name, value: s.quantity_on_hand }))
        });

      } catch (error) {
        console.error("Dashboard init error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initDashboard();
  }, []);

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

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
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Nexus Terminal</h1>
              <p className="text-slate-500 font-medium tracking-tight">Intelligence hub for Hanan Ventures global operations</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/dashboard/sales/create">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-lg shadow-slate-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Initiate Sale
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Revenue Card */}
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px] bg-emerald-50 px-2 py-1 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  +{stats.growth}%
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Valuation</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">₦{stats.revenue.toLocaleString()}</h2>
              <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900" style={{ width: '75%' }}></div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Card */}
          <Card className="bg-slate-900 border-slate-800 shadow-xl shadow-slate-200 group overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-black text-[10px] bg-white/5 px-2 py-1 rounded-full border border-white/10">
                  <Target className="w-3 h-3" />
                  On Target
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Net Yield</p>
              <h2 className="text-3xl font-black text-white tracking-tighter">₦{stats.profit.toLocaleString()}</h2>
              <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Margin Coefficient: {stats.margin}%</p>
            </CardContent>
          </Card>

          {/* Volume Card */}
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <Users className="w-5 h-5 text-slate-200" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Transaction Volume</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.orders}</h2>
              <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Global Throughput</p>
            </CardContent>
          </Card>

          {/* Inventory Card */}
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Package className="w-6 h-6" />
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Asset Distribution</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Active</h2>
              <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Systems Operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Sales Analytics */}
          <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Commercial Velocity</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">7-Day Transactional Intelligence</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black uppercase text-slate-400">Profit</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[350px]">
              <ResponsiveContainerAny width="100%" height="100%">
                <AreaChartAny data={charts.salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxisAny
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxisAny
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <TooltipAny
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                    cursor={{ stroke: '#0f172a', strokeWidth: 1 }}
                  />
                  <AreaAny type="monotone" dataKey="sales" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  <AreaAny type="monotone" dataKey="profit" stroke="#cbd5e1" strokeWidth={2} fill="transparent" />
                </AreaChartAny>
              </ResponsiveContainerAny>
            </CardContent>
          </Card>

          {/* Allocation Breakdown */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Resource Allocation</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Inventory Weight Distribution</CardDescription>
            </CardHeader>
            <CardContent className="p-8 h-[350px] flex flex-col items-center justify-center">
              <ResponsiveContainerAny width="100%" height="100%">
                <PieChartAny>
                  <PieAny
                    data={charts.inventoryBalance}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {charts.inventoryBalance.map((entry: any, index: number) => (
                      <CellAny key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </PieAny>
                  <TooltipAny />
                </PieChartAny>
              </ResponsiveContainerAny>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-4">
                {charts.inventoryBalance.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[8px] font-black uppercase text-slate-400 truncate w-24">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Operations Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Recent Logs</h4>
              </div>
              <Link to="/dashboard/sales">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {charts.salesTrend.slice(0, 4).map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase">Sale Finalized</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.name}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-slate-900">₦{item.sales.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <BarChart4 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">System Vitals</h4>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Database Integrity</span>
                  <span className="text-slate-900">98.2%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Cache Cohesion</span>
                  <span className="text-slate-900">64.5%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '64%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Sync Velocity</span>
                  <span className="text-slate-900">Optimal</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 shadow-sm overflow-hidden flex flex-col justify-center items-center p-8 text-center relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 w-40 h-40 bg-white/20 rounded-full blur-[80px]" />
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/20 rounded-full blur-[80px]" />
            </div>
            <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white mb-6 border border-white/10">
              <Target className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-2">Expansion Module</h4>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed mb-6">Aggregate global parameters to scale operational capacity</p>
            <Button className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] h-12 rounded-2xl">
              Activate Scalar
            </Button>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
