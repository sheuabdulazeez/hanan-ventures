"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from "lucide-react"

interface Product {
  id: string
  name: string
  base_unit: string
}

interface ProductUnit {
  id: string
  product_id: string
  unit_id: string
  unit_name: string
  unit_label: string
  conversion_to_base: number
  selling_price: number
  is_primary: boolean
}

interface CommonUnit {
  id: string
  name: string
  label: string
}

interface ProductUnitsManagerProps {
  product: Product
  onBack: () => void
}

export function ProductUnitsManager({ product, onBack }: ProductUnitsManagerProps) {
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([])
  const [commonUnits, setCommonUnits] = useState<CommonUnit[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    unit_id: "",
    conversion_to_base: "",
    selling_price: "",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load common units
        const unitsResponse = await fetch("/api/units")
        const units = await unitsResponse.json()
        setCommonUnits(units)

        // Load product units
        const productUnitsResponse = await fetch(`/api/product-units?productId=${product.id}`)
        const productUnitsData = await productUnitsResponse.json()
        setProductUnits(productUnitsData)
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [product.id])

  const handleAddUnit = () => {
    setEditingUnit(null)
    setFormData({ unit_id: "", conversion_to_base: "", selling_price: "" })
    setShowForm(true)
  }

  const handleEditUnit = (unit: ProductUnit) => {
    setEditingUnit(unit)
    setFormData({
      unit_id: unit.unit_id,
      conversion_to_base: unit.conversion_to_base.toString(),
      selling_price: (unit.selling_price / 100).toString(),
    })
    setShowForm(true)
  }

  const handleSaveUnit = async () => {
    try {
      const selectedUnit = commonUnits.find((u) => u.id === formData.unit_id)
      if (!selectedUnit) return

      const unitData = {
        product_id: product.id,
        unit_id: formData.unit_id,
        conversion_to_base: Number.parseFloat(formData.conversion_to_base),
        selling_price: Math.round(Number.parseFloat(formData.selling_price) * 100),
        is_primary: 0,
      }

      if (editingUnit) {
        // Update existing unit
        const response = await fetch(`/api/product-units/${editingUnit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(unitData),
        })

        if (response.ok) {
          const updatedUnit = await response.json()
          setProductUnits(
            productUnits.map((u) =>
              u.id === editingUnit.id
                ? { ...updatedUnit, unit_name: selectedUnit.name, unit_label: selectedUnit.label }
                : u,
            ),
          )
        }
      } else {
        // Create new unit
        const response = await fetch("/api/product-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(unitData),
        })

        if (response.ok) {
          const newUnit = await response.json()
          setProductUnits([
            ...productUnits,
            {
              ...newUnit,
              unit_name: selectedUnit.name,
              unit_label: selectedUnit.label,
            },
          ])
        }
      }

      setShowForm(false)
      setEditingUnit(null)
    } catch (error) {
      console.error("Failed to save unit:", error)
    }
  }

  const handleDeleteUnit = async (unitId: string) => {
    try {
      const response = await fetch(`/api/product-units/${unitId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProductUnits(productUnits.filter((u) => u.id !== unitId))
      }
    } catch (error) {
      console.error("Failed to delete unit:", error)
    }
  }

  const handleSetPrimary = async (unitId: string) => {
    try {
      const response = await fetch(`/api/product-units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: 1 }),
      })

      if (response.ok) {
        setProductUnits(
          productUnits.map((u) => ({
            ...u,
            is_primary: u.id === unitId,
          })),
        )
      }
    } catch (error) {
      console.error("Failed to set primary unit:", error)
    }
  }

  const usedUnitIds = productUnits.map((u) => u.unit_id)
  const availableUnitsForSelection = commonUnits.filter(
    (u) => !usedUnitIds.includes(u.id) || u.id === editingUnit?.unit_id,
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading units...</p>
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
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Manage Units</h1>
                <p className="text-sm text-muted-foreground">{product.name}</p>
              </div>
            </div>
            <Button onClick={handleAddUnit} className="bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Base Unit Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Base Unit Information</CardTitle>
              <CardDescription>The base unit is used for inventory tracking and conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
                <div>
                  <p className="font-medium">{product.base_unit}</p>
                  <p className="text-sm text-muted-foreground">Base unit for {product.name}</p>
                </div>
                <Badge variant="secondary">Base Unit</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Add/Edit Unit Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingUnit ? "Edit Unit" : "Add New Unit"}</CardTitle>
                <CardDescription>
                  Configure how this unit converts to the base unit and its selling price
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={formData.unit_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, unit_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnitsForSelection.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Conversion to Base</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="e.g., 0.001 for gram to kg"
                      value={formData.conversion_to_base}
                      onChange={(e) => setFormData((prev) => ({ ...prev, conversion_to_base: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">How many base units = 1 of this unit</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Selling Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.selling_price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, selling_price: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSaveUnit} className="bg-accent hover:bg-accent/90">
                    <Save className="h-4 w-4 mr-2" />
                    Save Unit
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Units List */}
          <Card>
            <CardHeader>
              <CardTitle>Product Units</CardTitle>
              <CardDescription>Manage different units and their conversions for this product</CardDescription>
            </CardHeader>
            <CardContent>
              {productUnits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No additional units configured</p>
                  <Button onClick={handleAddUnit} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Unit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {productUnits.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{unit.unit_label}</h4>
                          {unit.is_primary && (
                            <Badge variant="default" className="bg-accent">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span>Conversion: </span>
                            <span className="font-medium">
                              1 {unit.unit_label} = {unit.conversion_to_base} {product.base_unit}
                            </span>
                          </div>
                          <div>
                            <span>Price: </span>
                            <span className="font-medium">${(unit.selling_price / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!unit.is_primary && (
                          <Button variant="outline" size="sm" onClick={() => handleSetPrimary(unit.id)}>
                            Set Primary
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEditUnit(unit)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
