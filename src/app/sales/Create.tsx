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
import { SALE_Sale, SALE_SaleItem } from "@/types/sales";
import {
  customers as mockCustomers,
  products as mockProducts,
} from "@/lib/mock-data";
import { Loader2, ShoppingCart, Trash2, Pause, Play, X, Plus } from 'lucide-react';
import {
  PaymentModal,
  PaymentDetails,
} from "@components/SalesPaymentModal";
import { InvoiceModal } from "@components/SaleInvoiceModal";
import { ScrollArea } from "@components/ui/scroll-area";
import { Badge } from "@components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@components/ui/sheet";
import { TCustomer, TProduct } from "@/types/database";

interface ActiveSale {
  id: string;
  customer: TCustomer | null;
  items: SALE_SaleItem[];
  status: 'active' | 'paused' | 'completed';
  total: number;
}

export default function CreateSales() {
  const [customers, setCustomers] = useState<TCustomer[]>([]);
  const [products, setProducts] = useState<TProduct[]>([]);
  const [activeSales, setActiveSales] = useState<ActiveSale[]>([]);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    setCustomers(mockCustomers);
    setProducts(mockProducts);
  }, []);

  useEffect(() => {
    if (activeSales.length === 0) {
      createNewSale();
    }
  }, [activeSales]);

  const createNewSale = () => {
    const newSale: ActiveSale = {
      id: `SALE${activeSales.length + 1}`,
      customer: null,
      items: [],
      status: 'active',
      total: 0
    };
    setActiveSales([...activeSales, newSale]);
    setCurrentSaleId(newSale.id);
  };

  const getCurrentSale = () => {
    return activeSales.find(sale => sale.id === currentSaleId) || null;
  };

  const handleAddCustomer = (name: string) => {
    const newCustomer: TCustomer = {
      id: (customers.length + 1).toString(),
      name: name,
      email: "",
      phone: "",
      address: "",
      created_at: new Date().toDateString(),
      updated_at: new Date().toDateString(),
    };
    setCustomers([...customers, newCustomer]);
    updateCurrentSale({ customer: newCustomer });
    toast({
      title: "Success",
      description: `New customer "${name}" created.`,
    });
  };

  const handleAddProduct = (product: TProduct) => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const existingItem = currentSale.items.find(
      (item) => item.product.id === product.id
    );
    if (existingItem) {
      handleUpdateQuantity(
        currentSale.items.indexOf(existingItem),
        existingItem.quantity + 1
      );
    } else {
      const newSaleItem: SALE_SaleItem = {
        id: `ITEM${currentSale.items.length + 1}`,
        sale_id: currentSale.id,
        product_id: product.id,
        product: product,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      updateCurrentSale({
        items: [...currentSale.items, newSaleItem],
      });
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const updatedItems = [...currentSale.items];
    updatedItems[index].quantity = quantity;
    updateCurrentSale({ items: updatedItems });
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const currentSale = getCurrentSale();
    if (!currentSale) return;

    const updatedItems = [...currentSale.items];
    updatedItems[index].unit_price = price;
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
    if (!currentSale) return;

    const sale: SALE_Sale = {
      customer: currentSale.customer!,
      items: currentSale.items,
      total: calculateTotal(currentSale),
      date: new Date(),
    };

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setPaymentDetails(details);
    setShowPaymentModal(false);
    setShowInvoiceModal(true);
    setIsLoading(false);

    // Mark the current sale as completed
    updateCurrentSale({ status: 'completed' });

    // Create a new active sale
    createNewSale();
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

  const updateCurrentSale = (updates: Partial<ActiveSale>) => {
    setActiveSales(sales => sales.map(sale => 
      sale.id === currentSaleId ? { ...sale, ...updates, total: calculateTotal({...sale, ...updates}) } : sale
    ));
  };

  const pauseSale = () => {
    updateCurrentSale({ status: 'paused' });
    // Don't create a new sale immediately
  };

  const resumeSale = (saleId: string) => {
    setActiveSales(sales => sales.map(sale => 
      sale.id === saleId ? { ...sale, status: 'active' } : sale
    ));
    setCurrentSaleId(saleId);
  };

  const cancelSale = (saleId: string) => {
    setActiveSales(sales => sales.filter(sale => sale.id !== saleId));
    if (saleId === currentSaleId) {
      const activeSale = activeSales.find(sale => sale.status === 'active');
      setCurrentSaleId(activeSale ? activeSale.id : null);
    }
  };

  const currentSale = getCurrentSale();

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Add New Sale</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={createNewSale}>
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
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
                {activeSales.filter(sale => sale.id !== currentSaleId && sale.status === 'paused').map((sale) => (
                  <div key={sale.id} className="mb-4 p-4 border rounded-md bg-white shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-lg">{sale.id}</span>
                      <Badge variant="secondary">Paused</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Customer: {sale.customer?.name || 'Not selected'}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Items: {sale.items.length} | Total: ₦{sale.total.toFixed(2)}
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <Button size="sm" onClick={() => resumeSale(sale.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Resume Sale
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => cancelSale(sale.id)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <div className="mt-4">
                <Button className="w-full" onClick={createNewSale}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Sale
                </Button>
              </div>
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
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentSale.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.5"
                            step="0.5"
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
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleUpdatePrice(index, parseFloat(e.target.value))
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
            Total: ₦{currentSale ? currentSale.total.toFixed(2) : '0.00'}
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
          onClose={() => setShowPaymentModal(false)}
          sale={{
            customer: currentSale.customer!,
            items: currentSale.items,
            total: currentSale.total,
            date: new Date(),
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}

      {showInvoiceModal && paymentDetails && currentSale && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            createNewSale();
          }}
          sale={{
            customer: currentSale.customer!,
            items: currentSale.items,
            total: currentSale.total,
            date: new Date(),
          }}
          paymentDetails={paymentDetails}
        />
      )}
    </div>
  );
}

