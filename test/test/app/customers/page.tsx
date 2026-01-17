"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Users, Plus, Edit, Trash2, Phone, Mail, MapPin } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { getCustomers, getSales } from "@/lib/database"
import type { Customer } from "@/lib/database"

interface CustomerWithStats extends Customer {
  total_purchases: number
  last_purchase: string
}

function CustomersContent() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const [customersData, salesData] = await Promise.all([getCustomers(), getSales()])

        // Calculate customer stats from sales data
        const customersWithStats = customersData.map((customer) => {
          const customerSales = salesData.filter((sale) => sale.customer_id === customer.id)
          const totalPurchases = customerSales.reduce((sum, sale) => sum + sale.total_amount, 0)
          const lastPurchase =
            customerSales.length > 0
              ? customerSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0]
                  .sale_date
              : ""

          return {
            ...customer,
            total_purchases: totalPurchases / 100, // Convert from cents
            last_purchase: lastPurchase,
          }
        })

        // Add default walk-in customer if not exists
        const hasWalkIn = customersWithStats.some((c) => c.name === "Walk-in Customer")
        if (!hasWalkIn) {
          customersWithStats.unshift({
            id: "walk-in",
            name: "Walk-in Customer",
            total_purchases: 0,
            last_purchase: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        setCustomers(customersWithStats)
      } catch (error) {
        console.error("Failed to load customers:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers(customers.filter((c) => c.id !== customerId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    )
  }

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
                <Users className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
              </div>
            </div>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Customers</CardDescription>
              <CardTitle className="text-2xl text-accent">{customers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Customers</CardDescription>
              <CardTitle className="text-2xl text-accent">{customers.filter((c) => c.last_purchase).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-2xl text-accent">
                ${customers.reduce((sum, c) => sum + c.total_purchases, 0).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Purchase</CardDescription>
              <CardTitle className="text-2xl text-accent">
                $
                {(
                  customers.reduce((sum, c) => sum + c.total_purchases, 0) /
                    customers.filter((c) => c.total_purchases > 0).length || 0
                ).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Customers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-balance">{customer.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Customer since {new Date(customer.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {customer.total_purchases > 1000 && <Badge className="bg-accent">VIP</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  {customer.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Purchase Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Purchases:</span>
                    <p className="font-medium text-accent">${customer.total_purchases.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Purchase:</span>
                    <p className="font-medium">
                      {customer.last_purchase ? new Date(customer.last_purchase).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    View History
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {customer.name !== "Walk-in Customer" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No customers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search" : "Get started by adding your first customer"}
            </p>
            {!searchTerm && (
              <Button className="bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Customer
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function CustomersPage() {
  return (
    <AuthGuard>
      <CustomersContent />
    </AuthGuard>
  )
}
