import { useState, useEffect } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import {
  Users,
  CreditCard,
  Package,
  Activity,
  DollarSign,
  TrendingUp,
} from "lucide-react";

import { MetricsCard } from "@/components/dashboard/widgets/MetricsCard";
import { ChartWidget } from "@/components/dashboard/widgets/ChartWidget";
import { Card } from "@/components/design-system/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  getDashboardMetrics,
  getRecentSales,
  getTopCustomers,
  getWeeklySales,
  getDailySales,
  getMonthlySalesByCashier,
  DashboardMetrics,
  DailySales,
  WeeklySales,
  SalesByCashier,
  TopCustomer,
  RecentSale,
} from "@/database/dashboard";
import { getDebtors } from "@/database/debtors";
import { useAppStore } from "@/lib/store";
import { UserRole } from "@/types/database";

export default function DashboardPage() {
  const { auth: { user } } = useAppStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState("daily");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [weeklySales, setWeeklySales] = useState<WeeklySales[]>([]);
  const [monthlySalesByCashier, setMonthlySalesByCashier] = useState<SalesByCashier[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [debtorsList, setDebtorsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const cashierId = user?.role === UserRole.cashier ? user.id : undefined;
      try {
        const [
          metricsData,
          dailySalesData,
          weeklySalesData,
          monthlyCashierData,
          topCustomersData,
          recentSalesData,
          debtorsData,
        ] = await Promise.all([
          getDashboardMetrics(cashierId),
          getDailySales(cashierId),
          getWeeklySales(cashierId),
          getMonthlySalesByCashier(),
          getTopCustomers(),
          getRecentSales(10, cashierId),
          getDebtors(),
        ]);

        setMetrics(metricsData);
        setDailySales(dailySalesData);
        setWeeklySales(weeklySalesData);
        setMonthlySalesByCashier(monthlyCashierData);
        setTopCustomers(topCustomersData);
        setRecentSales(recentSalesData);
        setDebtorsList(debtorsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-muted-foreground animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  // Calculate some derived metrics for trends (mocked for now as API doesn't return trends)
  const salesTrend = 'up';
  const salesChange = 12.5;

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Overview of your business performance."
              : `Welcome back, ${user?.name || 'User'}`}
          </p>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <MetricsCard
              title="Total Revenue"
              value={`₦${metrics.totalSales.toLocaleString()}`}
              icon={DollarSign}
              trend="up"
              change={salesChange}
              changeType="increase"
            />
            <MetricsCard
              title="Total Orders"
              value={recentSales.length > 0 ? metrics.totalSales / (metrics.averageOrderValue || 1) : 0} // This is a fallback if metrics doesn't have orderCount
              icon={CreditCard}
              trend="stable"
            />
            <MetricsCard
              title="Active Customers"
              value={metrics.totalCustomers}
              icon={Users}
              trend="up"
              change={2.1}
              changeType="increase"
            />
            <MetricsCard
              title="Total Debt"
              value={`₦${metrics.totalDebt.toLocaleString()}`}
              icon={Activity}
              trend="down"
              changeType="decrease"
            />
          </>
        ) : (
          <>
            <MetricsCard
              title="My Sales Today"
              value={`₦${(dailySales.find(sale => sale.date === format(new Date(), 'yyyy-MM-dd'))?.amount || 0).toLocaleString()}`}
              icon={DollarSign}
            />
            <MetricsCard
              title="My Sales This Month"
              value={`₦${dailySales.reduce((total, cashier) => total + cashier.amount, 0).toLocaleString()}`}
              icon={TrendingUp}
            />
            <MetricsCard
              title="Total Transactions"
              value={metrics.totalSales}
              icon={CreditCard}
            />
          </>
        )}
      </div>

      {/* Main Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4" title="Sales Overview" padding="none">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="daily" className="space-y-4">
              <ChartWidget
                title=""
                data={dailySales.map(d => ({ ...d, name: format(new Date(d.date), "MMM dd") })) as any}
                type="line"
                dataKey="amount"
                config={{
                  amount: {
                    label: "Sales",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="border-0 shadow-none"
              />
            </TabsContent>
            <TabsContent value="weekly" className="space-y-4">
              <ChartWidget
                title=""
                data={weeklySales.map(w => ({ ...w, name: w.week })) as any}
                type="bar"
                dataKey="amount"
                config={{
                  amount: {
                    label: "Sales",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="border-0 shadow-none"
              />
            </TabsContent>
          </Tabs>
        </Card>

        {isAdmin && (
          <Card className="col-span-3" title="Sales by Cashier" padding="none">
            <div className="p-6">
              <ChartWidget
                title=""
                data={monthlySalesByCashier as any}
                type="pie"
                dataKey="amount"
                nameKey="name"
                config={{
                  amount: {
                    label: "Sales",
                    color: "hsl(var(--chart-4))",
                  },
                }}
                className="border-0 shadow-none"
                height={300}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Recent Sales & Top Customers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4" title="Recent Sales" description={`You made ${metrics.totalSales} sales this month.`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden sm:table-cell">Cashier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.customer}</TableCell>
                  <TableCell className="text-right">₦{sale.amount.toFixed(2)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(new Date(sale.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{sale.cashier}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="col-span-3" title="Top Customers" description="Your most active customers.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.slice(0, 5).map((customer) => (
                <TableRow key={customer.name}>
                  <TableCell>
                    <div className="font-medium">{customer.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {customer.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    ₦{customer.total_purchases.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {isAdmin && (
        <div className="grid gap-4">
          <Card title="Debtors" description="Recent debts to collect.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtorsList.length ? (
                  debtorsList.slice(0, 5).map((debtor) => (
                    <TableRow key={debtor.id}>
                      <TableCell>{debtor.customer_name}</TableCell>
                      <TableCell>₦{debtor.amount_owed.toFixed(2)}</TableCell>
                      <TableCell>
                        {format(new Date(debtor.due_date), "MMM dd, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No debtors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
