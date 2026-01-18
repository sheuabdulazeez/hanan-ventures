"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Trash2,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Smartphone,
  Package,
  ShoppingCart,
  X,
  Trophy,
  History,
  LayoutGrid,
  TrendingUp,
  Receipt
} from "lucide-react";
import { toast } from "sonner";
import { getProducts } from "@/database/products";
import { getCustomers, ensureWalkInCustomer, createCustomer } from "@/database/customers";
import { TCustomer } from "@/types/database";
import { CustomerSelect } from "@/components/CustomerSelect";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Database Schema Types (matching migration)
type CommonUnit = {
  id: string;
  name: string;
  abbrev: string;
  related_units: string[];
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
  unit?: CommonUnit;
};

type Product = {
  id: string;
  name: string;
  category: string;
  base_unit: string;
  cost_price: number;
  quantity_on_hand: number;
  created_at: string;
  updated_at: string;
  product_units: ProductUnit[];
  base_unit_info?: CommonUnit;
};

type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_used: string;
  unit_price: number;
  base_quantity: number;
  total_price: number;
  product?: Product;
  unit_info?: CommonUnit;
};

type Sale = {
  id: string;
  customer_name?: string;
  table_number?: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'wallet';
  status: 'completed' | 'cancelled';
  created_at: string;
  sale_items: SaleItem[];
};

const DEMO_COMMON_UNITS: CommonUnit[] = [
  { id: "unit_kg", name: "Kilogram", abbrev: "kg", related_units: ["unit_g", "unit_bag"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_g", name: "Gram", abbrev: "g", related_units: ["unit_kg"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_pk", name: "Pack", abbrev: "pk", related_units: ["unit_pc", "unit_ctn"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_pc", name: "Piece", abbrev: "pc", related_units: ["unit_pk"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "unit_bag", name: "Bag", abbrev: "bag", related_units: ["unit_kg"], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const DEMO_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Golden Penny Flour",
    category: "FLOUR",
    base_unit: "unit_kg",
    cost_price: 64000,
    quantity_on_hand: 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    base_unit_info: DEMO_COMMON_UNITS[0],
    product_units: [
      { id: "pu1", product_id: "p1", unit_id: "unit_bag", conversion_to_base: 50, selling_price: 69000, is_primary: true, created_at: "", updated_at: "", unit: DEMO_COMMON_UNITS[4] },
      { id: "pu2", product_id: "p1", unit_id: "unit_kg", conversion_to_base: 1, selling_price: 1380, is_primary: false, created_at: "", updated_at: "", unit: DEMO_COMMON_UNITS[0] }
    ]
  }
];

const CATEGORIES = [
  { id: "FLOUR", name: "Flour", icon: "🌾", color: "bg-green-100 text-green-700" },
  { id: "DRINKS", name: "Drinks", icon: "🥤", color: "bg-purple-100 text-purple-700" },
  { id: "GRAINS", name: "Grains", icon: "🌾", color: "bg-blue-100 text-blue-700" },
  { id: "SNACKS", name: "Snacks", icon: "🍿", color: "bg-pink-100 text-pink-700" }
];

export default function UnitPriceDemo() {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [commonUnits] = useState<CommonUnit[]>(DEMO_COMMON_UNITS);
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<TCustomer | null>(null);
  const [customers, setCustomers] = useState<TCustomer[]>([]);
  const [isCheckout, setIsCheckout] = useState(false);
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);

  const { auth } = useAppStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await ensureWalkInCustomer();
        const customersRes = await getCustomers();
        setCustomers(customersRes);
        const walkIn = customersRes.find(c => c.name.toLowerCase().includes("walk-in"));
        if (walkIn) setSelectedCustomer(walkIn);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getSubtotal = () => currentSale.reduce((sum, item) => sum + item.total_price, 0);
  const getTax = () => getSubtotal() * 0.1;
  const getTotal = () => getSubtotal() + getTax();

  const addToSale = (product: Product, unitId?: string) => {
    const primaryUnit = product.product_units.find(pu => pu.is_primary);
    const targetUnitId = unitId || primaryUnit?.unit_id;
    if (!targetUnitId) return;

    const productUnit = product.product_units.find(pu => pu.unit_id === targetUnitId);
    if (!productUnit) return;

    const existingIndex = currentSale.findIndex(item => item.product_id === product.id && item.unit_used === targetUnitId);

    if (existingIndex >= 0) {
      const updated = [...currentSale];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * productUnit.selling_price;
      setCurrentSale(updated);
    } else {
      setCurrentSale([...currentSale, {
        id: Math.random().toString(),
        product_id: product.id,
        quantity: 1,
        unit_used: targetUnitId,
        unit_price: productUnit.selling_price,
        base_quantity: productUnit.conversion_to_base,
        total_price: productUnit.selling_price,
        product,
        unit_info: commonUnits.find(u => u.id === targetUnitId)
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCurrentSale(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty === 0) return null;
        return { ...item, quantity: newQty, total_price: newQty * item.unit_price };
      }
      return item;
    }).filter(Boolean) as SaleItem[]);
  };

  const completeSale = () => {
    setSales([{
      id: Math.random().toString(),
      customer_name: selectedCustomer?.name,
      total_amount: getTotal(),
      payment_method: 'cash',
      status: 'completed',
      created_at: new Date().toISOString(),
      sale_items: currentSale
    }, ...sales]);
    setCurrentSale([]);
    setIsCheckout(false);
    toast.success("Transaction completed successfully");
  };

  const filteredProducts = products.filter(p =>
    (selectedCategory === "ALL" || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Tabs defaultValue="pos" className="w-full">
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-6">
            <TabsList className="h-16 bg-transparent flex gap-8 p-0">
              <TabsTrigger value="pos" className="h-16 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-slate-900 border-b-2 border-transparent data-[state=active]:border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">Matrix Terminal</TabsTrigger>
              <TabsTrigger value="catalog" className="h-16 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-slate-900 border-b-2 border-transparent data-[state=active]:border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">Product Catalog</TabsTrigger>
              <TabsTrigger value="history" className="h-16 px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-slate-900 border-b-2 border-transparent data-[state=active]:border-slate-900 rounded-none font-black uppercase tracking-widest text-[10px]">Historical Data</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="pos" className="m-0 border-0 outline-none">
          <div className="flex bg-white h-[calc(100vh-64px)] overflow-hidden">
            {/* Catalog Grid */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-slate-50/30">
              <div className="p-6 bg-white border-b border-slate-200">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sales Matrix</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select items for transaction</p>
                    </div>
                    <div className="relative w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search matrix..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 font-bold text-sm rounded-xl focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={selectedCategory === "ALL" ? "default" : "outline"}
                      onClick={() => setSelectedCategory("ALL")}
                      className={cn(
                        "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest",
                        selectedCategory === "ALL" ? "bg-slate-900 text-white" : "border-slate-200 text-slate-500 hover:text-slate-900"
                      )}
                    >
                      All Items
                    </Button>
                    {CATEGORIES.map(cat => (
                      <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? "default" : "outline"}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2",
                          selectedCategory === cat.id ? "bg-slate-900 text-white" : "border-slate-200 text-slate-500 hover:text-slate-900"
                        )}
                      >
                        <span>{cat.icon}</span>
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(p => {
                    const primary = p.product_units.find(pu => pu.is_primary);
                    return (
                      <motion.div
                        key={p.id}
                        whileHover={{ y: -4 }}
                        onClick={() => addToSale(p)}
                        className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-900 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest px-2">{p.quantity_on_hand} {p.base_unit_info?.abbrev}</Badge>
                          <Trophy className="w-4 h-4 text-slate-200 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <h3 className="font-black text-slate-900 text-sm uppercase leading-tight mb-2">{p.name}</h3>
                        <div className="flex items-baseline gap-1 mt-auto">
                          <span className="text-lg font-black text-slate-900">{formatCurrency(primary?.selling_price || 0)}</span>
                          <span className="text-[10px] font-bold text-slate-400">/ {primary?.unit?.abbrev}</span>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur p-4 border-t border-slate-100 transform translate-y-full group-hover:translate-y-0 transition-transform flex gap-2 justify-center">
                          {p.product_units.map(unit => (
                            <Button
                              key={unit.id}
                              variant="outline"
                              size="sm"
                              className="h-7 text-[8px] font-black uppercase tracking-widest px-2 border-slate-200 hover:bg-slate-900 hover:text-white"
                              onClick={(e) => { e.stopPropagation(); addToSale(p, unit.unit_id); }}
                            >
                              {unit.unit?.abbrev}
                            </Button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cart Panel */}
            <div className="w-96 flex flex-col bg-white border-l border-slate-200 shadow-2xl z-20">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-200">Active Order</div>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-slate-400"><History className="w-3 h-3 mr-2" /> Recent</Button>
                  </div>
                  <CustomerSelect
                    customers={customers}
                    selectedCustomer={selectedCustomer}
                    onSelect={setSelectedCustomer}
                    onAddNew={async name => {
                      const c = await createCustomer({ id: Math.random().toString(), name, email: "", phone: "", address: "", created_at: "", updated_at: "" });
                      setCustomers([...customers, c as any]);
                      setSelectedCustomer(c as any);
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white/50 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {currentSale.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 py-32 opacity-30">
                      <LayoutGrid className="w-12 h-12" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Matrix Offline</p>
                    </div>
                  ) : (
                    currentSale.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm group hover:border-slate-200 transition-all"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-4">
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center">{idx + 1}</span>
                            <div>
                              <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{item.product?.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{formatCurrency(item.unit_price)} / {item.unit_info?.abbrev}</p>
                            </div>
                          </div>
                          <p className="font-black text-slate-900 text-xs">{formatCurrency(item.total_price)}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="w-8 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><Plus className="w-3 h-3" /></button>
                          </div>
                          <button onClick={() => updateQuantity(item.id, -item.quantity)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 bg-slate-900 text-white">
                <div className="space-y-2 mb-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex justify-between"><span>Computation Subtotal</span><span className="text-white">{formatCurrency(getSubtotal())}</span></div>
                  <div className="flex justify-between"><span>Adaptive Tax (10%)</span><span className="text-white">{formatCurrency(getTax())}</span></div>
                  <div className="flex justify-between items-end pt-4 border-t border-slate-800">
                    <span className="text-slate-500">Total Synthesis</span>
                    <span className="text-3xl font-black text-white">{formatCurrency(getTotal())}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentSale([])} className="bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white h-12 w-12 p-0"><Trash2 className="w-4 h-4" /></Button>
                  <Button onClick={completeSale} disabled={currentSale.length === 0} className="flex-1 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase tracking-widest h-12 text-xs shadow-xl shadow-black/20">Finalize Transaction</Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="p-10 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Master Catalog</h2>
              <p className="text-slate-500 font-medium mt-1">Global inventory and unit synchronization matrices.</p>
            </div>
            <Button className="h-12 px-8 bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 rounded-xl">Initialize New Node</Button>
          </div>

          <div className="grid gap-8">
            {products.map(p => (
              <Card key={p.id} className="border-slate-200 bg-white shadow-sm overflow-hidden rounded-3xl group">
                <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {CATEGORIES.find(c => c.id === p.category)?.icon || "📦"}
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{p.name}</CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                          {p.category} NODE // BASE: {p.base_unit_info?.name} // QUANTITY: {p.quantity_on_hand}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full">Primary {p.product_units.find(pu => pu.is_primary)?.unit?.abbrev}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white border-transparent">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14 px-8">Operational Unit</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yield Coefficient</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Market Valuation</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Vectors</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-8 text-right">Protocol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.product_units.map(unit => (
                        <TableRow key={unit.id} className="hover:bg-slate-50 border-slate-50 transition-colors">
                          <TableCell className="px-8 py-5">
                            <p className="font-black text-slate-900 text-sm uppercase">{unit.unit?.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">({unit.unit?.abbrev}) Identifier</p>
                          </TableCell>
                          <TableCell className="font-bold text-slate-600 text-xs">1:{unit.conversion_to_base}</TableCell>
                          <TableCell className="font-black text-slate-900 text-sm">{formatCurrency(unit.selling_price)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-200 text-slate-400 text-[9px] font-black uppercase px-2">{Math.floor(p.quantity_on_hand / unit.conversion_to_base)} Stock</Badge>
                          </TableCell>
                          <TableCell className="px-8 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-slate-200 hover:text-slate-900 hover:bg-white shadow-none"><TrendingUp className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="p-10 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">History Matrix</h2>
              <p className="text-slate-500 font-medium mt-1">Archived synthesis protocols and transaction sequences.</p>
            </div>
          </div>

          <div className="grid gap-6">
            {sales.map(s => (
              <Card key={s.id} className="border-slate-200 bg-white hover:border-slate-300 transition-all overflow-hidden rounded-3xl">
                <div className="p-8 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
                  <div className="flex gap-6 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{s.customer_name}</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(s.created_at).toLocaleString()} // SYNC COMPLETE</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(s.total_amount)}</p>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase tracking-[0.2em] mt-2">Verified Transaction</Badge>
                  </div>
                </div>
              </Card>
            ))}
            {sales.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center text-slate-300 gap-6 opacity-30">
                <History className="w-16 h-16" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">Historical Buffer Empty</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}