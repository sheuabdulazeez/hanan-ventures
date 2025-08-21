"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Package, ShoppingCart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Demo Types
type DemoProductUnit = {
  id: string;
  unit_name: string;
  conversion_to_base: number;
  selling_price: number;
  is_primary: boolean;
};

type DemoProduct = {
  id: string;
  name: string;
  category: string;
  base_unit: string;
  display_unit: string;
  cost_price: number;
  selling_price: number;
  quantity_on_hand: number;
  available_units: DemoProductUnit[];
};

type DemoSaleItem = {
  id: string;
  product: DemoProduct;
  quantity: number;
  unit_used: string;
  unit_price: number;
  base_quantity: number;
  total_price: number;
};

// Stub Data
const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "1",
    name: "GP Flour",
    category: "FLOUR",
    base_unit: "kg",
    display_unit: "bag",
    cost_price: 64000,
    selling_price: 69000,
    quantity_on_hand: 120, // 120kg in stock
    available_units: [
      { id: "1-1", unit_name: "bag", conversion_to_base: 50, selling_price: 69000, is_primary: true },
      { id: "1-2", unit_name: "role", conversion_to_base: 12.5, selling_price: 17250, is_primary: false },
      { id: "1-3", unit_name: "kg", conversion_to_base: 1, selling_price: 1380, is_primary: false }
    ]
  },
  {
    id: "2",
    name: "Coca Cola",
    category: "DRINKS",
    base_unit: "pieces",
    display_unit: "pack",
    cost_price: 2400,
    selling_price: 2800,
    quantity_on_hand: 240, // 240 pieces in stock
    available_units: [
      { id: "2-1", unit_name: "pack", conversion_to_base: 12, selling_price: 2800, is_primary: true },
      { id: "2-2", unit_name: "pieces", conversion_to_base: 1, selling_price: 250, is_primary: false },
      { id: "2-3", unit_name: "carton", conversion_to_base: 24, selling_price: 5400, is_primary: false }
    ]
  },
  {
    id: "3",
    name: "Rice (Local)",
    category: "GRAINS",
    base_unit: "kg",
    display_unit: "bag",
    cost_price: 45000,
    selling_price: 52000,
    quantity_on_hand: 200, // 200kg in stock
    available_units: [
      { id: "3-1", unit_name: "bag", conversion_to_base: 50, selling_price: 52000, is_primary: true },
      { id: "3-2", unit_name: "kg", conversion_to_base: 1, selling_price: 1040, is_primary: false },
      { id: "3-3", unit_name: "mudu", conversion_to_base: 2.5, selling_price: 2600, is_primary: false }
    ]
  }
];

export default function UnitPriceDemo() {
  const [products, setProducts] = useState<DemoProduct[]>(DEMO_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [saleItems, setSaleItems] = useState<DemoSaleItem[]>([]);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState<string>("");

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    base_unit: "",
    display_unit: "",
    cost_price: 0,
    selling_price: 0,
    quantity_on_hand: 0
  });
  const [newProductUnits, setNewProductUnits] = useState<Omit<DemoProductUnit, 'id'>[]>([
    { unit_name: "", conversion_to_base: 1, selling_price: 0, is_primary: true }
  ]);

  // Helper Functions
  const getUnitPrice = (product: DemoProduct, unitName: string): number => {
    const unit = product.available_units.find(u => u.unit_name === unitName);
    return unit?.selling_price || 0;
  };

  const getConversionFactor = (product: DemoProduct, unitName: string): number => {
    const unit = product.available_units.find(u => u.unit_name === unitName);
    return unit?.conversion_to_base || 1;
  };

  const calculateBaseQuantity = (quantity: number, conversionFactor: number): number => {
    return quantity * conversionFactor;
  };

  const getAvailableStock = (product: DemoProduct, unitName: string): number => {
    const conversionFactor = getConversionFactor(product, unitName);
    return Math.floor(product.quantity_on_hand / conversionFactor);
  };

  const addToSale = () => {
    if (!selectedProduct || !newItemUnit) {
      toast({ title: "Error", description: "Please select a product and unit", variant: "destructive" });
      return;
    }

    const unitPrice = getUnitPrice(selectedProduct, newItemUnit);
    const conversionFactor = getConversionFactor(selectedProduct, newItemUnit);
    const baseQuantity = calculateBaseQuantity(newItemQuantity, conversionFactor);
    const totalPrice = newItemQuantity * unitPrice;

    const newItem: DemoSaleItem = {
      id: Date.now().toString(),
      product: selectedProduct,
      quantity: newItemQuantity,
      unit_used: newItemUnit,
      unit_price: unitPrice,
      base_quantity: baseQuantity,
      total_price: totalPrice
    };

    setSaleItems([...saleItems, newItem]);
    setNewItemQuantity(1);
    setNewItemUnit("");
    setSelectedProduct(null);
    
    toast({ title: "Success", description: "Item added to sale" });
  };

  const removeFromSale = (itemId: string) => {
    setSaleItems(saleItems.filter(item => item.id !== itemId));
  };

  const getTotalSale = () => {
    return saleItems.reduce((total, item) => total + item.total_price, 0);
  };

  // Add Product Functions
  const addProductUnit = () => {
    setNewProductUnits([...newProductUnits, { 
      unit_name: "", 
      conversion_to_base: 1, 
      selling_price: 0, 
      is_primary: false 
    }]);
  };

  const removeProductUnit = (index: number) => {
    if (newProductUnits.length > 1) {
      setNewProductUnits(newProductUnits.filter((_, i) => i !== index));
    }
  };

  const updateProductUnit = (index: number, field: keyof Omit<DemoProductUnit, 'id'>, value: any) => {
    const updated = [...newProductUnits];
    updated[index] = { ...updated[index], [field]: value };
    setNewProductUnits(updated);
  };

  const setPrimaryUnit = (index: number) => {
    const updated = newProductUnits.map((unit, i) => ({
      ...unit,
      is_primary: i === index
    }));
    setNewProductUnits(updated);
  };

  const createProduct = () => {
    // Validation
    if (!newProduct.name || !newProduct.category || !newProduct.base_unit) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (newProductUnits.some(unit => !unit.unit_name || unit.selling_price <= 0)) {
      toast({ title: "Error", description: "Please complete all unit configurations", variant: "destructive" });
      return;
    }

    if (!newProductUnits.some(unit => unit.is_primary)) {
      toast({ title: "Error", description: "Please select a primary unit", variant: "destructive" });
      return;
    }

    const product: DemoProduct = {
      id: Date.now().toString(),
      ...newProduct,
      available_units: newProductUnits.map((unit, index) => ({
        ...unit,
        id: `${Date.now()}-${index}`
      }))
    };

    setProducts([...products, product]);
    
    // Reset form
    setNewProduct({
      name: "",
      category: "",
      base_unit: "",
      display_unit: "",
      cost_price: 0,
      selling_price: 0,
      quantity_on_hand: 0
    });
    setNewProductUnits([
      { unit_name: "", conversion_to_base: 1, selling_price: 0, is_primary: true }
    ]);

    toast({ title: "Success", description: "Product created successfully!" });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Unit Price System Demo</h1>
        <p className="text-muted-foreground">Demonstration of flexible unit conversion and pricing system</p>
      </div>

      <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Product Management</TabsTrigger>
            <TabsTrigger value="add-product">Add Product</TabsTrigger>
            <TabsTrigger value="sales">Sales Interface</TabsTrigger>
          </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Unit Configuration
              </CardTitle>
              <CardDescription>
                View how products are configured with multiple units and automatic price calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {DEMO_PRODUCTS.map((product) => (
                  <Card key={product.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription>
                            Category: {product.category} | Base Unit: {product.base_unit} | Stock: {product.quantity_on_hand} {product.base_unit}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{product.display_unit}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unit</TableHead>
                            <TableHead>Conversion</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Available Stock</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {product.available_units.map((unit) => (
                            <TableRow key={unit.id}>
                              <TableCell className="font-medium">{unit.unit_name}</TableCell>
                              <TableCell>
                                1 {unit.unit_name} = {unit.conversion_to_base} {product.base_unit}
                              </TableCell>
                              <TableCell>₦{unit.selling_price.toLocaleString()}</TableCell>
                              <TableCell>
                                {Math.floor(product.quantity_on_hand / unit.conversion_to_base)} {unit.unit_name}
                              </TableCell>
                              <TableCell>
                                {unit.is_primary ? (
                                  <Badge variant="default">Primary</Badge>
                                ) : (
                                  <Badge variant="outline">Secondary</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          <TabsContent value="add-product" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
                <CardDescription>
                  Create a new product with multiple unit configurations and pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Product Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Product Name *</Label>
                    <Input
                      id="product-name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      placeholder="Enter category"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base-unit">Base Unit *</Label>
                    <Input
                      id="base-unit"
                      value={newProduct.base_unit}
                      onChange={(e) => setNewProduct({...newProduct, base_unit: e.target.value})}
                      placeholder="e.g., kg, pieces, liters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-unit">Display Unit</Label>
                    <Input
                      id="display-unit"
                      value={newProduct.display_unit}
                      onChange={(e) => setNewProduct({...newProduct, display_unit: e.target.value})}
                      placeholder="Unit for display (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost-price">Cost Price</Label>
                    <Input
                      id="cost-price"
                      type="number"
                      value={newProduct.cost_price}
                      onChange={(e) => setNewProduct({...newProduct, cost_price: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity on Hand</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newProduct.quantity_on_hand}
                      onChange={(e) => setNewProduct({...newProduct, quantity_on_hand: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Unit Configurations */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Unit Configurations</h3>
                    <Button onClick={addProductUnit} variant="outline" size="sm">
                      Add Unit
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {newProductUnits.map((unit, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Unit Name *</Label>
                            <Input
                              value={unit.unit_name}
                              onChange={(e) => updateProductUnit(index, 'unit_name', e.target.value)}
                              placeholder="e.g., bag, carton"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Conversion to Base *</Label>
                            <Input
                              type="number"
                              value={unit.conversion_to_base}
                              onChange={(e) => updateProductUnit(index, 'conversion_to_base', parseFloat(e.target.value) || 1)}
                              placeholder="1"
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Selling Price *</Label>
                            <Input
                              type="number"
                              value={unit.selling_price}
                              onChange={(e) => updateProductUnit(index, 'selling_price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="space-y-2 flex items-end gap-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`primary-${index}`}
                                name="primary-unit"
                                checked={unit.is_primary}
                                onChange={() => setPrimaryUnit(index)}
                              />
                              <Label htmlFor={`primary-${index}`}>Primary</Label>
                            </div>
                            {newProductUnits.length > 1 && (
                              <Button
                                onClick={() => removeProductUnit(index)}
                                variant="destructive"
                                size="sm"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={createProduct} className="w-full md:w-auto">
                    Create Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Product Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Product to Sale
                </CardTitle>
                <CardDescription>
                  Select products and units with real-time price calculation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select onValueChange={(value) => {
                    const product = products.find(p => p.id === value);
                    setSelectedProduct(product || null);
                    setNewItemUnit("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProduct.available_units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.unit_name}>
                              {unit.unit_name} - ₦{unit.selling_price.toLocaleString()}
                              {unit.is_primary && " (Primary)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(parseFloat(e.target.value) || 1)}
                        max={newItemUnit ? getAvailableStock(selectedProduct, newItemUnit) : undefined}
                      />
                      {newItemUnit && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Available: {getAvailableStock(selectedProduct, newItemUnit)} {newItemUnit}
                        </p>
                      )}
                    </div>

                    {newItemUnit && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <h4 className="font-medium">Price Calculation</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Unit Price:</span>
                            <p className="font-medium">₦{getUnitPrice(selectedProduct, newItemUnit).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <p className="font-medium">{newItemQuantity} {newItemUnit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Base Quantity:</span>
                            <p className="font-medium">
                              {calculateBaseQuantity(newItemQuantity, getConversionFactor(selectedProduct, newItemUnit))} {selectedProduct.base_unit}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium text-lg">
                              ₦{(newItemQuantity * getUnitPrice(selectedProduct, newItemUnit)).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Conversion: 1 {newItemUnit} = {getConversionFactor(selectedProduct, newItemUnit)} {selectedProduct.base_unit}
                        </div>
                      </div>
                    )}

                    <Button onClick={addToSale} className="w-full" disabled={!newItemUnit}>
                      Add to Sale
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Current Sale Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Current Sale
                </CardTitle>
                <CardDescription>
                  Items in current sale with unit details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {saleItems.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Qty & Unit</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.base_quantity} {item.product.base_unit} (base)
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{item.quantity} {item.unit_used}</p>
                                <p className="text-xs text-muted-foreground">
                                  @ ₦{item.unit_price.toLocaleString()}/{item.unit_used}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₦{item.total_price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromSale(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>₦{getTotalSale().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No items in sale yet</p>
                    <p className="text-sm">Add products to see them here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}