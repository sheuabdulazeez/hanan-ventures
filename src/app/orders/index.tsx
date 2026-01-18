"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Truck,
  XCircle,
  CheckCircle,
  Package,
  Calendar,
  User,
  MoreVertical,
  ClipboardList,
  ChevronRight,
  ArrowRight,
  Calculator,
  AlertCircle
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderItem,
  getPurchaseOrderItems,
  createPurchaseReceipt,
} from "@/database/purchase-orders";
import { getSuppliers, type Supplier } from "@/database/suppliers";
import { getProducts } from "@/database/products";
import { TProduct } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";

export default function PurchaseOrdersPage() {
  const {
    auth: { user },
  } = useAppStore();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<TProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPO, setNewPO] = useState({
    supplier_id: "",
    items: [] as {
      product_id: string;
      quantity_ordered: number;
      unit_price: number;
    }[],
  });
  const [isReceiving, setIsReceiving] = useState(false);
  const [receivingItems, setReceivingItems] = useState<
    Array<{
      product_id: string;
      product_name: string;
      quantity_ordered: number;
      quantity_received: number;
    }>
  >([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [ordersData, suppliersData, productsData] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts(),
      ]);

      setPurchaseOrders(ordersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
      setIsLoading(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data",
      });
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

      await createPurchaseOrder(
        {
          supplier_id: newPO.supplier_id,
          order_date: new Date().toISOString(),
          status: "pending",
        },
        newPO.items
      );

      setIsCreating(false);
      setNewPO({ supplier_id: "", items: [] });
      await loadInitialData();

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create purchase order",
      });
    }
  };

  const getStatusConfig = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "pending":
        return { icon: <FileText className="w-3 h-3" />, className: "bg-amber-50 text-amber-600 border-amber-100" };
      case "approved":
        return { icon: <CheckCircle className="w-3 h-3" />, className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "cancelled":
        return { icon: <XCircle className="w-3 h-3" />, className: "bg-red-50 text-red-600 border-red-100" };
      case "received":
        return { icon: <Truck className="w-3 h-3" />, className: "bg-blue-50 text-blue-600 border-blue-100" };
      case "partially_received":
        return { icon: <AlertCircle className="w-3 h-3" />, className: "bg-slate-50 text-slate-500 border-slate-200" };
      default:
        return { icon: <FileText className="w-3 h-3" />, className: "bg-slate-50 text-slate-500 border-slate-200" };
    }
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
    const items = await getPurchaseOrderItems(po.id);
    setReceivingItems(
      items.map((item) => ({
        ...item,
        quantity_received: 0,
      }))
    );
    setIsReceiving(true);
    setSelectedPO(po);
  };

  const handleSubmitReceipt = async () => {
    try {
      if (!selectedPO) return;
      await createPurchaseReceipt({
        purchase_order_id: selectedPO.id,
        employee_id: user!.id,
        items: receivingItems.map((item) => ({
          product_id: item.product_id,
          quantity_received: item.quantity_received,
        })),
      });

      setIsReceiving(false);
      setReceivingItems([]);
      setSelectedPO(null);
      await loadInitialData();

      toast({
        title: "Success",
        description: "Items received successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to receive items",
      });
    }
  };

  const handleStatusUpdate = async (
    id: string,
    status: PurchaseOrder["status"]
  ) => {
    try {
      await updatePurchaseOrderStatus(id, status);
      await loadInitialData();
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status",
      });
    }
  };

  const addNewItem = () => {
    setNewPO((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_id: "", quantity_ordered: 1, unit_price: 0 },
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
        const product = products.find((p) => p.id === value);
        if (product) {
          newItems[index].unit_price = product.cost_price;
        }
      }
      return { ...prev, items: newItems };
    });
  };

  const handleViewPO = async (po: PurchaseOrder) => {
    const items = await getPurchaseOrderItems(po.id);
    setSelectedPO({ ...po, items });
  };

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Purchase Orders</h1>
              <p className="text-slate-500 font-medium tracking-tight">Streamline your procurement and inventory restocking</p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs h-12 px-6 shadow-lg shadow-slate-200">
                    <Plus className="w-4 h-4 mr-2" />
                    New Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl bg-white border-slate-200 p-0 overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search order ID or supplier name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <ClipboardList className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{filteredPOs.length} Total Orders</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading ledger...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Order ID</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Supplier</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredPOs.map((po, index) => {
                        const status = getStatusConfig(po.status);
                        return (
                          <motion.tr
                            key={po.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group hover:bg-slate-50/50 border-slate-50 transition-colors"
                          >
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <p className="font-black text-slate-900 text-sm leading-tight uppercase tracking-tighter">#{po.id.slice(-8)}</p>
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
                              <Badge variant="outline" className={`h-6 px-2 text-[8px] font-black uppercase tracking-widest border-none gap-1.5 ${status.className}`}>
                                {status.icon}
                                {po.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                              <div className="flex justify-end items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewPO(po)}
                                  className="h-8 px-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {user?.role === "admin" && po.status === "pending" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleStatusUpdate(po.id, "partially_received")}
                                        className="h-8 px-3 text-emerald-600 hover:bg-emerald-50"
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleStatusUpdate(po.id, "cancelled")}
                                        className="h-8 px-3 text-red-600 hover:bg-red-50"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  )}
                                  {(po.status === "approved" || po.status === "partially_received") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleReceivePO(po)}
                                      className="h-8 px-3 text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px]"
                                    >
                                      <Truck className="w-3.5 h-3.5 mr-1" /> Receive
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                    {filteredPOs.length === 0 && (
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
      </div>

      {/* View PO Dialog */}
      <Dialog open={!!selectedPO && !isReceiving} onOpenChange={(open) => !open && setSelectedPO(null)}>
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</p>
                    <p className="text-sm font-black text-slate-900">{selectedPO.items?.length || 0} Products</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="text-[9px] font-black h-9 px-4 uppercase tracking-widest">Description</TableHead>
                        <TableHead className="text-[9px] font-black h-9 text-center uppercase tracking-widest">Qty</TableHead>
                        <TableHead className="text-[9px] font-black h-9 text-right uppercase tracking-widest">Unit</TableHead>
                        <TableHead className="text-[9px] font-black h-9 text-right px-4 uppercase tracking-widest">Amount</TableHead>
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

              <DialogFooter className="bg-slate-50/50 p-4 border-t border-slate-100">
                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400" onClick={() => setSelectedPO(null)}>Close Viewer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive PO Dialog */}
      <Dialog open={isReceiving} onOpenChange={(open) => {
        if (!open) {
          setIsReceiving(false);
          setSelectedPO(null);
        }
      }}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100 text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">Receive Inventory</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">Verify and log quantities delivered by supplier</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 max-h-[400px] overflow-y-auto">
            <div className="space-y-4">
              {receivingItems.map((item, index) => (
                <div key={index} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-900">{item.product_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ordered: {item.quantity_ordered}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity_ordered}
                        value={item.quantity_received}
                        onChange={(e) => {
                          const newItems = [...receivingItems];
                          newItems[index].quantity_received = parseInt(
                            e.target.value
                          ) || 0;
                          setReceivingItems(newItems);
                        }}
                        className="h-11 w-24 bg-white border-slate-200 text-sm font-black text-center pr-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="bg-slate-50/50 p-4 border-t border-slate-100">
            <Button onClick={handleSubmitReceipt} className="h-10 px-8 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
              Synchronize Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
