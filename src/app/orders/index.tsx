"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  PlusCircle,
  Search,
  ArrowUpDown,
  FileText,
  Truck,
  XCircle,
  CheckCircle,
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

  const statusIcon = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "received":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "partially_received":
        return <XCircle className="h-4 w-4 text-gray-500" />;
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
  };

  const handleSubmitReceipt = async () => {
    try {
      await createPurchaseReceipt({
        purchase_order_id: selectedPO!.id,
        employee_id: user!.id,
        items: receivingItems.map((item) => ({
          product_id: item.product_id,
          quantity_received: item.quantity_received,
        })),
      });

      setIsReceiving(false);
      setReceivingItems([]);
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
      console.log(error)
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
    <div className="container mx-auto py-10">
      {/* Header and search section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6">Purchase Orders</h1>

        <Card>
          <CardHeader>
            <CardTitle>Manage Purchase Orders</CardTitle>
            <CardDescription>Create and manage purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Create button */}
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                    <DialogDescription>
                      Create a new purchase order for your suppliers
                    </DialogDescription>
                  </DialogHeader>

                  {/* Create PO Form */}
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="supplier" className="text-right">
                        Supplier
                      </Label>
                      <Select
                        value={newPO.supplier_id}
                        onValueChange={(value) =>
                          setNewPO((prev) => ({ ...prev, supplier_id: value }))
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.supplier_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Items</Label>
                      <div className="col-span-3 space-y-2">
                        {newPO.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Select
                              value={item.product_id}
                              onValueChange={(value) =>
                                updateItem(index, "product_id", value)
                              }
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                  >
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={item.quantity_ordered}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity_ordered",
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-24"
                              min="1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" onClick={addNewItem}>
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={handleCreatePO}>Create Order</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Purchase Orders Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredPOs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPOs.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>{po.id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell>{po.supplier_name}</TableCell>
                        <TableCell>
                          {format(new Date(po.order_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="flex w-fit items-center gap-1"
                          >
                            {statusIcon(po.status)}
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPO(po)}
                          >
                            View
                          </Button>
                          {user?.role === "admin" &&
                            po.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(po.id, "partially_received")
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(po.id, "cancelled")
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          {(po.status === "approved" ||
                            po.status === "partially_received") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReceivePO(po)}
                            >
                              Receive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* View PO Dialog */}
      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Order ID</Label>
                    <div className="font-medium">
                      {selectedPO.id.slice(-8).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <div className="font-medium">
                      {selectedPO.supplier_name}
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <div>{format(new Date(selectedPO.order_date), "PPP")}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge
                      variant="outline"
                      className="flex w-fit items-center gap-1"
                    >
                      {statusIcon(selectedPO.status)}
                      {selectedPO.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity_ordered}</TableCell>
                          <TableCell>₦{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>
                            ₦
                            {(item.quantity_ordered * item.unit_price).toFixed(
                              2
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive PO Dialog */}
      <Dialog open={isReceiving} onOpenChange={setIsReceiving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Items</DialogTitle>
            <DialogDescription>
              Enter the quantities received for each item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Receiving</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity_ordered}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity_ordered}
                        value={item.quantity_received}
                        onChange={(e) => {
                          const newItems = [...receivingItems];
                          newItems[index].quantity_received = parseInt(
                            e.target.value
                          );
                          setReceivingItems(newItems);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitReceipt}>Confirm Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
