"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, ShoppingCart, Package, Users } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface SalesData {
  date: string
  sales: number
  profit: number
  transactions: number
}

interface ProductSales {
  name: string
  quantity: number
  revenue: number
  profit: number
}

interface CategorySales {
  category: string
  value: number
  color: string
}

function ReportsContent() {
  const [dateRange, setDateRange] = useState("7days")
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [topProducts, setTopProducts] = useState<ProductSales[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])

  // Mock data
  useEffect(() => {
    const mockSalesData: SalesData[] = [
      { date: "2024-01-15", sales: 1250, profit: 375, transactions: 45 },
      { date: "2024-01-16", sales: 1580, profit: 474, transactions: 52 },
      { date: "2024-01-17", sales: 1320, profit: 396, transactions: 48 },
      { date: "2024-01-18", sales: 1890, profit: 567, transactions: 61 },
      { date: "2024-01-19", sales: 2100, profit: 630, transactions: 68 },
      { date: "2024-01-20", sales: 1750, profit: 525, transactions: 55 },
      { date: "2024-01-21", sales: 1650, profit: 495, transactions: 53 },
    ]

    const mockTopProducts: ProductSales[] = [
      { name: "Coca Cola 500ml", quantity: 156, revenue: 1872, profit: 624 },
      { name: "White Bread", quantity: 89, revenue: 1780, profit: 445 },
      { name: "Milk 1L", quantity: 67, revenue: 1675, profit: 469 },
      { name: "Bananas", quantity: 45, revenue: 810, profit: 270 },
      { name: "Rice 5kg", quantity: 23, revenue: 2760, profit: 920 },
    ]

    const mockCategorySales: CategorySales[] = [
      { category: "Beverages", value: 3500, color: "#646cff" },
      { category: "Bakery", value: 2800, color: "#22c55e" },
      { category: "Dairy", value: 2200, color: "#f59e0b" },
      { category: "Fruits", value: 1800, color: "#ef4444" },
      { category: "Grains", value: 1500, color: "#8b5cf6" },
      { category: "Meat", value: 1200, color: "#06b6d4" },
    ]

    setSalesData(mockSalesData)
    setTopProducts(mockTopProducts)
    setCategorySales(mockCategorySales)
  }, [dateRange])

  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0)
  const totalProfit = salesData.reduce((sum, day) => sum + day.profit, 0)
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0)
  const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0

  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Sales Reports</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">${totalSales.toFixed(2)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +12.5% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">${totalProfit.toFixed(2)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                {profitMargin.toFixed(1)}% margin
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{totalTransactions}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +8.2% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">${avgTransactionValue.toFixed(2)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +3.8% from last period
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Daily sales and profit over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(2)}`,
                      name === "sales" ? "Sales" : "Profit",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Sales Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Revenue distribution across product categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySales}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10">
                        <span className="text-sm font-medium text-accent">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${(product.revenue / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">${(product.profit / 100).toFixed(2)} profit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Transactions per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number) => [value, "Transactions"]}
                  />
                  <Bar dataKey="transactions" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Inventory Alerts</span>
            </CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                <div>
                  <h4 className="font-medium text-sm">Bananas</h4>
                  <p className="text-xs text-muted-foreground">5 kg remaining</p>
                </div>
                <Badge variant="destructive">Low Stock</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                <div>
                  <h4 className="font-medium text-sm">Milk 1L</h4>
                  <p className="text-xs text-muted-foreground">8 bottles remaining</p>
                </div>
                <Badge variant="destructive">Low Stock</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                <div>
                  <h4 className="font-medium text-sm">Rice 5kg</h4>
                  <p className="text-xs text-muted-foreground">3 packs remaining</p>
                </div>
                <Badge variant="destructive">Critical</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <ReportsContent />
    </AuthGuard>
  )
}
