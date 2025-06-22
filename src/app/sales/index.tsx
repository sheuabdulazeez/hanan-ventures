import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Sheet,
  SheetContent
} from "@components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Search, ArrowUpDown } from "lucide-react";
import { getSales, getSaleItems, deleteSale } from "@/database/sales";
import { TSale, TSaleItem } from "@/types/database";
import PrintInvoiceButton from "@/components/PrintInvoiceButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Add this import
import { Trash2 } from "lucide-react"; // Add this import
import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SalesPage() {
  const { auth: { user } } = useAppStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [sales, setSales] = useState<TSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<TSale | null>(null);
  const [saleItems, setSaleItems] = useState<TSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSales, setFilteredSales] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false)

  const [sortConfig, setSortConfig] = useState<{
    key: keyof TSale;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const data = await getSales();
      setSales(data);
      setFilteredSales(data);
    } catch (error) {
      console.error("Failed to load sales:", error);
    } finally {
      setIsLoading(false);
    }
  }
  const handleRowClick = async (sale: TSale) => {
    try {
      const items = await getSaleItems(sale.id);
      setSaleItems(items);
      setSelectedSale(sale);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error("Failed to load sale items:", error);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      await deleteSale(saleId);
      await loadSales();
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Failed to delete sale:", error);
    }
  };

  useEffect(() => {
    const filtered = sales.filter(
      (sale) =>
        sale.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSales(filtered);
  }, [searchTerm, sales]);


  const handleSort = (key: keyof TSale) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredSales].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredSales(sorted);
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <CardDescription>
            {isAdmin 
              ? "Manage and view all sales transactions."
              : "View recent sales transactions."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {isAdmin && <Button variant="outline">Export</Button>}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button variant="ghost" onClick={() => handleSort("id")}>
                      ID
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('sale_date')}>
                      Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('customer_name')}
                    >
                      Customer
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('total_amount')}>
                      Total
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      Loading sales...
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      onClick={() => handleRowClick(sale)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">{sale.id.slice(-8).toUpperCase()}</TableCell>
                      <TableCell>
                        {format(new Date(sale.created_at), "PPpp")}
                      </TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell>₦{sale.total_amount.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">
                        {sale.payments.map((payment) => payment.payment_method).join(", ") || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-[540px] h-screen">
          <ScrollArea className="h-[98vh]">
            {selectedSale && (
              <div className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sale Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                      <strong>Customer:</strong> {selectedSale.customer_name}
                    </p>
                    <p>
                      <strong>Cashier:</strong> {selectedSale.employee_name}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {format(new Date(selectedSale.created_at), "PPpp")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₦{item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>₦{item.total_price.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">
                          Total: ₦{selectedSale.total_amount.toFixed(2)}
                        </p>
                        <p>
                          Payment Method:{" "}
                          <span className="capitalize">
                            {selectedSale.payments.map((payment) => payment.payment_method).join(", ") || "N/A"}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <PrintInvoiceButton sale={selectedSale} items={saleItems} />
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this sale? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSale(selectedSale.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
