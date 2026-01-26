import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  BarChart4,
  Users,
  Package,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  ChevronRight,
  Plus,
  AlertCircle,
  Activity,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { getDashboardMetrics, getDailySales, getMonthlySalesByCashier, getAllTimeSalesByCashier, getTopCustomers, getRecentSales } from "@/database/dashboard";
import { getDebtors } from "@/database/debtors";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Local casting for Recharts to avoid TS errors
const AreaChartAny = AreaChart as any;
const AreaAny = Area as any;
const BarChartAny = BarChart as any;
const BarAny = Bar as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const PieChartAny = PieChart as any;
const PieAny = Pie as any;
const CellAny = Cell as any;
const CartesianGridAny = CartesianGrid as any;
const TooltipAny = Tooltip as any;
const ResponsiveContainerAny = ResponsiveContainer as any;
const LegendAny = Legend as any;

export default function DashboardPage() {
  const { auth: { user } } = useAppStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isManager = user?.role === 'manager';
  const hasFinancialAccess = isAdmin || isManager;

  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [cashierSales, setCashierSales] = useState<any[]>([]);
  const [allTimeCashierSales, setAllTimeCashierSales] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [m, ds, cs, atcs, tc, rs, d] = await Promise.all([
          getDashboardMetrics(),
          getDailySales(),
          getMonthlySalesByCashier(),
          getAllTimeSalesByCashier(),
          getTopCustomers(5),
          getRecentSales(5),
          getDebtors()
        ]);
        setMetrics(m);
        setDailySales(ds);
        setCashierSales(cs);
        setAllTimeCashierSales(atcs);
        setTopCustomers(tc);
        setRecentSales(rs);
        setDebtors(d.slice(0, 5));
      } catch (error) {
        console.error("Dashboard data load error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 rounded-full border-4 border-slate-900 border-t-transparent animate-spin"
        />
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
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tight">Dashboard</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Unified POS Systems Management Terminal</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/dashboard/sales/create">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-slate-200">
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
          {/* Revenue Card (restricted) */}
          <Card className={`bg-white border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden rounded-3xl ${!hasFinancialAccess ? 'opacity-50 grayscale' : ''}`}>
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                  <DollarSign className="w-6 h-6" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest">Live</Badge>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Revenue</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                {hasFinancialAccess ? `₦${(metrics?.totalSales || 0).toLocaleString()}` : '•••••'}
              </h2>
            </CardContent>
          </Card>

          {/* Customers Card */}
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden rounded-3xl">
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Customers</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{metrics?.totalCustomers || 0}</h2>
            </CardContent>
          </Card>

          {/* Orders Card (restricted) */}
          <Card className={`bg-slate-900 border-slate-800 shadow-xl shadow-slate-200 group overflow-hidden rounded-3xl ${!hasFinancialAccess ? 'opacity-70' : ''}`}>
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sales</p>
              <h2 className="text-3xl font-black text-white tracking-tighter">
                {hasFinancialAccess ? `${metrics?.totalSales && metrics?.averageOrderValue ? Math.round(metrics.totalSales / metrics.averageOrderValue) : 0} Orders` : '•••••'}
              </h2>
            </CardContent>
          </Card>

          {/* Debt Card (restricted) */}
          <Card className={`bg-white border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden rounded-3xl`}>
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Outstanding Debts</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                {`₦${(metrics?.totalDebt || 0).toLocaleString()}`}
              </h2>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Advanced Analytics (Restricted Section) */}
        {hasFinancialAccess && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Main Sales Analytics */}
            <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
              <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Growth Charts</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Daily Transactional Intelligence</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-8 h-[350px]">
                <Tabs defaultValue="bar" className="w-full h-full flex flex-col">
                  <TabsList className="bg-slate-100 rounded-xl h-9 p-1 w-fit mb-4">
                    <TabsTrigger value="bar" className="rounded-lg h-7 text-[9px] font-black uppercase px-3">Bar Analysis</TabsTrigger>
                    <TabsTrigger value="area" className="rounded-lg h-7 text-[9px] font-black uppercase px-3">Flow State</TabsTrigger>
                  </TabsList>
                  <div className="flex-1 min-h-0">
                    <TabsContent value="bar" className="mt-0 h-full">
                      <ResponsiveContainerAny>
                        <BarChartAny data={dailySales}>
                          <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxisAny
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                            formatter={(date: string) => format(new Date(date), 'dd')}
                          />
                          <YAxisAny axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                          <TooltipAny
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '10px', fontWeight: '900' }}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <BarAny dataKey="amount" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={24} />
                        </BarChartAny>
                      </ResponsiveContainerAny>
                    </TabsContent>
                    <TabsContent value="area" className="mt-0 h-full">
                      <ResponsiveContainerAny>
                        <AreaChartAny data={dailySales}>
                          <defs>
                            <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxisAny
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                            formatter={(date: string) => format(new Date(date), 'dd')}
                          />
                          <YAxisAny axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                          <TooltipAny
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '10px', fontWeight: '900' }}
                          />
                          <AreaAny type="monotone" dataKey="amount" stroke="#0f172a" strokeWidth={4} fillOpacity={1} fill="url(#colorFlow)" />
                        </AreaChartAny>
                      </ResponsiveContainerAny>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>

            {/* Cashier Statistics */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
              <CardHeader className="p-8 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Personnel Yield</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Team Performance Analytics</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 h-[350px] flex flex-col">
                <Tabs defaultValue="monthly" className="w-full flex-1 flex flex-col">
                  <TabsList className="bg-slate-100 rounded-xl h-8 p-1 w-full mb-6">
                    <TabsTrigger value="monthly" className="flex-1 rounded-lg h-6 text-[8px] font-black uppercase">Monthly</TabsTrigger>
                    <TabsTrigger value="alltime" className="flex-1 rounded-lg h-6 text-[8px] font-black uppercase">All Time</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 flex flex-col">
                    <TabsContent value="monthly" className="mt-0 flex-1 flex flex-col">
                      <div className="flex-1 min-h-0 flex items-center justify-center">
                        <ResponsiveContainerAny width="100%" height="100%">
                          <PieChartAny>
                            <PieAny
                              data={cashierSales}
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={8}
                              dataKey="amount"
                            >
                              {cashierSales.map((entry: any, index: number) => (
                                <CellAny key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </PieAny>
                            <TooltipAny />
                          </PieChartAny>
                        </ResponsiveContainerAny>
                      </div>
                      <div className="w-full mt-4">
                        <Table>
                          <TableBody>
                            {cashierSales.slice(0, 3).map((cashier, idx) => (
                              <TableRow key={idx} className="border-none hover:bg-transparent">
                                <TableCell className="p-1 text-[9px] font-black uppercase text-slate-900">{cashier.name}</TableCell>
                                <TableCell className="p-1 text-right text-[9px] font-black text-slate-400">₦{cashier.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="alltime" className="mt-0 flex-1 flex flex-col">
                      <div className="flex-1 min-h-0 flex items-center justify-center">
                        <ResponsiveContainerAny width="100%" height="100%">
                          <PieChartAny>
                            <PieAny
                              data={allTimeCashierSales}
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={8}
                              dataKey="amount"
                            >
                              {allTimeCashierSales.map((entry: any, index: number) => (
                                <CellAny key={`cell-at-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </PieAny>
                            <TooltipAny />
                          </PieChartAny>
                        </ResponsiveContainerAny>
                      </div>
                      <div className="w-full mt-4">
                        <Table>
                          <TableBody>
                            {allTimeCashierSales.slice(0, 3).map((cashier, idx) => (
                              <TableRow key={idx} className="border-none hover:bg-transparent">
                                <TableCell className="p-1 text-[9px] font-black uppercase text-slate-900">{cashier.name}</TableCell>
                                <TableCell className="p-1 text-right text-[9px] font-black text-slate-400">₦{cashier.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Data Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Sales Table */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Recent Sales</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Latest transaction sequences</CardDescription>
              </div>
              <Link to="/dashboard/sales">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest">
                  View Logic <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest px-8">Ident</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest">Cashier</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest px-8 text-right">Node</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="px-8 py-5">
                        <p className="font-black text-slate-900 text-xs uppercase">{sale.customer || "Walk-In"}</p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase">{format(new Date(sale.date), "MMM dd, HH:mm")}</p>
                      </TableCell>
                      <TableCell className="font-black text-slate-900 text-xs text-nowrap">
                        {`₦${sale.amount.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="font-bold text-slate-400 text-[10px] uppercase">{sale.cashier}</TableCell>
                      <TableCell className="px-8 text-right">
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200">Terminal A</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Customers & Debtors (Restricted Columns) */}
          <div className="flex flex-col gap-8">
            {/* Top Customers Card (Restricted) */}
            {hasFinancialAccess && (
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl flex-1">
                <CardHeader className="p-6 border-b border-slate-100">
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Elite Customers</CardTitle>
                  <CardDescription className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Highest purchase volume</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {topCustomers.map((customer, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-slate-900 group-hover:text-white transition-all">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{customer.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{customer.total_orders} Sales</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-slate-900 text-nowrap">₦{customer.total_purchases.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Debtors Monitor (Restricted) */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl flex-1 border-l-4 border-l-red-500">
              <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">Debt Monitor</CardTitle>
                  <CardDescription className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Critical outstanding balances</CardDescription>
                </div>
                <Link to="/dashboard/debtors">
                  <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {debtors.length ? debtors.map((debtor) => (
                      <TableRow key={debtor.id} className="hover:bg-red-50/30 transition-colors">
                        <TableCell className="py-4 px-6 text-[10px] font-black uppercase text-slate-900">{debtor.customer_name}</TableCell>
                        <TableCell className="py-4 text-[10px] font-black text-red-600 text-right text-nowrap">₦{debtor.amount_owed.toLocaleString()}</TableCell>
                        <TableCell className="py-4 px-6 text-right text-[9px] font-bold text-slate-400 uppercase">{format(new Date(debtor.due_date), "MMM dd")}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-[10px] font-black text-slate-300 uppercase">System Liquid: No Debts</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Placeholder for Cashiers if everything else is hidden */}
            {!hasFinancialAccess && (
              <Card className="bg-slate-900 border-slate-800 shadow-sm overflow-hidden flex flex-col justify-center items-center p-12 text-center rounded-3xl relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10 w-40 h-40 bg-white/20 rounded-full blur-[80px]" />
                  <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/20 rounded-full blur-[80px]" />
                </div>
                <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-white mb-8 border border-white/10">
                  <Activity className="w-10 h-10" />
                </div>
                <h4 className="text-base font-black uppercase tracking-[0.2em] text-white mb-3">Active Session</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed max-w-[200px]">Data restrictions active. Contact management for full analytics access.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
