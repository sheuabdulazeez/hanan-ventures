"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, X } from "lucide-react"

interface Product {
  id: string
  name: string
  category: string
  description: string
  cost_price: number
  selling_price: number
  quantity_on_hand: number
  reorder_level: number
  base_unit: string
}

interface ProductFormProps {
  product?: Product | null
  onSave: (product: any) => void
  onCancel: () => void
}

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    cost_price: "",
    selling_price: "",
    quantity_on_hand: "",
    reorder_level: "",
    base_unit: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Common units for selection
  const commonUnits = [
    { value: "piece", label: "Piece" },
    { value: "kg", label: "Kilogram" },
    { value: "liter", label: "Liter" },
    { value: "meter", label: "Meter" },
    { value: "box", label: "Box" },
    { value: "bottle", label: "Bottle" },
    { value: "pack", label: "Pack" },
    { value: "gram", label: "Gram" },
    { value: "ml", label: "Milliliter" },
    { value: "dozen", label: "Dozen" },
  ]

  const categories = [
    "Beverages",
    "Bakery",
    "Dairy",
    "Fruits",
    "Vegetables",
    "Meat",
    "Grains",
    "Cooking",
    "Snacks",
    "Personal Care",
    "Household",
    "Electronics",
    "Other",
  ]

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        description: product.description,
        cost_price: (product.cost_price / 100).toString(),
        selling_price: (product.selling_price / 100).toString(),
        quantity_on_hand: product.quantity_on_hand.toString(),
        reorder_level: product.reorder_level.toString(),
        base_unit: product.base_unit,
      })
    }
  }, [product])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Product name is required"
    if (!formData.category.trim()) newErrors.category = "Category is required"
    if (!formData.base_unit) newErrors.base_unit = "Base unit is required"

    const costPrice = Number.parseFloat(formData.cost_price)
    const sellingPrice = Number.parseFloat(formData.selling_price)

    if (!formData.cost_price || isNaN(costPrice) || costPrice < 0) {
      newErrors.cost_price = "Valid cost price is required"
    }
    if (!formData.selling_price || isNaN(sellingPrice) || sellingPrice < 0) {
      newErrors.selling_price = "Valid selling price is required"
    }
    if (costPrice >= sellingPrice) {
      newErrors.selling_price = "Selling price must be higher than cost price"
    }

    const quantity = Number.parseInt(formData.quantity_on_hand)
    const reorderLevel = Number.parseInt(formData.reorder_level)

    if (!formData.quantity_on_hand || isNaN(quantity) || quantity < 0) {
      newErrors.quantity_on_hand = "Valid quantity is required"
    }
    if (!formData.reorder_level || isNaN(reorderLevel) || reorderLevel < 0) {
      newErrors.reorder_level = "Valid reorder level is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const productData = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      cost_price: Math.round(Number.parseFloat(formData.cost_price) * 100), // Convert to cents
      selling_price: Math.round(Number.parseFloat(formData.selling_price) * 100), // Convert to cents
      quantity_on_hand: Number.parseInt(formData.quantity_on_hand),
      reorder_level: Number.parseInt(formData.reorder_level),
      base_unit: formData.base_unit,
    }

    onSave(productData)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-foreground">{product ? "Edit Product" : "Add New Product"}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
                <Save className="h-4 w-4 mr-2" />
                Save Product
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Enter the details for your product. You can manage multiple units after saving.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Coca Cola 500ml"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Brief description of the product"
                  rows={3}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price ($) *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange("cost_price", e.target.value)}
                    placeholder="0.00"
                    className={errors.cost_price ? "border-destructive" : ""}
                  />
                  {errors.cost_price && <p className="text-sm text-destructive">{errors.cost_price}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price ($) *</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => handleInputChange("selling_price", e.target.value)}
                    placeholder="0.00"
                    className={errors.selling_price ? "border-destructive" : ""}
                  />
                  {errors.selling_price && <p className="text-sm text-destructive">{errors.selling_price}</p>}
                </div>
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_unit">Base Unit *</Label>
                  <Select value={formData.base_unit} onValueChange={(value) => handleInputChange("base_unit", value)}>
                    <SelectTrigger className={errors.base_unit ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonUnits.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.base_unit && <p className="text-sm text-destructive">{errors.base_unit}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity_on_hand">Current Stock *</Label>
                  <Input
                    id="quantity_on_hand"
                    type="number"
                    min="0"
                    value={formData.quantity_on_hand}
                    onChange={(e) => handleInputChange("quantity_on_hand", e.target.value)}
                    placeholder="0"
                    className={errors.quantity_on_hand ? "border-destructive" : ""}
                  />
                  {errors.quantity_on_hand && <p className="text-sm text-destructive">{errors.quantity_on_hand}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_level">Reorder Level *</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => handleInputChange("reorder_level", e.target.value)}
                    placeholder="0"
                    className={errors.reorder_level ? "border-destructive" : ""}
                  />
                  {errors.reorder_level && <p className="text-sm text-destructive">{errors.reorder_level}</p>}
                </div>
              </div>

              {/* Profit Margin Display */}
              {formData.cost_price && formData.selling_price && !errors.cost_price && !errors.selling_price && (
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Profit Margin:</span>
                    <span className="font-medium text-accent">
                      ${(Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.cost_price)).toFixed(2)}
                      (
                      {(
                        ((Number.parseFloat(formData.selling_price) - Number.parseFloat(formData.cost_price)) /
                          Number.parseFloat(formData.cost_price)) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
