"use client";

import { useState, useEffect } from "react";
import { CustomerSelect } from "@components/CustomerSelect";
import { ProductSelect } from "@components/ProductSelect";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { ActiveSale, SALE_SaleItem } from "@/types/sales";
import {
  Loader2,
  ShoppingCart,
  Trash2,
  Pause,
  Play,
  X,
  Plus,
  Search,
  Minus,
  DollarSign,
  CreditCard,
  Smartphone,
  Package,
} from "lucide-react";
import { PaymentModal, PaymentDetails } from "@components/SalesPaymentModal";
import { InvoiceModal } from "@components/InvoiceModal";
import { ScrollArea } from "@components/ui/scroll-area";
import { Badge } from "@components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@components/ui/sheet";
import { PaymentMethod, TCustomer, TProduct, TSale } from "@/types/database";
import { getProducts } from "@/database/products";
import { createCustomer, ensureWalkInCustomer, getCustomers } from "@/database/customers";
import { createSale } from "@/database/sales";
import { useAppStore } from "@/lib/store";
import { randomString, cn } from "@/lib/utils";

// --- POS Integration Types ---
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

// Extend TProduct for UI purposes 
type Product = TProduct & {
  product_units: ProductUnit[];
  base_unit_info?: CommonUnit;
  base_unit?: string; // Add this explicitly to satisfy compiler if missing from TProduct
};

const CATEGORIES = [
  { id: "FLOUR", name: "Flour", icon: "🌾", color: "bg-green-200" },
  { id: "DRINKS", name: "Drinks", icon: "🥤", color: "bg-purple-200" },
  { id: "GRAINS", name: "Grains", icon: "🌾", color: "bg-blue-200" },
  { id: "DAIRY", name: "Dairy", icon: "🥛", color: "bg-yellow-200" },
  { id: "SNACKS", name: "Snacks", icon: "🍿", color: "bg-pink-200" },
  { id: "SPICES", name: "Spices", icon: "🌶️", color: "bg-red-200" }
];

export default function CreateSales() {
  const { auth, activeSales, addActiveSale, updateActiveSale, removeActiveSale } = useAppStore();
  const [customers, setCustomers] = useState<TCustomer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(() => activeSales.find(s => s.status === "active")?.id);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails & { sale: TSale & { items: SALE_SaleItem[] } } | null>(
    null
  );

  // POS specific UI state
  const [isCheckout, setIsCheckout] = useState(false);
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    ensureWalkInCustomer().finally(() => {
      Promise.all([
        getCustomers(),
        getProducts()
      ]).then(([customersRes, productsRes]) => {
        setCustomers(customersRes);
        // Cast products to the extended Product type for UI use
        setProducts(productsRes as unknown as Product[]);
      });
    })

  }, []);

  // --- POS Helpers ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getProductUnit = (product: Product, unitId: string): ProductUnit | undefined => {
    return product.product_units?.find(pu => pu.unit_id === unitId);
  };

  const getAvailableStock = (product: Product, unitId: string): number => {
    const productUnit = getProductUnit(product, unitId);
    if (!productUnit) return product.quantity_on_hand; // Fallback to base
    return Math.floor(product.quantity_on_hand / productUnit.conversion_to_base);
  };

  const getPrimaryUnit = (product: Product): ProductUnit | undefined => {
    return product.product_units?.find(pu => pu.is_primary) || (product.product_units?.[0]);
  };

  const addPayment = (method: string) => {
    if (payments.find(p => p.method === method)) return;

    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const total = currentSale.total;
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total - paid;

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




  const createNewSale = () => {
    const newSale: ActiveSale = {
      id: `SALE ${randomString(8)}`,
      customer: null,
      items: [],
      status: "active",
      total: 0,
    };
    addActiveSale(newSale);
    setCurrentSaleId(newSale.id);
  };

  const getCurrentSale = () => {
    return activeSales.find((sale) => sale.id === currentSaleId) || null;
  };

  const handleAddCustomer = async (name: string) => {
    const newCustomer: TCustomer = {
      id: (customers.length + 1).toString(),
      name: name,
      email: "",
      phone: "",
      address: "",
      created_at: new Date().toDateString(),
      updated_at: new Date().toDateString(),
    };
    await createCustomer(newCustomer);
    const updatedCustomers = await getCustomers();
    setCustomers(updatedCustomers);
    toast({
      title: "Success",
      description: `New customer "${name}" created.`,
    });
  };

  const handleAddProduct = (product: Product, unitId?: string) => {
    const currentSale = getCurrentSale();
    if (!currentSale) {
      createNewSale();
      // We might need to wait for state update or just return and let user try again, 
      // but usually getCurrentSale() will find the default active one.
      return;
    }

    const targetUnitId = unitId || getPrimaryUnit(product)?.unit_id || product.base_unit;
    const productUnit = getProductUnit(product, targetUnitId);

    if (!productUnit) {
      toast({ title: "Error", description: "Selected unit not available", variant: "destructive" });
      return;
    }

    const existingItem = currentSale.items.find(
      (item) => item.product_id === product.id && (item as any).unit_used === targetUnitId
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      updateQuantity(currentSale.items.indexOf(existingItem), newQuantity);
    } else {
      const newSaleItem: SALE_SaleItem & { unit_used?: string; unit_info?: CommonUnit } = {
        id: `ITEM${currentSale.items.length + 1}`,
        sale_id: currentSale.id,
        product_id: product.id,
        product: product,
        quantity: 1,
        unit_price: productUnit.selling_price,
        total_price: productUnit.selling_price,
        cost_price_at_sale: product.cost_price, // This should ideally be unit-aware too if stored per-base
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unit_used: targetUnitId,
        unit_info: productUnit.unit
      };

      updateCurrentSale({
        items: [...currentSale.items, newSaleItem],
      });
    }
    toast({ title: "Added to order", description: `${product.name} added` });
  };

  const updateQuantity = (index: number, quantity: number) => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const updatedItems = [...currentSale.items];
    const item = updatedItems[index];

    updatedItems[index].quantity = quantity;
    updatedItems[index].total_price = quantity * item.unit_price;
    updateCurrentSale({ items: updatedItems });
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    updateQuantity(index, quantity);
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const updatedItems = [...currentSale.items];
    updatedItems[index].unit_price = price;
    updatedItems[index].total_price = updatedItems[index].quantity * price;
    updateCurrentSale({ items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const updatedItems = currentSale.items.filter((_, i) => i !== index);
    updateCurrentSale({ items: updatedItems });
  };

  const calculateTotal = (sale: ActiveSale) => {
    return sale.items.reduce(
      (total, item) => total + item.quantity * item.unit_price,
      0
    );
  };

  const handlePaymentSubmit = async (details: PaymentDetails) => {
    setIsLoading(true);

    const currentSale = getCurrentSale();
    if (!currentSale || !currentSale.customer) return;

    try {
      const finalPayments = details.payments.map(p => ({
        payment_method: p.payment_method as PaymentMethod,
        amount: p.amount || 0,
        bank_name: p.bank_name || "",
        reference_number: p.reference_number || ""
      }));

      // Prepare sale items - converting to base units for database stock management
      const saleItems = currentSale.items.map((item: any) => {
        const productUnit = getProductUnit(item.product, item.unit_used);
        const conversion = productUnit?.conversion_to_base || 1;

        // baseQuantity is what decrments from the product table
        const baseQuantity = item.quantity * conversion;

        return {
          product_id: item.product.id,
          quantity: baseQuantity,
          unit_price: item.unit_price / conversion, // Effective price per base unit
          total_price: item.total_price,
          cost_price_at_sale: item.cost_price_at_sale / conversion,
          profit: item.total_price - (baseQuantity * (item.cost_price_at_sale / conversion)),
        };
      });

      // Prepare sale data
      const saleData: Omit<TSale, "id" | "created_at" | "updated_at"> = {
        customer_id: currentSale.customer.id,
        employee_id: auth.user.id,
        total_amount: currentSale.total,
        discount: 0,
        total_cost: saleItems.reduce((total, item) => total + item.quantity * (item.cost_price_at_sale || 0), 0),
        gross_profit: saleItems.reduce((total, item) => total + (item.profit || 0), 0),
        payments: finalPayments,
        sale_date: new Date().toISOString(),
      };

      // Create sale in database
      const saleId = await createSale(saleData, saleItems as any);

      setPaymentDetails({
        saleId,
        receivedAmount: finalPayments.reduce((s, p) => s + p.amount, 0),
        payingAmount: currentSale.total,
        changeReturn: finalPayments.reduce((s, p) => s + p.amount, 0) - currentSale.total,
        payments: finalPayments,
        paymentNotes: "",
        saleNotes: "",
        sale: {
          id: saleId,
          total_amount: currentSale.total,
          discount: 0,
          employee_id: auth.user.id,
          payments: finalPayments,
          sale_date: new Date().toISOString(),
          customer_id: currentSale.customer.id,
          customer_name: currentSale.customer.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: currentSale.items.map(item => ({
            product: item.product,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            unit_info: (item as any).unit_info
          }))
        }
      });

      setIsCheckout(false);
      setPayments([]);
      setShowPaymentModal(false);
      setShowInvoiceModal(true);

      // Mark the current sale as completed
      await removeActiveSale(currentSale.id);

      // Create a new active sale if none left or just create a fresh one
      createNewSale();

      toast({
        title: "Success",
        description: "Sale completed successfully!",
      });
    } catch (error) {
      console.error("Failed to complete sale:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resumeSale = async (id: string) => {
    // Set all other active sales to paused first
    activeSales.forEach(sale => {
      if (sale.status === 'active' && sale.id !== id) {
        updateActiveSale(sale.id, { status: 'paused' });
      }
    });

    await updateActiveSale(id, { status: "active" });
    setCurrentSaleId(id);
    setIsCheckout(false);
    setPayments([]);
  };

  const cancelSale = async (id: string) => {
    await removeActiveSale(id);
    if (currentSaleId === id) {
      createNewSale();
    }
  };

  const updateCurrentSale = async (updates: Partial<ActiveSale>) => {
    await updateActiveSale(currentSaleId, {
      ...updates,
      total: calculateTotal({ ...currentSale, ...updates }),
    });
  };

  const pauseSale = async () => {
    const currentSale = getCurrentSale();
    if (!currentSale || currentSale.items.length === 0 || currentSale.customer === null) {
      toast({
        title: "Error: Pause Sale",
        description: "You need to add at least one product and select a customer before pausing the sale.",
        variant: "destructive",
      });
      return;
    }
    await updateCurrentSale({ status: "paused" });
    createNewSale();
    toast({ title: "Sale Paused", description: "Order has been moved to paused list" });
  };

  const currentSale = getCurrentSale();

  // Filter products for POS interface - using real products from state
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "ALL" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getSubtotal = () => {
    return currentSale ? currentSale.total : 0;
  };

  const getTotal = () => {
    return getSubtotal(); // Add tax logic here if needed, keeping it simple for now
  };

  return (
    <div className="h-[calc(100vh-100px)] bg-slate-50 text-slate-900 flex overflow-hidden font-sans rounded-xl border border-slate-200 shadow-xl">
      {/* Left Panel - Categories and Products */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        {/* Header / Search / Paused Sales Toggle */}
        <div className="p-4 border-b border-slate-200 bg-white backdrop-blur sticky top-0 z-10 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-sm focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 text-slate-600 text-xs h-9">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Paused ({activeSales.filter(s => s.status === "paused").length})
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="text-slate-900">Paused Sales</SheetTitle>
                  <SheetDescription className="text-slate-500">
                    Resume or cancel your held transactions.
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] w-full mt-6 pr-4">
                  <div className="space-y-4">
                    {activeSales
                      .filter(sale => sale.id !== currentSaleId && sale.status === "paused")
                      .map((sale) => (
                        <div key={sale.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{sale.id}</span>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none">Paused</Badge>
                          </div>
                          <div className="text-xs text-slate-500">
                            <p>Customer: {sale.customer?.name || "Walk-in"}</p>
                            <p>Items: {sale.items.length} | Total: {formatCurrency(sale.total)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={() => resumeSale(sale.id)}>
                              <Play className="mr-2 h-3 w-3" /> Resume
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => cancelSale(sale.id)}>
                              <X className="mr-2 h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ))}
                    {activeSales.filter(s => s.status === "paused").length === 0 && (
                      <div className="text-center py-10 text-gray-500 italic text-sm">No paused sales</div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Categories grid */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 text-xs font-bold uppercase tracking-wider
                ${selectedCategory === "ALL"
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200'}
              `}
            >
              <span>All Items</span>
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 text-xs font-bold uppercase tracking-wider
                  ${selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200'}
                `}
              >
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => {
              const primaryUnit = getPrimaryUnit(product);
              const stock = primaryUnit ? getAvailableStock(product, primaryUnit.unit_id) : product.quantity_on_hand;
              const isLowStock = stock < 5;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => handleAddProduct(product)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Badge
                      variant={isLowStock ? "destructive" : "secondary"}
                      className={`text-[10px] px-2 py-0.5 h-auto ${isLowStock ? '' : 'bg-emerald-50 text-emerald-700 border-none'}`}
                    >
                      {stock.toFixed(0)} {primaryUnit?.unit?.abbrev || 'pcs'}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 h-10 mb-2">
                    {product.name}
                  </h3>

                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-blue-600">
                      {formatCurrency(primaryUnit?.selling_price || product.selling_price)}
                    </span>
                  </div>

                  {/* Multi-unit Selection Overlay on Hover */}
                  {product.product_units && product.product_units.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 bg-white/95 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-wrap gap-1.5 justify-center border-t border-slate-100">
                      {product.product_units.map((pu) => (
                        <button
                          key={pu.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddProduct(product, pu.unit_id);
                          }}
                          className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-colors"
                        >
                          {pu.unit?.abbrev}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Order Summary */}
      <div className="w-96 flex flex-col bg-white border-l border-slate-200 shadow-xl relative">
        {/* Order Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Order Summary</h2>
              {isCheckout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCheckout(false)}
                  className="h-7 text-[10px] font-bold text-blue-400 hover:bg-blue-100/10"
                >
                  <ShoppingCart className="w-3 h-3 mr-1" /> Edit Cart
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Customer</Label>
              <div className="customer-select-pos">
                <CustomerSelect
                  customers={customers}
                  selectedCustomer={currentSale?.customer}
                  onSelect={(customer) => updateCurrentSale({ customer })}
                  onAddNew={handleAddCustomer}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Items / Checkout View */}
        <ScrollArea className="flex-1 p-6">
          {!isCheckout ? (
            <div className="space-y-3">
              {(!currentSale || currentSale.items.length === 0) ? (
                <div className="h-40 flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-40 italic">
                  <ShoppingCart className="w-10 h-10" />
                  <p className="text-xs">Your basket is empty</p>
                </div>
              ) : (
                currentSale.items.map((item, index) => (
                  <div key={index} className="group bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {formatCurrency(item.unit_price)} / {(item as any).unit_info?.abbrev || 'pc'}
                        </p>
                      </div>
                      <span className="text-xs font-black text-slate-900">{formatCurrency(item.total_price)}</span>
                    </div>
                    <div className="flex items-center justify-between pl-1">
                      <div className="flex items-center bg-white rounded-lg border border-slate-200 h-8">
                        <button className="px-2 h-full text-slate-400 hover:text-slate-600" onClick={() => updateQuantity(index, Math.max(0, item.quantity - 1))}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-700">{item.quantity}</span>
                        <button className="px-2 h-full text-slate-400 hover:text-slate-600" onClick={() => updateQuantity(index, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button className="p-2 text-gray-600 hover:text-red-400 transition-colors" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6 slide-in-bottom">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Balance Due</p>
                <p className="text-3xl font-black text-slate-900">{formatCurrency(getTotal() - payments.reduce((s, p) => s + p.amount, 0))}</p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-500 ml-1">Payment Methods</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', icon: DollarSign, label: 'Cash', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                    { id: 'pos', icon: CreditCard, label: 'Card', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                    { id: 'transfer', icon: Smartphone, label: 'Trf', color: 'text-purple-600 bg-purple-50 border-purple-100' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => addPayment(method.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 active:scale-95",
                        method.color
                      )}
                    >
                      <method.icon className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-black uppercase">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {payments.map((p, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{p.method}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold text-sm">₦</span>
                        <input
                          type="number"
                          value={p.amount}
                          onFocus={e => e.target.select()}
                          onChange={e => updatePaymentAmount(i, parseFloat(e.target.value) || 0)}
                          className="bg-transparent text-slate-900 font-black text-lg w-24 outline-none border-b border-slate-200 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <button className="p-2 text-gray-500 hover:text-red-400" onClick={() => removePayment(i)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Action Footer */}
        <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-slate-100 pb-4">
              <span className="text-[10px] font-black uppercase text-slate-400">Order total</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(getTotal())}</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {!isCheckout ? (
                <>
                  <Button
                    variant="outline"
                    className="col-span-1 bg-transparent border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                    onClick={pauseSale}
                    title="Pause Order"
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button
                    className="col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-blue-200"
                    onClick={() => {
                      if (!currentSale?.customer) {
                        toast({ title: "Error", description: "Select customer", variant: "destructive" });
                        return;
                      }
                      if (!currentSale || currentSale.items.length === 0) {
                        toast({ title: "Error", description: "Cart is empty", variant: "destructive" });
                        return;
                      }
                      setIsCheckout(true);
                    }}
                  >
                    Checkout Summary
                  </Button>
                </>
              ) : (
                <Button
                  className="col-span-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-sm h-14 shadow-lg shadow-emerald-200"
                  onClick={() => handlePaymentSubmit({
                    payments: payments.map(p => ({
                      payment_method: (p.method === 'transfer' ? 'transfer' : p.method === 'pos' ? 'pos' : 'cash') as PaymentMethod,
                      amount: p.amount,
                    }))
                  } as any)}
                  disabled={isLoading || payments.reduce((s, p) => s + p.amount, 0) < getTotal()}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Complete Sale'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keep the InvoiceModal for the final flow */}
      {showInvoiceModal && paymentDetails && paymentDetails.saleId && (
        <InvoiceModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          sale={{
            id: paymentDetails.saleId,
            total_amount: paymentDetails.sale.total_amount,
            discount: paymentDetails.sale.discount,
            employee_id: auth.user.id,
            payments: paymentDetails.payments,
            created_at: new Date().toISOString(),
            customer_id: paymentDetails.sale.customer_id,
            customer_name: paymentDetails.sale.customer_name,
            employee_name: auth.user.name,
          }}
          items={paymentDetails.sale.items.map((item) => ({
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          }))}
        />
      )}
    </div>
  );
}
