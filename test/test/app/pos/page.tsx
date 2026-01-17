"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  User,
  Package,
} from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { getProducts, createSale, createSaleItem, updateProduct, getProductUnits, getCommonUnits } from "@/lib/database"
import type { Product, ProductUnit } from "@/lib/database"

interface CartItem {
  id: string // This will be product_id + unit_id to allow multiple units of same product
  product: Product
  unit: ProductUnit & { unit_name: string; unit_label: string }
  quantity: number
  unit_price: number
  total_price: number
}

interface Customer {
  id: string
  name: string
  phone?: string
}

interface ProductWithUnits extends Product {
  units: (ProductUnit & { unit_name: string; unit_label: string })[]
}

function POSContent() {
  const [products, setProducts] = useState<ProductWithUnits[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountPaid, setAmountPaid] = useState("")
  const [discount, setDiscount] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithUnits | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<string>("")
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getProducts()
        const commonUnits = await getCommonUnits()

        console.log("[v0] Products data:", productsData)
        console.log("[v0] Common units:", commonUnits)

        const productsWithUnits = await Promise.all(
          productsData.map(async (product) => {
            const units = await getProductUnits(product.id)
            console.log(`[v0] Units for product ${product.name}:`, units)

            const unitsWithNames = units.map((unit: any) => {
              const commonUnit = commonUnits.find((cu) => cu.id === unit.unit_id)
              console.log(`[v0] Found common unit for ${unit.unit_id}:`, commonUnit)
              return {
                ...unit,
                unit_name: commonUnit?.name || product.base_unit,
                unit_label: commonUnit?.label || product.base_unit,
              }
            })

            // If no units are defined, create a default unit based on base_unit
            if (unitsWithNames.length === 0) {
              console.log(`[v0] No units found for ${product.name}, creating default unit`)
              const baseUnit = commonUnits.find((cu) => cu.name === product.base_unit)
              if (baseUnit) {
                unitsWithNames.push({
                  id: `default_${product.id}`,
                  product_id: product.id,
                  unit_id: baseUnit.id,
                  conversion_to_base: 1,
                  selling_price: product.selling_price,
                  is_primary: 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  unit_name: baseUnit.name,
                  unit_label: baseUnit.label,
                })
              }
            }

            console.log(`[v0] Final units for ${product.name}:`, unitsWithNames)

            return {
              ...product,
              units: unitsWithNames,
            }
          }),
        )

        console.log("[v0] Final products with units:", productsWithUnits)
        setProducts(productsWithUnits)
      } catch (error) {
        console.error("Failed to load products:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))]

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory && product.quantity_on_hand > 0
  })

  const handleProductClick = (product: ProductWithUnits) => {
    if (product.units.length === 1) {
      // If only one unit, add directly to cart
      addToCart(product, product.units[0])
    } else {
      // If multiple units, show selection dialog
      setSelectedProduct(product)
      setSelectedUnit(product.units.find((u) => u.is_primary)?.id || product.units[0].id)
      setIsUnitDialogOpen(true)
    }
  }

  const addToCart = (product: ProductWithUnits, unit: ProductUnit & { unit_name: string; unit_label: string }) => {
    const cartItemId = `${product.id}_${unit.id}`
    const existingItem = cart.find((item) => item.id === cartItemId)

    if (existingItem) {
      if (existingItem.quantity < product.quantity_on_hand) {
        setCart(
          cart.map((item) =>
            item.id === cartItemId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  total_price: (item.quantity + 1) * item.unit_price,
                }
              : item,
          ),
        )
      }
    } else {
      const newItem: CartItem = {
        id: cartItemId,
        product,
        unit,
        quantity: 1,
        unit_price: unit.selling_price,
        total_price: unit.selling_price,
      }
      setCart([...cart, newItem])
    }

    // Close dialog if it was open
    setIsUnitDialogOpen(false)
  }

  const handleAddSelectedUnit = () => {
    if (selectedProduct && selectedUnit) {
      const unit = selectedProduct.units.find((u) => u.id === selectedUnit)
      if (unit) {
        addToCart(selectedProduct, unit)
      }
    }
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    const item = cart.find((item) => item.id === itemId)
    if (item && newQuantity * item.unit.conversion_to_base <= item.product.quantity_on_hand) {
      setCart(
        cart.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: newQuantity,
                total_price: newQuantity * item.unit_price,
              }
            : item,
        ),
      )
    }
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setAmountPaid("")
    setDiscount("")
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
  const discountAmount = discount ? (subtotal * Number.parseFloat(discount)) / 100 : 0
  const total = subtotal - discountAmount
  const change = amountPaid ? Number.parseFloat(amountPaid) * 100 - total : 0

  const canProcessSale = cart.length > 0 && Number.parseFloat(amountPaid || "0") * 100 >= total

  const processSale = async () => {
    if (!canProcessSale) return

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      const sale = await createSale({
        sale_date: new Date().toISOString(),
        customer_id: selectedCustomer?.id,
        employee_id: user.id,
        total_amount: total,
        total_cost: cart.reduce((sum, item) => sum + item.product.cost_price * item.quantity, 0),
        gross_profit: total - cart.reduce((sum, item) => sum + item.product.cost_price * item.quantity, 0),
        discount: discountAmount,
        payment_method: paymentMethod,
        amount_paid: Number.parseFloat(amountPaid) * 100,
      })

      for (const item of cart) {
        await createSaleItem({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          cost_price_at_sale: item.product.cost_price,
          profit: (item.unit_price - item.product.cost_price) * item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })

        const baseQuantityUsed = item.quantity * item.unit.conversion_to_base
        await updateProduct(item.product.id, {
          quantity_on_hand: item.product.quantity_on_hand - baseQuantityUsed,
        })
      }

      const updatedProducts = await getProducts()
      const commonUnits = await getCommonUnits()

      const productsWithUnits = await Promise.all(
        updatedProducts.map(async (product) => {
          const units = await getProductUnits(product.id)
          console.log(`[v0] Units for product ${product.name}:`, units)

          const unitsWithNames = units.map((unit: any) => {
            const commonUnit = commonUnits.find((cu) => cu.id === unit.unit_id)
            console.log(`[v0] Found common unit for ${unit.unit_id}:`, commonUnit)
            return {
              ...unit,
              unit_name: commonUnit?.name || product.base_unit,
              unit_label: commonUnit?.label || product.base_unit,
            }
          })

          // If no units are defined, create a default unit based on base_unit
          if (unitsWithNames.length === 0) {
            console.log(`[v0] No units found for ${product.name}, creating default unit`)
            const baseUnit = commonUnits.find((cu) => cu.name === product.base_unit)
            if (baseUnit) {
              unitsWithNames.push({
                id: `default_${product.id}`,
                product_id: product.id,
                unit_id: baseUnit.id,
                conversion_to_base: 1,
                selling_price: product.selling_price,
                is_primary: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                unit_name: baseUnit.name,
                unit_label: baseUnit.label,
              })
            }
          }

          console.log(`[v0] Final units for ${product.name}:`, unitsWithNames)

          return {
            ...product,
            units: unitsWithNames,
          }
        }),
      )

      console.log("[v0] Final products with units:", productsWithUnits)
      setProducts(productsWithUnits)

      clearCart()
      alert("Sale processed successfully!")
    } catch (error) {
      console.error("Failed to process sale:", error)
      alert("Failed to process sale. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading products...</p>
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
                <ShoppingCart className="h-6 w-6 text-accent" />
                <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Cashier: {JSON.parse(localStorage.getItem("user") || "{}").name || "User"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Select products to add to cart</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className={selectedCategory === category ? "bg-accent hover:bg-accent/90" : ""}
                      >
                        {category === "all" ? "All" : category}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleProductClick(product)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-sm text-balance leading-tight">{product.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-accent">
                              $
                              {(
                                (product.units.find((u) => u.is_primary)?.selling_price || product.selling_price) / 100
                              ).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {product.quantity_on_hand} {product.base_unit}
                            </span>
                          </div>
                          {product.units.length > 1 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Package className="h-3 w-3" />
                              <span>{product.units.length} units available</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div className="space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <User className="h-4 w-4 mr-2" />
                  {selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}
                </Button>
              </CardContent>
            </Card>

            {/* Cart */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Cart ({cart.length})</CardTitle>
                  {cart.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-balance leading-tight">{item.product.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              ${(item.unit_price / 100).toFixed(2)} per {item.unit.unit_label}
                              {item.unit.conversion_to_base !== 1 && (
                                <span className="ml-1">
                                  (1 {item.unit.unit_label} = {item.unit.conversion_to_base} {item.product.base_unit})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                              disabled={item.quantity * item.unit.conversion_to_base >= item.product.quantity_on_hand}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-medium">${(item.total_price / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${(subtotal / 100).toFixed(2)}</span>
                      </div>

                      {/* Discount Input */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Discount (%):</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="h-8 w-20"
                          min="0"
                          max="100"
                        />
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-destructive">
                          <span>Discount:</span>
                          <span>-${(discountAmount / 100).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-accent">${(total / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Payment */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2" />
                                Cash
                              </div>
                            </SelectItem>
                            <SelectItem value="card">
                              <div className="flex items-center">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Card
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Amount Paid ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>

                      {change > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Change:</span>
                          <span className="font-medium">${(change / 100).toFixed(2)}</span>
                        </div>
                      )}

                      <Button
                        onClick={processSale}
                        disabled={!canProcessSale}
                        className="w-full bg-accent hover:bg-accent/90"
                        size="lg"
                      >
                        Process Sale
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Unit</DialogTitle>
            <DialogDescription>Choose the unit for {selectedProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {selectedProduct?.units.map((unit) => (
                <div
                  key={unit.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUnit === unit.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setSelectedUnit(unit.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{unit.unit_label}</div>
                      <div className="text-sm text-muted-foreground">
                        ${(unit.selling_price / 100).toFixed(2)} per {unit.unit_label}
                        {unit.conversion_to_base !== 1 && (
                          <span className="ml-1">
                            (1 {unit.unit_label} = {unit.conversion_to_base} {selectedProduct.base_unit})
                          </span>
                        )}
                      </div>
                    </div>
                    {unit.is_primary === 1 && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddSelectedUnit} className="flex-1 bg-accent hover:bg-accent/90">
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function POSPage() {
  return (
    <AuthGuard>
      <POSContent />
    </AuthGuard>
  )
}
