'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../../components/ui/chart"
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { recentSales, recentCustomers, dailySalesData, weeklySalesData, salesByCashier, dailySalesByCashier, expenseData, overviewData, todaySalesByCashier, debtors, totalDebt } from '@/lib/mock-dashboard-data'
import { motion } from 'framer-motion'
import { useAnimatedValue } from '@/hooks/useAnimatedValue'
import { animated } from '@react-spring/web'
import { Link } from 'react-router'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC0CB']

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('daily')

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 sm:py-10">
      <motion.h1 
        className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Dashboard
      </motion.h1>
      
      {/* Overview Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        {Object.entries(overviewData).map(([key, value], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatedValue value={value} prefix={typeof value === 'number' && key !== 'customerCount' ? '₦' : ''} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt to Collect</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatedValue value={totalDebt} prefix="₦" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-7 mt-3 sm:gap-4 sm:mt-4">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="space-y-4">
                <ChartContainer config={{
                  sales: {
                    label: "Sales",
                    color: "hsl(var(--chart-1))",
                  },
                }} className="w-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySalesData}>
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value: string) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="Sales"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>
              <TabsContent value="weekly" className="space-y-4">
                <ChartContainer config={{
                  sales: {
                    label: "Sales",
                    color: "hsl(var(--chart-2))",
                  },
                }} className="w-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklySalesData}>
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="amount" name="Sales" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Sales by Cashier</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ChartContainer config={{
              sales: {
                label: "Sales",
                color: "hsl(var(--chart-3))",
              },
            }} className="h-[300px] w-full max-w-[500px]">
              <ResponsiveContainer>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={salesByCashier}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {salesByCashier.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Today's Sales and Debtors */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 mt-3 sm:gap-4 sm:mt-4">
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg">Today's Sales by Cashier</CardTitle>
            <Link to="/dashboard/sales" className="text-xs sm:text-sm text-blue-500 hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaySalesByCashier.map((cashier) => (
                      <TableRow key={cashier.name}>
                        <TableCell>{cashier.name}</TableCell>
                        <TableCell>₦{cashier.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-center h-[300px]">
                <ChartContainer config={{
                  sales: {
                    label: "Sales",
                    color: "hsl(var(--chart-4))",
                  },
                }} className="w-full max-w-[500px]">
                  <ResponsiveContainer>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={todaySalesByCashier}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {todaySalesByCashier.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Debtors</CardTitle>
            <Link to="/dashboard/debtors" className="text-sm text-blue-500 hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.slice(0, 5).map((debtor) => (
                  <TableRow key={debtor.id}>
                    <TableCell>{debtor.name}</TableCell>
                    <TableCell>₦{debtor.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(debtor.dueDate, 'MMM dd, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales and Top Customers */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 mt-3 sm:gap-4 sm:mt-4">
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle>
            <Link to="/dashboard/sales" className="text-xs sm:text-sm text-blue-500 hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.customer}</TableCell>
                    <TableCell>₦{sale.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(sale.date, 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{sale.cashier}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg">Top Customers</CardTitle>
            <Link to="/dashboard/customers" className="text-xs sm:text-sm text-blue-500 hover:underline">View All</Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>₦{customer.totalPurchases.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AnimatedValue({ value, prefix = '' }) {
  const { number, isAnimating } = useAnimatedValue(value)
  return (
    <div className="text-2xl font-bold">
      {prefix}
      {isAnimating ? (
        <animated.span>{number.to(n => n.toFixed(0))}</animated.span>
      ) : (
        value.toLocaleString()
      )}
    </div>
  )
}

