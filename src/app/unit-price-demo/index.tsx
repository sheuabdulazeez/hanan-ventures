"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Edit, Trash2, Plus, Minus, DollarSign, CreditCard, Smartphone, Package, ShoppingCart, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getProducts } from "@/database/products";
import { getCustomers, ensureWalkInCustomer, createCustomer } from "@/database/customers";
import { createSale } from "@/database/sales";
import { TCustomer, TProduct } from "@/types/database";
import { CustomerSelect } from "@/components/CustomerSelect";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Database Schema Types (matching migration)
type CommonUnit = {
  id: string;
  name: string;
  abbrev: string;
  related_units: string[]; // JSON array of related unit IDs
  created_at: string;
  updated_at: string;
};

type ProductUnit = {
  id: string;
  product_id: string;
  unit_id: string;
  conversion_to_base: number;
  selling_price: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  unit?: CommonUnit; // Populated via join
};

type Product = {
  id: string;
  name: string;
  category: string;
  base_unit: string; // References common_units.id
  cost_price: number;
  quantity_on_hand: number;
  created_at: string;
  updated_at: string;
  product_units: ProductUnit[];
  base_unit_info?: CommonUnit; // Populated via join
};

type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_used: string; // References common_units.id
  unit_price: number;
  base_quantity: number;
  total_price: number;
  product?: Product; // Populated via join
  unit_info?: CommonUnit; // Populated via join
};

type Sale = {
  id: string;
  customer_name?: string;
  table_number?: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'wallet';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  sale_items: SaleItem[];
};

// Demo Common Units (matching migration)
const DEMO_COMMON_UNITS: CommonUnit[] = [
  { id: "unit_kg", name: "Kilogram", abbrev: "kg", related_units: ["unit_g", "unit_bag"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_g", name: "Gram", abbrev: "g", related_units: ["unit_kg"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_l", name: "Liter", abbrev: "L", related_units: ["unit_ml", "unit_btl"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_ml", name: "Milliliter", abbrev: "mL", related_units: ["unit_l"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_pc", name: "Piece", abbrev: "pc", related_units: ["unit_pk", "unit_dz"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_pk", name: "Pack", abbrev: "pk", related_units: ["unit_pc", "unit_ctn"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_ctn", name: "Carton", abbrev: "ctn", related_units: ["unit_pk", "unit_pc"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_dz", name: "Dozen", abbrev: "dz", related_units: ["unit_pc"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_bag", name: "Bag", abbrev: "bag", related_units: ["unit_kg"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_btl", name: "Bottle", abbrev: "btl", related_units: ["unit_l"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_sct", name: "Sachet", abbrev: "sct", related_units: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_box", name: "Box", abbrev: "box", related_units: ["unit_pc"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// Demo Products with proper database structure
const DEMO_PRODUCTS: Product[] = [
  {
    id: "prod_1",
    name: "GP Flour",
    category: "FLOUR",
    base_unit: "unit_kg",
    cost_price: 64000,
    quantity_on_hand: 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    base_unit_info: DEMO_COMMON_UNITS.find(u => u.id === "unit_kg"),
    product_units: [
      {
        id: "pu_1_1",
        product_id: "prod_1",
        unit_id: "unit_bag",
        conversion_to_base: 50,
        selling_price: 69000,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_bag")
      },
      {
        id: "pu_1_2",
        product_id: "prod_1",
        unit_id: "unit_kg",
        conversion_to_base: 1,
        selling_price: 1380,
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_kg")
      }
    ]
  },
  {
    id: "prod_2",
    name: "Coca Cola",
    category: "DRINKS",
    base_unit: "unit_pc",
    cost_price: 2400,
    quantity_on_hand: 240,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    base_unit_info: DEMO_COMMON_UNITS.find(u => u.id === "unit_pc"),
    product_units: [
      {
        id: "pu_2_1",
        product_id: "prod_2",
        unit_id: "unit_pk",
        conversion_to_base: 12,
        selling_price: 2800,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_pk")
      },
      {
        id: "pu_2_2",
        product_id: "prod_2",
        unit_id: "unit_pc",
        conversion_to_base: 1,
        selling_price: 250,
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_pc")
      },
      {
        id: "pu_2_3",
        product_id: "prod_2",
        unit_id: "unit_ctn",
        conversion_to_base: 24,
        selling_price: 5400,
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_ctn")
      }
    ]
  },
  {
    id: "prod_3",
    name: "Rice (Local)",
    category: "GRAINS",
    base_unit: "unit_kg",
    cost_price: 45000,
    quantity_on_hand: 200,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    base_unit_info: DEMO_COMMON_UNITS.find(u => u.id === "unit_kg"),
    product_units: [
      {
        id: "pu_3_1",
        product_id: "prod_3",
        unit_id: "unit_bag",
        conversion_to_base: 50,
        selling_price: 52000,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_bag")
      },
      {
        id: "pu_3_2",
        product_id: "prod_3",
        unit_id: "unit_kg",
        conversion_to_base: 1,
        selling_price: 1040,
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: DEMO_COMMON_UNITS.find(u => u.id === "unit_kg")
      }
    ]
  }
];

// Categories for POS interface
const CATEGORIES = [
  { id: "FLOUR", name: "Flour", icon: "🌾", color: "bg-green-200" },
  { id: "DRINKS", name: "Drinks", icon: "🥤", color: "bg-purple-200" },
  { id: "GRAINS", name: "Grains", icon: "🌾", color: "bg-blue-200" },
  { id: "DAIRY", name: "Dairy", icon: "🥛", color: "bg-yellow-200" },
  { id: "SNACKS", name: "Snacks", icon: "🍿", color: "bg-pink-200" },
  { id: "SPICES", name: "Spices", icon: "🌶️", color: "bg-red-200" }
];

export default function UnitPriceDemo() {
  // State Management
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [commonUnits] = useState<CommonUnit[]>(DEMO_COMMON_UNITS);
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [selectedCustomer, setSelectedCustomer] = useState<TCustomer | null>(null);
  const [customers, setCustomers] = useState<TCustomer[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);

  const { auth } = useAppStore();

  // Load real data
  useState(() => {
    const loadData = async () => {
      try {
        await ensureWalkInCustomer();
        const [customersRes, productsRes] = await Promise.all([
          getCustomers(),
          getProducts()
        ]);
        setCustomers(customersRes);
        const walkIn = customersRes.find(c => c.name.toLowerCase().includes("walk-in"));
        if (walkIn) {
          setSelectedCustomer(walkIn);
        }

        // Map real products to Demo formats if needed, or just use real products
        // For the sake of the demo, we'll keep using DEMO_PRODUCTS but allow adding real ones later
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  });

  // Product Creation State
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    base_unit: "",
    cost_price: 0,
    quantity_on_hand: 0
  });
  const [newProductUnits, setNewProductUnits] = useState<Omit<ProductUnit, 'id' | 'product_id' | 'created_at' | 'updated_at'>[]>([]);

  // Helper Functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getProductUnit = (product: Product, unitId: string): ProductUnit | undefined => {
    return product.product_units.find(pu => pu.unit_id === unitId);
  };

  const getAvailableStock = (product: Product, unitId: string): number => {
    const productUnit = getProductUnit(product, unitId);
    if (!productUnit) return 0;
    return Math.floor(product.quantity_on_hand / productUnit.conversion_to_base);
  };

  const getPrimaryUnit = (product: Product): ProductUnit | undefined => {
    return product.product_units.find(pu => pu.is_primary);
  };

  const getRelatedUnits = (unitId: string): CommonUnit[] => {
    const unit = commonUnits.find(u => u.id === unitId);
    if (!unit) return [];
    return commonUnits.filter(u => unit.related_units.includes(u.id));
  };

  const addPayment = (method: string) => {
    // Prevent duplicate methods in the list for clarity
    if (payments.find(p => p.method === method)) return;

    const remaining = getTotal() - payments.reduce((sum, p) => sum + p.amount, 0);
    if (remaining <= 0) return;
    setPayments([...payments, { method, amount: remaining }]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePaymentAmount = (index: number, amount: number) => {
    const newPayments = [...payments];
    newPayments[index].amount = amount;
    setPayments(newPayments);
  };

  // Product Management Functions
  const addProductUnit = () => {
    setNewProductUnits([...newProductUnits, {
      unit_id: '',
      conversion_to_base: 1,
      selling_price: 0,
      is_primary: false
    }]);
  };

  const removeProductUnit = (index: number) => {
    setNewProductUnits(newProductUnits.filter((_, i) => i !== index));
  };

  const updateProductUnit = (index: number, field: keyof Omit<ProductUnit, 'id' | 'product_id' | 'created_at' | 'updated_at'>, value: any) => {
    const updatedUnits = [...newProductUnits];
    updatedUnits[index] = { ...updatedUnits[index], [field]: value };
    setNewProductUnits(updatedUnits);
  };

  const createProduct = () => {
    if (!newProduct.name || !newProduct.category || !newProduct.base_unit) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (newProductUnits.length === 0) {
      toast({ title: "Error", description: "Please add at least one selling unit", variant: "destructive" });
      return;
    }

    if (!newProductUnits.some(unit => unit.is_primary)) {
      toast({ title: "Error", description: "Please mark one unit as primary", variant: "destructive" });
      return;
    }

    const productId = `prod_${Date.now()}`;
    const product: Product = {
      id: productId,
      name: newProduct.name,
      category: newProduct.category,
      base_unit: newProduct.base_unit,
      cost_price: newProduct.cost_price,
      quantity_on_hand: newProduct.quantity_on_hand,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      base_unit_info: commonUnits.find(u => u.id === newProduct.base_unit),
      product_units: newProductUnits.map((unit, index) => ({
        id: `pu_${productId}_${index}`,
        product_id: productId,
        unit_id: unit.unit_id,
        conversion_to_base: unit.conversion_to_base,
        selling_price: unit.selling_price,
        is_primary: unit.is_primary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit: commonUnits.find(u => u.id === unit.unit_id)
      }))
    };

    setProducts([...products, product]);
    setNewProduct({ name: "", category: "", base_unit: "", cost_price: 0, quantity_on_hand: 0 });
    setNewProductUnits([]);
    toast({ title: "Success", description: "Product created successfully!" });
  };

  // Sales Functions
  const addToSale = (product: Product, unitId?: string) => {
    const targetUnitId = unitId || getPrimaryUnit(product)?.unit_id;
    if (!targetUnitId) {
      toast({ title: "Error", description: "No units available for this product", variant: "destructive" });
      return;
    }

    const productUnit = getProductUnit(product, targetUnitId);
    if (!productUnit) {
      toast({ title: "Error", description: "Selected unit not available", variant: "destructive" });
      return;
    }

    // Check if item already exists in current sale
    const existingItemIndex = currentSale.findIndex(
      item => item.product_id === product.id && item.unit_used === targetUnitId
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      const updatedSale = [...currentSale];
      const existingItem = updatedSale[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      const newBaseQuantity = newQuantity * productUnit.conversion_to_base;

      updatedSale[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        base_quantity: newBaseQuantity,
        total_price: newQuantity * productUnit.selling_price
      };
      setCurrentSale(updatedSale);
    } else {
      // Add new item
      const newItem: SaleItem = {
        id: `si_${Date.now()}`,
        product_id: product.id,
        quantity: 1,
        unit_used: targetUnitId,
        unit_price: productUnit.selling_price,
        base_quantity: productUnit.conversion_to_base,
        total_price: productUnit.selling_price,
        product,
        unit_info: commonUnits.find(u => u.id === targetUnitId)
      };
      setCurrentSale([...currentSale, newItem]);
    }

    toast({ title: "Added to order", description: `${product.name} added to current order` });
  };

  const updateSaleItemQuantity = (itemId: string, change: number) => {
    setCurrentSale(items =>
      items.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, item.quantity + change);
          if (newQuantity === 0) {
            return null; // Will be filtered out
          }
          const productUnit = getProductUnit(item.product!, item.unit_used);
          if (!productUnit) return item;

          return {
            ...item,
            quantity: newQuantity,
            base_quantity: newQuantity * productUnit.conversion_to_base,
            total_price: newQuantity * productUnit.selling_price
          };
        }
        return item;
      }).filter(Boolean) as SaleItem[]
    );
  };

  const removeFromSale = (itemId: string) => {
    setCurrentSale(items => items.filter(item => item.id !== itemId));
  };

  const getSubtotal = () => {
    return currentSale.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.1; // 10% tax
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
  };

  const completeSale = async () => {
    if (currentSale.length === 0) {
      toast({ title: "Error", description: "No items in current sale", variant: "destructive" });
      return;
    }

    if (!selectedCustomer) {
      toast({ title: "Error", description: "Please select a customer", variant: "destructive" });
      return;
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < getTotal()) {
      toast({ title: "Error", description: "Payment incomplete", variant: "destructive" });
      return;
    }

    try {
      // Prepare sale items for database
      const dbSaleItems = currentSale.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        cost_price_at_sale: item.product?.cost_price || 0,
        profit: item.total_price - (item.quantity * (item.product?.cost_price || 0))
      }));

      // Prepare sale data
      const saleData = {
        customer_id: selectedCustomer.id,
        employee_id: auth.user.id,
        total_amount: getTotal(),
        discount: 0,
        total_cost: dbSaleItems.reduce((sum, item) => sum + (item.quantity * item.cost_price_at_sale), 0),
        gross_profit: dbSaleItems.reduce((sum, item) => sum + item.profit, 0),
        payments: payments.map(p => ({
          payment_method: p.method as any,
          amount: p.amount,
          bank_name: "main",
          reference_number: ""
        })),
        sale_date: new Date().toISOString(),
      };

      // In a real app, we'd call createSale here
      // await createSale(saleData, dbSaleItems);

      const sale: Sale = {
        id: `sale_${Date.now()}`,
        customer_name: selectedCustomer.name,
        table_number: tableNumber,
        total_amount: getTotal(),
        payment_method: payments[0]?.method as any || 'cash',
        status: 'completed',
        created_at: new Date().toISOString(),
        sale_items: currentSale
      };

      setSales([sale, ...sales]);
      setCurrentSale([]);
      setPayments([]);
      setIsCheckout(false);
      toast({ title: "Sale Completed", description: `Sale total: ${formatCurrency(getTotal())}` });
    } catch (error) {
      console.error("Sale completion failed:", error);
      toast({ title: "Error", description: "Failed to complete sale", variant: "destructive" });
    }
  };

  const clearSale = () => {
    setCurrentSale([]);
  };

  // Filter products for POS interface
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "ALL" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="pos" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pos">POS Terminal</TabsTrigger>
          <TabsTrigger value="products">Product Management</TabsTrigger>
          <TabsTrigger value="add-product">Add Product</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
        </TabsList>

        {/* POS Terminal Interface */}
        <TabsContent value="pos" className="p-0 h-[calc(100vh-60px)] outline-none data-[state=inactive]:hidden">
          <div className="h-full bg-gray-950 text-gray-100 flex overflow-hidden font-sans">
            {/* Left Panel - Categories and Products */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
              {/* Header / Search */}
              <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-800 border-gray-700 text-sm focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {/* Categories Grid - Smaller and more compact */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Categories</h3>
                    <button className="text-[10px] text-blue-400 font-medium hover:underline">View All</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory("ALL")}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-semibold
                        ${selectedCategory === "ALL"
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700/50'}
                      `}
                    >
                      <span className="text-sm">📦</span>
                      <span>All Items</span>
                    </button>
                    {CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`
                          flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-semibold
                          ${selectedCategory === category.id
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700/50'}
                        `}
                      >
                        <span className={cn(
                          "flex items-center justify-center w-5 h-5 rounded-md text-[10px]",
                          selectedCategory === category.id ? "bg-white/20" : category.color,
                          selectedCategory === category.id ? "text-white" : "text-gray-900"
                        )}>
                          {category.icon}
                        </span>
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Grid */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                    {selectedCategory === "ALL" ? "All Products" : CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => {
                      const primaryUnit = getPrimaryUnit(product);
                      const stock = primaryUnit ? getAvailableStock(product, primaryUnit.unit_id) : 0;
                      const isLowStock = stock < 10;

                      return (
                        <div
                          key={product.id}
                          className="group bg-gray-800 rounded-xl p-4 border border-gray-700/50 hover:border-gray-500 hover:bg-gray-750 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden"
                          onClick={() => addToSale(product)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <Badge
                              variant={isLowStock ? "destructive" : "secondary"}
                              className={`text-[10px] px-2 py-0.5 h-auto ${isLowStock ? '' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                            >
                              {stock} {primaryUnit?.unit?.abbrev}
                            </Badge>
                          </div>

                          <h3 className="font-semibold text-gray-100 mb-1 leading-tight min-h-[2.5rem] line-clamp-2">
                            {product.name}
                          </h3>

                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-lg font-bold text-blue-400">
                              {primaryUnit ? formatCurrency(primaryUnit.selling_price) : 'N/A'}
                            </span>
                            <span className="text-xs text-gray-500">
                              /{primaryUnit?.unit?.abbrev}
                            </span>
                          </div>

                          {/* Quick Unit Selection - Hover Overlay */}
                          <div className="absolute inset-x-0 bottom-0 bg-gray-900/95 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex flex-wrap gap-2 justify-center border-t border-gray-700">
                            {product.product_units.map((productUnit) => (
                              <Button
                                key={productUnit.id}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToSale(product, productUnit.unit_id);
                                }}
                                className="h-7 text-xs px-2 bg-gray-800 border-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-500"
                              >
                                {productUnit.unit?.abbrev}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Order Summary */}
            <div className="w-96 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl z-20">
              {/* Order Header */}
              <div className="p-5 border-b border-gray-800 bg-gray-800/30">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      Active Order
                    </div>
                    {isCheckout && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCheckout(false)}
                        className="h-7 text-[11px] text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Back to Cart
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[11px] text-gray-500 uppercase font-bold tracking-widest pl-1">Customer</Label>
                    <div className="customer-select-pos dark">
                      <CustomerSelect
                        customers={customers}
                        selectedCustomer={selectedCustomer}
                        onSelect={(customer) => setSelectedCustomer(customer)}
                        onAddNew={async (name) => {
                          const newCust: TCustomer = {
                            id: Math.random().toString(36).substr(2, 9),
                            name,
                            email: "",
                            phone: "",
                            address: "",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          };
                          await createCustomer(newCust);
                          const updated = await getCustomers();
                          setCustomers(updated);
                          const found = updated.find(c => c.name === name);
                          if (found) setSelectedCustomer(found);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Content - Cart or Checkout */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!isCheckout ? (
                  // Cart List
                  <div className="space-y-3">
                    {currentSale.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 py-20 opacity-50">
                        <ShoppingCart className="w-12 h-12" />
                        <p className="text-sm">No items in order</p>
                      </div>
                    ) : (
                      currentSale.map((item, index) => (
                        <div key={item.id} className="group flex flex-col bg-gray-800/50 rounded-lg p-3 border border-gray-800 hover:border-gray-700 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-gray-300 text-xs font-medium mt-0.5">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-200 text-sm leading-tight">{item.product?.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatCurrency(item.unit_price)} / {item.unit_info?.abbrev}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-gray-200 text-sm">{formatCurrency(item.total_price)}</span>
                          </div>

                          <div className="flex items-center justify-between pl-8">
                            <div className="flex items-center bg-gray-900 rounded-md border border-gray-700">
                              <button
                                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-l transition-colors"
                                onClick={() => updateSaleItemQuantity(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-medium text-gray-300">{item.quantity}</span>
                              <button
                                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-r transition-colors"
                                onClick={() => updateSaleItemQuantity(item.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              className="text-gray-500 hover:text-red-400 transition-colors p-1"
                              onClick={() => removeFromSale(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  // Checkout View - Split Payments
                  <div className="space-y-6 slide-in-bottom">
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Remaining Balance</span>
                        <span className="text-3xl font-black text-white">
                          {formatCurrency(Math.max(0, getTotal() - payments.reduce((sum, p) => sum + p.amount, 0)))}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] text-gray-500 uppercase font-bold tracking-widest pl-1">Payment Methods</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'cash', icon: DollarSign, label: 'Cash', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
                            { id: 'card', icon: CreditCard, label: 'Card', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
                            { id: 'transfer', icon: Smartphone, label: 'Transfer', color: 'bg-purple-600/20 text-purple-400 border-purple-500/30' }
                          ].map((method) => (
                            <button
                              key={method.id}
                              onClick={() => addPayment(method.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                                method.color,
                                "hover:bg-opacity-30"
                              )}
                            >
                              <method.icon className="w-5 h-5 mb-1" />
                              <span className="text-[10px] items-center font-bold tracking-wider uppercase">{method.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {payments.map((payment, index) => (
                          <div key={index} className="flex items-center gap-2 bg-gray-800/80 p-3 rounded-xl border border-gray-700 shadow-sm animate-in fade-in slide-in-from-right-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                  {payment.method === 'cash' && <DollarSign className="w-3 h-3" />}
                                  {payment.method === 'card' && <CreditCard className="w-3 h-3" />}
                                  {payment.method === 'transfer' && <Smartphone className="w-3 h-3" />}
                                  {payment.method}
                                </span>
                                <button
                                  onClick={() => removePayment(index)}
                                  className="text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">₦</span>
                                <Input
                                  type="number"
                                  value={payment.amount}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updatePaymentAmount(index, parseFloat(e.target.value) || 0)}
                                  className="bg-gray-900 border-gray-700 text-white pl-7 font-mono text-lg font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Pay Buttons */}
                      {payments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {[500, 1000, 2000, 5000, 10000].map(amount => (
                            <button
                              key={amount}
                              onClick={() => {
                                const lastIdx = payments.length - 1;
                                updatePaymentAmount(lastIdx, (payments[lastIdx].amount || 0) + amount);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-[11px] font-bold text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                              +{amount.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer / Summary */}
              <div className="p-5 bg-gray-800 border-t border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Tax (10%)</span>
                    <span>{formatCurrency(getTax())}</span>
                  </div>
                  <div className="flex justify-between items-end pt-3 border-t border-gray-700/50">
                    <span className="text-gray-300 font-medium">Total Amount</span>
                    <span className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                      {formatCurrency(getTotal())}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-2">
                  {!isCheckout ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={clearSale}
                        className="col-span-1 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 hover:border-gray-500"
                        title="Clear Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setIsCheckout(true)}
                        className="col-span-3 bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/50 transition-all hover:translate-y-[-1px]"
                        disabled={currentSale.length === 0}
                      >
                        Checkout Order
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={completeSale}
                      className="col-span-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/50 transition-all hover:translate-y-[-1px] h-12 text-lg"
                      disabled={payments.reduce((sum, p) => sum + p.amount, 0) < getTotal()}
                    >
                      Complete Sale (Split)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Product Management */}
        <TabsContent value="products" className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Management
              </CardTitle>
              <CardDescription>
                Manage products and their unit configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {products.map((product) => (
                  <Card key={product.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription>
                            Category: {product.category} | Base Unit: {product.base_unit_info?.name} |
                            Stock: {product.quantity_on_hand} {product.base_unit_info?.abbrev}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {getPrimaryUnit(product)?.unit?.abbrev}
                        </Badge>
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
                          {product.product_units.map((productUnit) => (
                            <TableRow key={productUnit.id}>
                              <TableCell className="font-medium">
                                {productUnit.unit?.name} ({productUnit.unit?.abbrev})
                              </TableCell>
                              <TableCell>
                                1 {productUnit.unit?.abbrev} = {productUnit.conversion_to_base} {product.base_unit_info?.abbrev}
                              </TableCell>
                              <TableCell>{formatCurrency(productUnit.selling_price)}</TableCell>
                              <TableCell>
                                {getAvailableStock(product, productUnit.unit_id)} {productUnit.unit?.abbrev}
                              </TableCell>
                              <TableCell>
                                {productUnit.is_primary ? (
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

        {/* Add Product */}
        <TabsContent value="add-product" className="p-0">
          <div className="max-w-5xl mx-auto py-8 px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Add New Product</h2>
                <p className="text-gray-400 mt-1">Configure your product and its multiple selling units.</p>
              </div>
              <Button onClick={createProduct} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 h-12 shadow-lg shadow-blue-900/40">
                <Plus className="w-5 h-5 mr-2" />
                Create Product
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Basic Info */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    Basic Details
                  </h3>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 font-bold uppercase ml-1">Product Name</Label>
                      <Input
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="e.g. Coca Cola 35cl"
                        className="bg-gray-800/50 border-gray-700 h-11 focus:ring-blue-500/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 font-bold uppercase ml-1">Category</Label>
                      <Select value={newProduct.category} onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 h-11">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id} className="text-gray-300 focus:bg-gray-800">
                              <span className="flex items-center gap-2">
                                <span>{category.icon}</span>
                                {category.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 font-bold uppercase ml-1">Base Tracking Unit</Label>
                      <Select value={newProduct.base_unit} onValueChange={(value) => setNewProduct({ ...newProduct, base_unit: value })}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 h-11">
                          <SelectValue placeholder="e.g. Piece, Sachet" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                          {commonUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id} className="text-gray-300 focus:bg-gray-800">
                              {unit.name} ({unit.abbrev})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-gray-600 italic px-1">This is the smallest unit for inventory tracking.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Inventory & Cost
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 font-bold uppercase ml-1">Cost Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₦</span>
                        <Input
                          type="number"
                          value={newProduct.cost_price}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setNewProduct({ ...newProduct, cost_price: parseFloat(e.target.value) || 0 })}
                          className="bg-gray-800/50 border-gray-700 h-11 pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500 font-bold uppercase ml-1">Opening Stock</Label>
                      <Input
                        type="number"
                        value={newProduct.quantity_on_hand}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setNewProduct({ ...newProduct, quantity_on_hand: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="bg-gray-800/50 border-gray-700 h-11"
                      />
                    </div>
                  </div>
                  {newProduct.base_unit && (
                    <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Currently tracking <span className="text-white font-bold">{newProduct.quantity_on_hand} {commonUnits.find(u => u.id === newProduct.base_unit)?.abbrev || 'units'}</span> in stock.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Multi-Unit Configuration */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white">Selling Units</h3>
                      <p className="text-sm text-gray-500">How do you sell this product? (Singles, Packs, Cartons)</p>
                    </div>
                    <Button
                      onClick={addProductUnit}
                      variant="outline"
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-10 px-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Unit
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {newProductUnits.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl text-gray-600">
                        <Package className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">No selling units added yet.</p>
                        <Button variant="link" onClick={addProductUnit} className="text-blue-500 mt-2">Add your first unit</Button>
                      </div>
                    )}

                    {newProductUnits.map((unit, index) => {
                      const selectedUnit = commonUnits.find(u => u.id === unit.unit_id);
                      const baseUnit = commonUnits.find(u => u.id === newProduct.base_unit);

                      return (
                        <div key={index} className={cn(
                          "relative group bg-gray-800/40 rounded-2xl border transition-all duration-300 p-6",
                          unit.is_primary ? "border-blue-500 shadow-lg shadow-blue-900/20 ring-1 ring-blue-500/20" : "border-gray-800 hover:border-gray-700"
                        )}>
                          {unit.is_primary && (
                            <div className="absolute -top-3 left-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                              Primary Selling Unit
                            </div>
                          )}

                          <button
                            onClick={() => removeProductUnit(index)}
                            className="absolute top-4 right-4 text-gray-600 hover:text-red-400 transition-colors p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            {/* Unit Selection */}
                            <div className="md:col-span-4 space-y-2">
                              <Label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Selling Unit</Label>
                              <Select
                                value={unit.unit_id}
                                onValueChange={(value) => updateProductUnit(index, 'unit_id', value)}
                              >
                                <SelectTrigger className="bg-gray-900/50 border-gray-700 h-12">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800">
                                  {commonUnits.map((commonUnit) => (
                                    <SelectItem key={commonUnit.id} value={commonUnit.id} className="text-gray-300 focus:bg-gray-800">
                                      {commonUnit.name} ({commonUnit.abbrev})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Conversion Logic */}
                            <div className="md:col-span-4 space-y-2">
                              <Label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Composition</Label>
                              <div className="flex items-center gap-2 h-12">
                                <span className="text-gray-500 text-sm whitespace-nowrap">1 {selectedUnit?.abbrev || 'Unit'} =</span>
                                <div className="relative flex-1">
                                  <Input
                                    type="number"
                                    value={unit.conversion_to_base}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => updateProductUnit(index, 'conversion_to_base', parseFloat(e.target.value) || 1)}
                                    className="bg-gray-900/50 border-gray-700 h-12 text-center font-bold"
                                  />
                                </div>
                                <span className="text-gray-500 text-sm whitespace-nowrap">{baseUnit?.abbrev || 'Base'}</span>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="md:col-span-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Price</Label>
                                {unit.selling_price > 0 && newProduct.cost_price > 0 && (
                                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight">
                                    {(unit.selling_price - (newProduct.cost_price * unit.conversion_to_base)) > 0
                                      ? `+${formatCurrency(unit.selling_price - (newProduct.cost_price * unit.conversion_to_base))} profit`
                                      : 'No profit'}
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">₦</span>
                                <Input
                                  type="number"
                                  value={unit.selling_price}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateProductUnit(index, 'selling_price', parseFloat(e.target.value) || 0)}
                                  className="bg-gray-900/50 border-gray-700 h-12 pl-7 font-mono text-lg font-bold text-blue-400"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-800/50">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => {
                                  const updated = newProductUnits.map((u, i) => ({ ...u, is_primary: i === index }));
                                  setNewProductUnits(updated);
                                }}
                                className={cn(
                                  "flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors",
                                  unit.is_primary ? "text-blue-500" : "text-gray-500 hover:text-gray-300"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                  unit.is_primary ? "bg-blue-600 border-blue-600 scale-110" : "border-gray-700"
                                )}>
                                  {unit.is_primary && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                Make Primary unit
                              </button>
                            </div>

                            <p className="text-[10px] text-gray-600 font-medium">
                              {unit.unit_id && unit.conversion_to_base ? (
                                <>Selling 1 {selectedUnit?.name} for {formatCurrency(unit.selling_price)}</>
                              ) : 'Waiting for configuration...'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Create Product Button */}
            <div className="flex justify-end mt-8">
              <Button onClick={createProduct} className="px-8">
                Create Product
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Sales History */}
        <TabsContent value="sales" className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sales History
              </CardTitle>
              <CardDescription>
                View completed sales and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sales recorded yet</p>
                ) : (
                  sales.map((sale) => (
                    <Card key={sale.id} className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {sale.table_number} - {sale.customer_name}
                            </CardTitle>
                            <CardDescription>
                              {new Date(sale.created_at).toLocaleString()} |
                              Payment: {sale.payment_method.toUpperCase()}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(sale.total_amount)}
                            </div>
                            <Badge variant="outline">{sale.status}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sale.sale_items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.product?.name}</TableCell>
                                <TableCell>{item.unit_info?.abbrev}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                <TableCell>{formatCurrency(item.total_price)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}