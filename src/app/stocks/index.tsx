import { getProducts, updateProductPrices, updateProduct } from "@/database/products";
import { TProduct } from "@/types/database";
import { useEffect, useState } from "react";
import { FaTrash, FaFileExport, FaFileImport, FaPlus, FaEye } from "react-icons/fa";
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
import { FaPencilAlt } from "react-icons/fa";
import { useAppStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrintStockReportButton } from "@/components/PrintStockReportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaDollarSign, FaBoxes, FaChartLine } from "react-icons/fa";

export default function Stocks() {
  const navigate = useNavigate();
  const {
    auth: { user },
  } = useAppStore();
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const [selectedProduct, setSelectedProduct] = useState<TProduct | null>(null);
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [newSellingPrice, setNewSellingPrice] = useState<number | null>(null);
  const [newCostPrice, setNewCostPrice] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"quantity" | "price" | "details">("details");
  const [editForm, setEditForm] = useState({ name: "", category: "", stockAlert: 0 });
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [products, setProducts] = useState<TProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemPerPage = 10;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    // TODO: handle delete
  };

  const handleUpdate = async () => {
    try {
      if (activeTab === "details") {
        // Update product details
        await updateProduct(selectedProduct!.id, {
          name: editForm.name,
          category: editForm.category,
          reorder_level: editForm.stockAlert
        });
      } else if (activeTab === "quantity") {
        // Update quantity
        if (quantityChange) {
          await updateProductQuantity(
            selectedProduct!.id,
            quantityChange,
            adjustmentReason
          );
        }
      } else if (activeTab === "price") {
        // Update prices with tracking
        const priceUpdates: { costPrice?: number; sellingPrice?: number } = {};
        
        if (
          newCostPrice !== null &&
          newCostPrice !== selectedProduct?.cost_price
        ) {
          priceUpdates.costPrice = newCostPrice;
        }
        
        if (
          newSellingPrice !== null &&
          newSellingPrice !== selectedProduct?.selling_price
        ) {
          priceUpdates.sellingPrice = newSellingPrice;
        }
        
        if (Object.keys(priceUpdates).length > 0) {
          await updateProductPrices(
            selectedProduct!.id,
            priceUpdates,
            adjustmentReason,
            user.id
          );
        }
      }

      // Refresh products
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Reset form
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
      console.error('Update error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update product ${activeTab}`,
      });
    }
  };

  useEffect(() => {
    getProducts().then((res) => {
      setProducts(res);
    });
  }, []);

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(filteredProducts.length / itemPerPage);
  const maxPageButtons = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  // Calculate analytics
  const totalCost = products.reduce((sum, product) => sum + (product.cost_price * product.quantity_on_hand), 0);
  const totalSellingValue = products.reduce((sum, product) => sum + (product.selling_price * product.quantity_on_hand), 0);
  const totalQuantity = products.reduce((sum, product) => sum + product.quantity_on_hand, 0);
  const potentialProfit = totalSellingValue - totalCost;
  const lowStockItems = products.filter(product => product.quantity_on_hand <= product.reorder_level).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Stocks / Inventory</h1>
        <div className="space-x-2 flex">
          <PrintStockReportButton products={products} />
          {/* Add Product Button Link */}
          {isAdmin && (
            <div className="flex space-x-2">
              <Link
                to="/dashboard/stocks/create"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition duration-300"
              >
                <FaPlus className="mr-2" /> Add Product
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <FaBoxes className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalQuantity} total units
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Value</CardTitle>
            <FaDollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Inventory cost value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Selling Value</CardTitle>
            <FaDollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalSellingValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Potential revenue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
            <FaChartLine className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{potentialProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((potentialProfit / totalCost) * 100).toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <FaBoxes className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items need reorder
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 w-full"
        />
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Selling Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity on Hand
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProducts.map((p) => (
              <tr 
                key={p.id} 
                className={`hover:bg-gray-50 cursor-pointer ${p.quantity_on_hand < p.reorder_level ? 'bg-red-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₦{p.cost_price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₦{p.selling_price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.quantity_on_hand}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/product-analysis/${p.id}`);
                      }}
                      className="text-green-600 hover:text-green-900 mr-2"
                      title="View Analysis"
                    >
                      <FaEye />
                    </button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
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
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Product"
                        >
                          <FaPencilAlt />
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Product</DialogTitle>
                          <DialogDescription>
                            Adjust quantity or price for {selectedProduct?.name}
                          </DialogDescription>
                        </DialogHeader>

                        <Tabs
                          value={activeTab}
                          onValueChange={(value) =>
                            setActiveTab(value as "details" | "quantity" | "price")
                          }
                        >
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">
                              Product Details
                            </TabsTrigger>
                            <TabsTrigger value="quantity">
                              Quantity Adjustment
                            </TabsTrigger>
                            <TabsTrigger value="price">
                              Price Adjustment
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="details" className="space-y-4">
                            <div className="space-y-2">
                              <Label>Product Name</Label>
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter product name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Category</Label>
                              <Input
                                value={editForm.category}
                                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                                placeholder="Enter product category"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Stock Alert Level</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editForm.stockAlert}
                                onChange={(e) => setEditForm(prev => ({ ...prev, stockAlert: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="Set stock alert level"
                              />
                              <div className="text-xs text-muted-foreground">
                                Set the stock level at which to receive an alert.
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="quantity" className="space-y-4">
                            <div className="space-y-2">
                              <Label>Current Quantity</Label>
                              <div className="text-sm">
                                {selectedProduct?.quantity_on_hand}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Adjustment Type</Label>
                              <div className="flex space-x-2">
                                <Button
                                  variant={
                                    adjustmentType === "add"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => setAdjustmentType("add")}
                                  className="flex-1"
                                >
                                  Add
                                </Button>
                                <Button
                                  variant={
                                    adjustmentType === "remove"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => setAdjustmentType("remove")}
                                  className="flex-1"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Quantity to {adjustmentType}</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max={
                                  adjustmentType === "remove"
                                    ? selectedProduct?.quantity_on_hand
                                    : undefined
                                }
                                value={Math.abs(quantityChange)}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setQuantityChange(
                                    adjustmentType === "remove" ? -value : value
                                  );
                                }}
                                className="text-center"
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {adjustmentType === "add" ? "Adding" : "Removing"}{" "}
                              {Math.abs(quantityChange)} units
                            </div>
                          </TabsContent>

                          <TabsContent value="price" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Current Cost Price</Label>
                                <div className="text-sm font-medium">
                                  ₦{selectedProduct?.cost_price}
                                </div>
                                <Label>New Cost Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newCostPrice ?? ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    setNewCostPrice(
                                      isNaN(value) ? null : value
                                    );
                                  }}
                                  placeholder="Enter new cost price"
                                  className="text-center"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Current Selling Price</Label>
                                <div className="text-sm font-medium">
                                  ₦{selectedProduct?.selling_price}
                                </div>
                                <Label>New Selling Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newSellingPrice ?? ""}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    setNewSellingPrice(
                                      isNaN(value) ? null : value
                                    );
                                  }}
                                  placeholder="Enter new selling price"
                                  className="text-center"
                                />
                              </div>
                            </div>
                            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                              ⚠️ Price changes will be recorded for product analysis and tracking.
                            </div>
                          </TabsContent>
                        </Tabs>

                        {(activeTab === "quantity" || activeTab === "price") && (
                          <div className="space-y-2">
                            <Label htmlFor="reason">Reason for {activeTab === "quantity" ? "Quantity" : "Price"} Change</Label>
                            <Textarea
                              id="reason"
                              value={adjustmentReason}
                              onChange={(e) =>
                                setAdjustmentReason(e.target.value)
                              }
                              placeholder={`Enter reason for ${
                                activeTab === "quantity" ? "quantity" : "price"
                              } change`}
                            />
                          </div>
                        )}

                        <DialogFooter>
                          <DialogClose asChild>
                            <Button
                              onClick={handleUpdate}
                              disabled={
                                activeTab === "details" 
                                  ? !editForm.name.trim() || !editForm.category.trim()
                                  : activeTab === "quantity"
                                  ? !quantityChange || !adjustmentReason.trim()
                                  : (!newSellingPrice && !newCostPrice) || !adjustmentReason.trim()
                              }
                            >
                              Update{" "}
                              {activeTab === "details" ? "Product" : activeTab === "quantity" ? "Quantity" : "Price"}
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Product"
                    >
                      <FaTrash />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center mt-4">
        <nav>
          <ul className="inline-flex items-center -space-x-px">
            {Array.from({ length: endPage - startPage + 1 }, (_, index) => (
              <li key={index}>
                <button
                  onClick={() => paginate(startPage + index)}
                  className={`px-3 py-2 leading-tight ${
                    currentPage === startPage + index
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500"
                  } border border-gray-300 hover:bg-gray-100 hover:text-gray-700`}
                >
                  {startPage + index}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
