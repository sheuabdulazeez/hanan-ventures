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
import { TCustomer, TProduct, TSale } from "@/types/database";
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

// Extend TProduct for UI purposes if needed, 
// though the database returns it with product_units joined usually
type Product = TProduct & {
  product_units: ProductUnit[];
  base_unit_info?: CommonUnit;
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
  const [products, setProducts] = useState<TProduct[]>([]);
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

  const handlePaymentSubmit = async (customPayments?: { method: PaymentMethod; amount: number; bank_name?: string; reference_number?: string }[]) => {
    setIsLoading(true);

    const currentSale = getCurrentSale();
    if (!currentSale || !currentSale.customer) return;

    try {
      const finalPayments = customPayments || payments.map(p => ({
        payment_method: (p.method === 'transfer' ? 'transfer' : p.method === 'card' ? 'pos' : 'cash') as PaymentMethod,
        amount: p.amount,
        bank_name: "",
        reference_number: ""
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
        payments: finalPayments,
        saleId,
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

  const handleSubmit = async () => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    if (!currentSale.customer) {
      toast({
        title: "Error",
        description: "Please select a customer.",
        variant: "destructive",
      });
      return;
    }

    if (currentSale.items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setShowPaymentModal(true);
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
    toast({
      title: "Success",
      description: "Sale paused",
    });
  };

  const resumeSale = async (saleId: string) => {
    await updateActiveSale(saleId, { status: "active" });
    setCurrentSaleId(saleId);
  };

  const cancelSale = (saleId: string) => {
    removeActiveSale(saleId);
    if (saleId === currentSaleId) {
      const activeSale = activeSales.find((sale) => sale.status === "active");
      setCurrentSaleId(activeSale ? activeSale.id : null);
    }
  };

  const currentSale = getCurrentSale();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Add New Sale</h1>
        <div className="space-x-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Paused Sales
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[425px]">
              <SheetHeader>
                <SheetTitle>Paused Sales</SheetTitle>
                <SheetDescription>
                  View and manage your paused sales here.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] w-full mt-4">
                {activeSales
                  .filter(
                    (sale) =>
                      sale.id !== currentSaleId && sale.status === "paused"
                  )
                  .map((sale) => (
                    <div
                      key={sale.id}
                      className="mb-4 p-4 border rounded-md bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-lg">{sale.id}</span>
                        <Badge variant="secondary">Paused</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Customer: {sale.customer?.name || "Not selected"}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Items: {sale.items.length} | Total: ₦
                        {sale.total.toFixed(2)}
                      </div>
                      <div className="flex space-x-2 mt-2">
                        <Button size="sm" onClick={() => resumeSale(sale.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Resume Sale
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelSale(sale.id)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Sale: {currentSale?.id}</CardTitle>
          <CardDescription>
            Add products and complete the sale here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <CustomerSelect
                selectedCustomer={currentSale?.customer}
                customers={customers}
                onSelect={(customer) => updateCurrentSale({ customer })}
                onAddNew={handleAddCustomer}
              />
            </div>
            <div>
              <Label htmlFor="product">Add Product</Label>
              <ProductSelect products={products} onSelect={handleAddProduct} />
            </div>
            <div className="border rounded-lg p-4">
              {currentSale && currentSale.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSale.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.25"
                            max={item.product.quantity_on_hand.toFixed(2)}
                            step="0.25"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                index,
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleUpdatePrice(
                                index,
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          ₦{(item.quantity * item.unit_price).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
                  <p>
                    No products added yet. Use the search bar above to add
                    products to your sale.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-2xl font-bold">
            Total: ₦{currentSale ? currentSale.total.toFixed(2) : "0.00"}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={pauseSale}>
              <Pause className="mr-2 h-4 w-4" />
              Pause Sale
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Complete Sale"
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {showPaymentModal && currentSale && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setIsLoading(false) }}
          sale={{
            id: currentSale.id,
            customer: currentSale.customer!,
            items: currentSale.items,
            total: currentSale.total,
            discount: 0,
            date: new Date(),
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}

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
            total_price: item.quantity * item.unit_price,
          }))}
        />
      )}
    </div>
  );
}
