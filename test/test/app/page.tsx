"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Package, Users, BarChart3, LogOut } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getProducts, getSales, getCustomers } from "@/lib/database"

interface User {
  id: string
  name: string
  username: string
  role: string
}

interface DashboardStats {
  todaysSales: number
  productsInStock: number
  lowStockItems: number
  totalCustomers: number
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    todaysSales: 0,
    productsInStock: 0,
    lowStockItems: 0,
    totalCustomers: 0,
  })
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [products, sales, customers] = await Promise.all([getProducts(), getSales(), getCustomers()])

        // Calculate today's sales
        const today = new Date().toISOString().split("T")[0]
        const todaysSales = sales
          .filter((sale) => sale.sale_date.startsWith(today))
          .reduce((sum, sale) => sum + sale.total_amount, 0)

        // Count products in stock
        const productsInStock = products.filter((p) => p.quantity_on_hand > 0).length

        // Count low stock items
        const lowStockItems = products.filter((p) => p.quantity_on_hand <= p.reorder_level).length

        setStats({
          todaysSales: todaysSales / 100, // Convert from cents
          productsInStock,
          lowStockItems,
          totalCustomers: customers.length,
        })
      } catch (error) {
        console.error("Failed to load dashboard stats:", error)
      }
    }

    loadStats()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-accent-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">RetailPOS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.name || "User"} ({user?.role})
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Manage your retail operations efficiently</p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/pos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Point of Sale</CardTitle>
                    <CardDescription>Process customer transactions</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/products">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Product Management</CardTitle>
                    <CardDescription>Manage inventory and units</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/customers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Customer Management</CardTitle>
                    <CardDescription>Manage customer database</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sales Reports</CardTitle>
                    <CardDescription>View sales analytics</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today's Sales</CardDescription>
              <CardTitle className="text-2xl text-accent">${stats.todaysSales.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Products in Stock</CardDescription>
              <CardTitle className="text-2xl text-accent">{stats.productsInStock}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Low Stock Items</CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.lowStockItems}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Customers</CardDescription>
              <CardTitle className="text-2xl text-accent">{stats.totalCustomers}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
