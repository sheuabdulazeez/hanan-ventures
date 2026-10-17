"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Filter,
  ClipboardList,
  ChevronRight,
  User,
  Package,
  XCircle,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileBox,
  Calendar,
  CheckCircle,
  Loader2,
  Printer,
  Wallet
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import PurchaseOrderPDF from "@/components/pdf/PurchaseOrderPDF";
import SupplierPaymentDialog from "./SupplierPaymentDialog";
import Payments from "./Payments";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  PurchaseOrder,
} from "@/database/orders";
import { getSupplierPayableByPurchaseOrder } from "@/database/supplier-payments";
import { getSuppliers, Supplier } from "@/database/suppliers";
import { getProducts } from "@/database/products";
import { TProduct, TPurchaseOrderPayableSummary } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import ReceivePO from "./Receive";
import Approvals from "./Approvals";

export default function PurchaseOrdersPage() {
  const { auth: { user }, businessInfo, receiptSettings } = useAppStore();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState("all-orders");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<TProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [newPO, setNewPO] = useState<{
    supplier_id: string;
    items: { product_id: string; quantity_ordered: number; unit_id?: string; unit_price: number | "" }[];
  }>({
    supplier_id: "",
    items: [],
  });

  // View Modal State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedPOSummary, setSelectedPOSummary] = useState<TPurchaseOrderPayableSummary | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      const [ordersData, suppliersData, productsData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts(),
      ]);

      setPurchaseOrders(ordersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreatePO = async () => {
    try {
      if (newPO.items.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please add at least one item to the order",
        });
        return;
      }

      // The price is what this supplier is charging for this order, which can
      // differ from the product's stored cost price, so it is entered per line.
      const invalidLine = newPO.items.findIndex(
        (item) =>
          !item.product_id ||
          !(item.quantity_ordered > 0) ||
          !(Number(item.unit_price) > 0)
      );
      if (invalidLine !== -1) {
        toast({
          variant: "destructive",
          title: "Check order items",
          description: `Item ${invalidLine + 1} needs a product, a quantity and a price greater than zero.`,
        });
        return;
      }

      await createPurchaseOrder(
        newPO.supplier_id,
        user.id,
        newPO.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity_ordered,
          unitPrice: Number(item.unit_price),
          unitId: item.unit_id || undefined,
        }))
      );

      setIsCreating(false);
      setNewPO({ supplier_id: "", items: [] });
      await loadInitialData();

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create purchase order",
      });
    }
  };

  const addNewItem = () => {
    setNewPO((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: "", quantity_ordered: 1, unit_id: "", unit_price: "" },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setNewPO((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setNewPO((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === "product_id") {
        // A different product has different units; clear the stale unit choice.
        newItems[index].unit_id = "";
      }
      return { ...prev, items: newItems };
    });
  };

  const handleViewPO = async (id: string) => {
    try {
      const [po, payableSummary] = await Promise.all([
        getPurchaseOrderById(id),
        getSupplierPayableByPurchaseOrder(id),
      ]);
      setSelectedPO(po as unknown as PurchaseOrder);
      setSelectedPOSummary(payableSummary);
    } catch (error) {
      console.error(error);
    }
  };

  const refreshSelectedPO = async () => {
    if (!selectedPO?.id) {
      return;
    }

    try {
      const [po, payableSummary] = await Promise.all([
        getPurchaseOrderById(selectedPO.id),
        getSupplierPayableByPurchaseOrder(selectedPO.id),
      ]);
      setSelectedPO(po as unknown as PurchaseOrder);
      setSelectedPOSummary(payableSummary);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusConfig = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "pending":
        return { icon: <FileText className="w-3 h-3" />, className: "bg-amber-50 text-amber-600 border-amber-100" };
      case "received": // fully received
        return { icon: <CheckCircle className="w-3 h-3" />, className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "partially_received":
        return { icon: <Truck className="w-3 h-3" />, className: "bg-blue-50 text-blue-600 border-blue-100" };
      case "cancelled":
        return { icon: <XCircle className="w-3 h-3" />, className: "bg-red-50 text-red-600 border-red-100" };
      default:
        return { icon: <AlertCircle className="w-3 h-3" />, className: "bg-slate-50 text-slate-500 border-slate-200" };
    }
  };

  const filteredOrders = purchaseOrders.filter(
    (po) =>
      po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Purchase Orders</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Manage Procurement & inventory</p>
            </div>
            {isAdmin && activeTab === 'all-orders' && (
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-lg shadow-slate-200">
                    <Plus className="w-4 h-4 mr-2" />
                    New Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl bg-white border-slate-200 p-0 overflow-hidden">
                  <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-black text-slate-900">Create Order</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">Issue a new procurement order to a supplier</DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="px-6 py-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="w-3 h-3" /> Select Supplier</Label>
                      <Select
                        value={newPO.supplier_id}
                        onValueChange={(value) =>
                          setNewPO((prev) => ({ ...prev, supplier_id: value }))
                        }
                      >
                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700">
                          <SelectValue placeholder="Choose a supplier" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id} className="text-xs font-bold">
                              {supplier.supplier_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Package className="w-3 h-3" /> Order Items</Label>
                        <Button variant="ghost" size="sm" onClick={addNewItem} className="text-[9px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-100">
                          <Plus className="w-3 h-3 mr-1" /> Add Product
                        </Button>
                      </div>
                      <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-3">
                          {newPO.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group">
                              <div className="flex-1">
                                <Select
                                  value={item.product_id}
                                  onValueChange={(value) =>
                                    updateItem(index, "product_id", value)
                                  }
                                >
                                  <SelectTrigger className="h-9 bg-white border-slate-200 text-xs font-bold">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    {products.map((product) => (
                                      <SelectItem
                                        key={product.id}
                                        value={product.id}
                                        className="text-xs font-bold"
                                      >
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-32">
                                <Select
                                  value={item.unit_id}
                                  onValueChange={(value) =>
                                    updateItem(index, "unit_id", value)
                                  }
                                  disabled={!item.product_id}
                                >
                                  <SelectTrigger className="h-9 bg-white border-slate-200 text-xs font-bold">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    {products.find(p => p.id === item.product_id)?.product_units?.map((pu) => (
                                      <SelectItem
                                        key={pu.id}
                                        value={pu.id}
                                        className="text-xs font-bold"
                                      >
                                        {pu.unit?.name || 'Unit'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity_ordered}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "quantity_ordered",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-9 bg-white border-slate-200 text-xs font-black text-center"
                                  min="1"
                                />
                              </div>
                              <div className="w-32">
                                <Input
                                  type="number"
                                  placeholder="Price / unit"
                                  value={item.unit_price}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "unit_price",
                                      e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0)
                                    )
                                  }
                                  className="h-9 bg-white border-slate-200 text-xs font-black text-right"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {newPO.items.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No items added to order</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Total (amount owed)</span>
                        <span className="text-sm font-black text-slate-900">
                          ₦{newPO.items
                            .reduce((sum, item) => sum + (item.quantity_ordered || 0) * (Number(item.unit_price) || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="bg-slate-50/50 p-4 border-t border-slate-100 flex-row justify-end space-x-2">
                    <DialogClose asChild>
                      <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleCreatePO}
                      disabled={!newPO.supplier_id || newPO.items.length === 0}
                      className="h-10 px-8 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
                    >
                      Confirm Order
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            if (val === "all-orders") {
              loadInitialData();
            }
          }} className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-xl w-full flex justify-start gap-2 overflow-x-auto">
              <TabsTrigger value="all-orders" className="flex-1 min-w-[120px] rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
                <FileBox className="w-3.5 h-3.5 mr-2" /> All Orders
              </TabsTrigger>
              <TabsTrigger value="receive" className="flex-1 min-w-[120px] rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
                <Truck className="w-3.5 h-3.5 mr-2" /> Receive Stock
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="approvals" className="flex-1 min-w-[120px] rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approvals
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none h-4 px-1 text-[8px]">
                    Action Reqd
                  </Badge>
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="payments" className="flex-1 min-w-[120px] rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900">
                  <Wallet className="w-3.5 h-3.5 mr-2" /> Payments
                </TabsTrigger>
              )}
            </TabsList>

            <div className="mt-8">
              <TabsContent value="all-orders" className="space-y-6">
                {/* Search & Filter */}
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search orders by ID or Supplier..."
                      className="pl-10 bg-white border-slate-200 h-11 rounded-xl font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="h-11 px-4 border-slate-200 rounded-xl bg-white">
                    <Filter className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Filter</span>
                  </Button>
                </div>

                {/* Orders List */}
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ClipboardList className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-widest">{filteredOrders.length} Total Orders</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex flex-col justify-center items-center h-64 gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading orders...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-slate-100">
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Order ID</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Supplier</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Date</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Total Cost</TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence mode="popLayout">
                              {filteredOrders.map((po, index) => {
                                const status = getStatusConfig(po.status);
                                return (
                                  <motion.tr
                                    key={po.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="group hover:bg-slate-50/50 border-slate-50 transition-colors cursor-pointer"
                                    onClick={() => handleViewPO(po.id)}
                                  >
                                    <TableCell className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                        <p className="font-black text-slate-900 text-sm leading-tight uppercase tracking-tighter">#{po.id.slice(-8).toUpperCase()}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-slate-300" />
                                        <p className="text-xs font-black text-slate-700">{po.supplier_name}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                        <p className="text-xs font-bold text-slate-500">{format(new Date(po.order_date), "MMM dd, yyyy")}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <p className="text-xs font-bold text-slate-900">₦{po?.total_cost?.toLocaleString()}</p>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge variant="outline" className={`h-6 px-2 text-[8px] font-black uppercase tracking-widest border-none gap-1.5 ${status.className}`}>
                                        {status.icon}
                                        {po.status.replace('_', ' ')}
                                      </Badge>
                                    </TableCell>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                            {filteredOrders.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                  <div className="flex flex-col items-center justify-center gap-3">
                                    <ClipboardList className="w-12 h-12 text-slate-100" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No purchase records found</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="receive">
                <ReceivePO onUpdate={loadInitialData} />
              </TabsContent>

              <TabsContent value="approvals">
                <Approvals onUpdate={loadInitialData} />
              </TabsContent>

              <TabsContent value="payments">
                <Payments suppliers={suppliers} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <SupplierPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        suppliers={suppliers}
        initialSupplierId={selectedPO?.supplier_id}
        initialPurchaseOrderId={selectedPO?.id}
        onSuccess={async () => {
          await refreshSelectedPO();
          await loadInitialData();
        }}
      />

      {/* View PO Details Modal */}
      <Dialog
        open={!!selectedPO}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPO(null);
            setSelectedPOSummary(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white border-slate-200 p-0 overflow-hidden">
          {selectedPO && (
            <>
              <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Order #{selectedPO.id.slice(-8)}</DialogTitle>
                      <DialogDescription className="text-slate-500 font-medium">Detailed procurement breakdown</DialogDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={`h-6 px-2 text-[8px] font-black uppercase tracking-widest border-none gap-1.5 ${getStatusConfig(selectedPO.status).className}`}>
                    {getStatusConfig(selectedPO.status).icon}
                    {selectedPO.status.replace('_', ' ')}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</p>
                    <p className="text-sm font-black text-slate-900">{selectedPO.supplier_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Date</p>
                    <p className="text-sm font-black text-slate-900">{format(new Date(selectedPO.order_date), "PPP")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amounts</p>
                    <p className="text-sm font-black text-green-600">₦{selectedPO?.total_cost?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Supplier Balance For This PO
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Liability is created only from approved received stock.
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]"
                        onClick={() => setShowPaymentDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Payment
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Accrued
                      </p>
                      <p className="mt-2 text-xl font-black text-slate-900">
                        ₦{Number(selectedPOSummary?.total_accrued || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Paid
                      </p>
                      <p className="mt-2 text-xl font-black text-emerald-600">
                        ₦{Number(selectedPOSummary?.total_paid || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Outstanding
                      </p>
                      <p className="mt-2 text-xl font-black text-amber-600">
                        ₦{Number(selectedPOSummary?.outstanding || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="text-[9px] font-black h-9 px-4 uppercase tracking-widest">Description</TableHead>
                        <TableHead className="text-[9px] font-black h-9 text-center uppercase tracking-widest">Qty</TableHead>
                        <TableHead className="text-[9px] font-black h-9 text-right uppercase tracking-widest">Unit Price</TableHead>
                        <TableHead className="text-[9px] font-black h-9 text-right px-4 uppercase tracking-widest">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items?.map((item, index) => (
                        <TableRow key={index} className="border-slate-50">
                          <TableCell className="px-4 py-3">
                            <p className="text-xs font-black text-slate-900">{item.product_name}</p>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <Badge variant="outline" className="text-[10px] font-black bg-white border-slate-200">{item.quantity_ordered}</Badge>
                          </TableCell>
                          <TableCell className="text-right py-3 text-xs font-bold text-slate-400">₦{item.unit_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right px-4 py-3 text-xs font-black text-slate-900">
                            ₦{(item.quantity_ordered * item.unit_price).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
                    onClick={async () => {
                      if (!selectedPO) return;

                      if (!receiptSettings.printerPort) {
                        toast({
                          variant: "destructive",
                          title: "No printer selected",
                          description: "Please select a printer in settings."
                        });
                        return;
                      }

                      const doc = (
                        <PurchaseOrderPDF
                          po={selectedPO}
                          settings={{
                            businessInfo,
                            receiptSettings
                          }}
                        />
                      );

                      const blob = await pdf(doc).toBlob();
                      const buffer = await blob.arrayBuffer();
                      const bytes = Array.from(new Uint8Array(buffer));
                      const printOptions =
                        receiptSettings.printTransport === "serial"
                          ? {
                              transport: "serial" as const,
                              serialConfig: {
                                baud_rate: receiptSettings.serialBaudRate,
                                timeout_ms: receiptSettings.serialTimeoutMs,
                                chunk_size: receiptSettings.serialChunkSize,
                                chunk_delay_ms: receiptSettings.serialChunkDelayMs,
                                parity: receiptSettings.serialParity,
                                stop_bits: receiptSettings.serialStopBits,
                                data_bits: receiptSettings.serialDataBits,
                                flow_control: receiptSettings.serialFlowControl,
                              },
                            }
                          : {
                              transport: "spooler" as const,
                              serialConfig: undefined,
                            };

                      await invoke("print_pdf", {
                        printerPort: receiptSettings.printerPort,
                        pdfBytes: bytes,
                        paperWidth: receiptSettings.paperSize === "58mm" ? 58 : 80,
                        transport: printOptions.transport,
                        serialConfig: printOptions.serialConfig,
                      });
                    }}
                  >
                    <Printer className="w-3.5 h-3.5 mr-2" /> Print PO
                  </Button>
                </div>
                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400" onClick={() => setSelectedPO(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
