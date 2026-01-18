import { getProducts, updateProductPrices, updateProduct } from "@/database/products";
import { InventoryAdjustmentType, TProduct } from "@/types/database";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateProductQuantity } from "@/database/products";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrintStockReportButton } from "@/components/PrintStockReportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  Trash2,
  Package,
  Boxes,
  ChartLine,
  AlertTriangle,
  Pencil,
  Eye,
  History,
  TrendingDown,
  TrendingUp,
  Tag,
  Warehouse
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function Stocks() {
  const navigate = useNavigate();
  const {
    auth: { user },
  } = useAppStore();
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const [selectedProduct, setSelectedProduct] = useState<TProduct | null>(null);
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<InventoryAdjustmentType>(InventoryAdjustmentType.INCREASE);
  const [newSellingPrice, setNewSellingPrice] = useState<number | null>(null);
  const [newCostPrice, setNewCostPrice] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"quantity" | "price" | "details">("details");
  const [editForm, setEditForm] = useState({ name: "", category: "", stockAlert: 0 });
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [products, setProducts] = useState<TProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const itemPerPage = 10;

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const res = await getProducts();
      setProducts(res);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products"
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdate = async () => {
    try {
      if (!selectedProduct) return;

      if (activeTab === "details") {
        await updateProduct(selectedProduct.id, {
          name: editForm.name,
          category: editForm.category,
          reorder_level: editForm.stockAlert
        });
      } else if (activeTab === "quantity") {
        if (quantityChange) {
          await updateProductQuantity(
            selectedProduct.id,
            quantityChange,
            adjustmentType,
            adjustmentReason
          );
        }
      } else if (activeTab === "price") {
        const priceUpdates: { costPrice?: number; sellingPrice?: number } = {};
        if (newCostPrice !== null && newCostPrice !== selectedProduct.cost_price) priceUpdates.costPrice = newCostPrice;
        if (newSellingPrice !== null && newSellingPrice !== selectedProduct.selling_price) priceUpdates.sellingPrice = newSellingPrice;

        if (Object.keys(priceUpdates).length > 0) {
          await updateProductPrices(selectedProduct.id, priceUpdates, adjustmentReason, user.id);
        }
      }

      await loadProducts();
      setSelectedProduct(null);
      setQuantityChange(0);
      setAdjustmentReason("");
      setNewSellingPrice(null);
      setNewCostPrice(null);
      setEditForm({ name: "", category: "", stockAlert: 0 });
      setActiveTab("details");

      toast({
        title: "Success",
        description: `Product ${activeTab} updated successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update product ${activeTab}`,
      });
    }
  };

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemPerPage);

  const totalCost = products.reduce((sum, p) => sum + (p.cost_price * p.quantity_on_hand), 0);
  const totalSellingValue = products.reduce((sum, p) => sum + (p.selling_price * p.quantity_on_hand), 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity_on_hand, 0);
  const potentialProfit = totalSellingValue - totalCost;
  const lowStockItems = products.filter(p => p.quantity_on_hand <= (p.reorder_level || 0)).length;

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
              <h1 className="text-4xl font-black text-slate-900 mb-2">Inventory</h1>
              <p className="text-slate-500 font-medium tracking-tight">Monitor and manage your product stock levels</p>
            </div>
            <div className="flex items-center gap-3">
              <PrintStockReportButton products={products} />
              {isAdmin && (
                <Link to="/dashboard/stocks/create">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs h-12 px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    New Product
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 transition-transform group-hover:scale-110">
                  <Warehouse className="w-5 h-5" />
                </div>
                {lowStockItems > 0 && (
                  <Badge className="bg-red-50 text-red-600 border-none text-[8px] font-black uppercase">{lowStockItems} Alert</Badge>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Products</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{products.length}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{totalQuantity.toLocaleString()} Units</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 transition-transform group-hover:scale-110">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost Value</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₦{totalCost.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Investment</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 transition-transform group-hover:scale-110">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exit Value</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₦{totalSellingValue.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Potential Rev.</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white transition-transform group-hover:scale-110">
                  <ChartLine className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poten. Profit</p>
              <p className="text-2xl font-black text-slate-900 mt-1">₦{potentialProfit.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{totalCost > 0 ? ((potentialProfit / totalCost) * 100).toFixed(1) : 0}% Margin</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-110">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Low Stock</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{lowStockItems}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Attention Required</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search products or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Boxes className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{filteredProducts.length} Products</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing inventory...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Product Details</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Pricing</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Stock</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Margin</TableHead>
                    {isAdmin && <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right px-6">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {currentProducts.map((p, index) => {
                      const isLowStock = p.quantity_on_hand <= (p.reorder_level || 0);
                      const margin = p.selling_price - p.cost_price;
                      const marginPercent = p.cost_price > 0 ? (margin / p.cost_price) * 100 : 0;

                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`group hover:bg-slate-50/50 border-slate-50 transition-colors ${isLowStock ? 'bg-amber-50/30' : ''}`}
                        >
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${isLowStock ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-sm leading-tight">{p.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter h-4 px-1 border-slate-200 text-slate-400">{p.category}</Badge>
                                  {isLowStock && <span className="flex items-center text-[8px] font-black uppercase text-amber-600 gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> REORDER</span>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-0.5">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tighter flex items-center gap-1.5">
                                <span className="text-[8px] text-slate-400">SELL:</span> ₦{p.selling_price.toLocaleString()}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                <span className="text-[8px] uppercase tracking-tighter">COST:</span> ₦{p.cost_price.toLocaleString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <p className={`text-lg font-black leading-none ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>{p.quantity_on_hand.toLocaleString()}</p>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Units</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <p className="text-xs font-black text-emerald-600">₦{margin.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-slate-400">{marginPercent.toFixed(1)}%</p>
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right px-6 py-4 space-x-1">
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/dashboard/product-analysis/${p.id}`)}
                                  className="h-8 px-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProduct(p);
                                        setEditForm({
                                          name: p.name,
                                          category: p.category,
                                          stockAlert: p.reorder_level || 0
                                        });
                                        setNewSellingPrice(p.selling_price);
                                        setNewCostPrice(p.cost_price);
                                      }}
                                      className="h-8 px-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-lg bg-white border-slate-200 p-0 overflow-hidden">
                                    <DialogHeader className="p-6 bg-slate-50/50 border-b border-slate-100 text-left">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                                          <Boxes className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <DialogTitle className="text-xl font-black text-slate-900">Adjust Inventory</DialogTitle>
                                          <DialogDescription className="text-slate-500 font-medium">{p.name}</DialogDescription>
                                        </div>
                                      </div>
                                    </DialogHeader>

                                    <div className="px-6 py-4">
                                      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                                        <TabsList className="bg-slate-100/50 w-full p-1 h-12 grid grid-cols-3">
                                          <TabsTrigger value="details" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">General</TabsTrigger>
                                          <TabsTrigger value="quantity" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Stock</TabsTrigger>
                                          <TabsTrigger value="price" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Pricing</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="details" className="mt-6 space-y-4">
                                          <div className="grid gap-4">
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Tag className="w-3 h-3" /> Product Name</Label>
                                              <Input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Boxes className="w-3 h-3" /> Category</Label>
                                              <Input value={editForm.category} onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))} className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Reorder Level</Label>
                                              <Input type="number" value={editForm.stockAlert} onChange={(e) => setEditForm(prev => ({ ...prev, stockAlert: parseInt(e.target.value) || 0 }))} className="h-11 bg-slate-50 border-slate-200 font-bold text-slate-700" />
                                            </div>
                                          </div>
                                        </TabsContent>

                                        <TabsContent value="quantity" className="mt-6 space-y-4">
                                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-left">
                                            <div className="flex justify-between items-end">
                                              <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">On Hand</p>
                                                <p className="text-3xl font-black text-slate-900">{p.quantity_on_hand}</p>
                                              </div>
                                              <div className="flex h-10 w-fit bg-white border border-slate-200 rounded-lg p-1">
                                                <Button variant={adjustmentType === InventoryAdjustmentType.INCREASE ? "default" : "ghost"} size="sm" onClick={() => setAdjustmentType(InventoryAdjustmentType.INCREASE)} className={`h-full text-[10px] font-black uppercase ${adjustmentType === InventoryAdjustmentType.INCREASE ? 'bg-slate-900 text-white' : 'text-slate-400'}`}><TrendingUp className="w-3 h-3 mr-1" /> Add</Button>
                                                <Button variant={adjustmentType === InventoryAdjustmentType.DECREASE ? "default" : "ghost"} size="sm" onClick={() => setAdjustmentType(InventoryAdjustmentType.DECREASE)} className={`h-full text-[10px] font-black uppercase ${adjustmentType === InventoryAdjustmentType.DECREASE ? 'bg-slate-900 text-white' : 'text-slate-400'}`}><TrendingDown className="w-3 h-3 mr-1" /> Remove</Button>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="space-y-4 text-left">
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">Adjustment Quantity</Label>
                                              <Input type="number" step="0.5" min="0" value={Math.abs(quantityChange)} onChange={(e) => setQuantityChange(parseFloat(e.target.value) || 0)} className="h-12 text-2xl font-black text-center border-slate-200 bg-slate-50" />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History className="w-3 h-3" /> Reason</Label>
                                              <Textarea value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder="Why is this stock being adjusted?" className="bg-slate-50 border-slate-200 font-medium" />
                                            </div>
                                          </div>
                                        </TabsContent>

                                        <TabsContent value="price" className="mt-6 space-y-4">
                                          <div className="grid grid-cols-2 gap-4 text-left">
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Cost Price</Label>
                                              <Input type="number" step="0.01" value={newCostPrice ?? ""} onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || null)} className="h-11 bg-slate-50 border-slate-200 font-black text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Selling Price</Label>
                                              <Input type="number" step="0.01" value={newSellingPrice ?? ""} onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || null)} className="h-11 bg-slate-50 border-slate-200 font-black text-slate-900" />
                                            </div>
                                          </div>
                                          <div className="space-y-2 text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History className="w-3 h-3" /> Reason</Label>
                                            <Textarea value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder="Reason for price update..." className="bg-slate-50 border-slate-200 font-medium" />
                                          </div>
                                        </TabsContent>
                                      </Tabs>
                                    </div>

                                    <DialogFooter className="bg-slate-50/50 p-4 border-t border-slate-100 flex-row justify-end space-x-2">
                                      <DialogClose asChild>
                                        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100">Cancel</Button>
                                      </DialogClose>
                                      <Button
                                        onClick={handleUpdate}
                                        disabled={
                                          activeTab === "details" ? !editForm.name.trim() :
                                            activeTab === "quantity" ? !quantityChange || !adjustmentReason.trim() :
                                              (!newSellingPrice && !newCostPrice) || !adjustmentReason.trim()
                                        }
                                        className="h-10 px-8 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
                                      >
                                        Save Changes
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Package className="w-12 h-12 text-slate-100" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No inventory matches found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 p-0 text-[10px] font-black ${currentPage === i + 1
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-900"
                  }`}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
