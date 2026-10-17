import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, ArrowUpDown, Receipt, User, Calendar, Undo2, ChevronRight, FileText, Filter, FileDown } from "lucide-react";
import { getSales, getSaleItems, getSaleById } from "@/database/sales";
import SaleReturnDialog from "@/components/SaleReturnDialog";
import { TSale, TSaleItem } from "@/types/database";
import PrintInvoiceButton from "@/components/PrintInvoiceButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";
import SalesReportPDF from "@/components/pdf/SalesReportPDF";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SalesPage() {
  const { auth: { user } } = useAppStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'super_admin';

  const [sales, setSales] = useState<TSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<TSale | null>(null);
  const [saleItems, setSaleItems] = useState<TSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSales, setFilteredSales] = useState<TSale[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>("");
  const [exportEndDate, setExportEndDate] = useState<string>("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof TSale;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const data = await getSales(isAdmin ? undefined : user?.id);
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

  const [isReturnOpen, setIsReturnOpen] = useState(false);

  // After a void/return, refresh the list and the open sale so numbers reflect it.
  const handleReturnDone = async () => {
    const openId = selectedSale?.id;
    await loadSales();
    if (openId) {
      const [fresh, items] = await Promise.all([getSaleById(openId), getSaleItems(openId)]);
      if (fresh) setSelectedSale(fresh);
      setSaleItems(items);
    }
  };

  useEffect(() => {
    const filtered = sales.filter(
      (sale) =>
        sale?.customer_name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        sale?.employee_name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
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

    const sorted = [...filteredSales].sort((a: any, b: any) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredSales(sorted);
  };

  const buildExportRows = (salesToExport: TSale[]) => {
    return salesToExport.map((sale) => {
      const payments = sale.payments || [];
      const totals = payments.reduce(
        (acc, p) => {
          const method = p.payment_method?.toLowerCase?.() || "";
          if (method === "cash") acc.cash += p.amount;
          if (method === "pos") acc.pos += p.amount;
          if (method === "transfer") acc.transfer += p.amount;
          acc.paid += p.amount;
          acc.methods.add(p.payment_method);
          return acc;
        },
        { cash: 0, pos: 0, transfer: 0, paid: 0, methods: new Set<string>() }
      );

      return {
        Date: format(new Date(sale.created_at), "yyyy-MM-dd HH:mm"),
        Reference: sale.id,
        Customer: sale.customer_name || "Guest",
        Cashier: sale.employee_name || "",
        Total: sale.total_amount,
        Discount: sale.discount || 0,
        Paid: totals.paid,
        Cash: totals.cash,
        POS: totals.pos,
        Transfer: totals.transfer,
        Methods: Array.from(totals.methods).join(", "),
      };
    });
  };

  const filterByDateRange = (salesToExport: TSale[]) => {
    if (!exportStartDate && !exportEndDate) return salesToExport;
    const start = exportStartDate ? new Date(exportStartDate) : null;
    const end = exportEndDate ? new Date(exportEndDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return salesToExport.filter((sale) => {
      const dt = new Date(sale.created_at);
      if (start && dt < start) return false;
      if (end && dt > end) return false;
      return true;
    });
  };

  const getPaymentTotals = (salesToExport: TSale[]) => {
    return salesToExport.reduce(
      (acc, sale) => {
        const payments = sale.payments || [];
        for (const p of payments) {
          const method = p.payment_method?.toLowerCase?.() || "";
          if (method === "cash") acc.cash += p.amount;
          if (method === "pos") acc.pos += p.amount;
          if (method === "transfer") acc.transfer += p.amount;
          acc.total += p.amount;
        }
        return acc;
      },
      { cash: 0, pos: 0, transfer: 0, total: 0 }
    );
  };

  const downloadBlob = async (blob: Blob, filename: string) => {
    const buffer = await blob.arrayBuffer();
    const bytes = Array.from(new Uint8Array(buffer));
    await invoke("save_bytes_to_downloads", { filename, bytes });
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const scoped = filterByDateRange(filteredSales);
      const rows = buildExportRows(scoped);
      const totals = getPaymentTotals(scoped);
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.sheet_add_aoa(sheet, [
        [],
        ["Totals"],
        ["Cash", totals.cash],
        ["POS", totals.pos],
        ["Transfer", totals.transfer],
        ["Total", totals.total],
      ], { origin: -1 });
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Sales");
      const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadBlob(blob, `sales-export-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`);
    }catch(e){
      console.error("Error exporting to Excel:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      const scoped = filterByDateRange(filteredSales);
      const totals = getPaymentTotals(scoped);
      const doc = (
        <SalesReportPDF
          sales={scoped}
          title="Sales Report"
          businessName={useAppStore.getState().businessInfo.name}
          totals={totals}
        />
      );
      const blob = await pdf(doc).toBlob();
      downloadBlob(blob, `sales-report-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
    }catch(e){
      console.error("Error exporting to PDF:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const setPresetRange = (preset: "today" | "yesterday" | "week") => {
    const now = new Date();
    if (preset === "today") {
      const d = format(now, "yyyy-MM-dd");
      setExportStartDate(d);
      setExportEndDate(d);
      return;
    }
    if (preset === "yesterday") {
      const d = format(subDays(now, 1), "yyyy-MM-dd");
      setExportStartDate(d);
      setExportEndDate(d);
      return;
    }
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    setExportStartDate(format(start, "yyyy-MM-dd"));
    setExportEndDate(format(end, "yyyy-MM-dd"));
  };

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
              <h1 className="text-4xl font-black text-slate-900 mb-2">Transaction History</h1>
              <p className="text-slate-500 font-medium tracking-tight">Audit and manage all commercial operations</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsExportModalOpen(true)}
                className="border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] h-12 px-6"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by ID or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] h-9 px-4">
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  Filter Results: {filteredSales.length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-96 gap-3">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing transactions...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="w-[140px] px-6">
                      <Button variant="ghost" onClick={() => handleSort("id")} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 p-0">
                        Reference
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('created_at')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 p-0">
                        Timestamp
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('customer_name')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 p-0">
                        Merchant/Buyer
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    {isAdmin && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('employee_name')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 p-0">
                          Cashier
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                    )}
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('total_amount')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 p-0">
                        Gross Total
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Method</TableHead>
                    <TableHead className="text-right px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredSales.map((sale, index) => (
                      <motion.tr
                        key={sale.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleRowClick(sale)}
                        className="group cursor-pointer hover:bg-slate-50/50 border-slate-50 transition-colors"
                      >
                        <TableCell className="px-6 py-4 font-black text-slate-900 text-xs">
                          {sale.id.slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            <p className="text-xs font-bold text-slate-700">{format(new Date(sale.created_at), "MMM dd, HH:mm")}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-bold text-slate-900 text-sm">
                          {sale.customer_name || "Guest Customer"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-300" />
                              <p className="text-xs font-bold text-slate-700">{sale.employee_name || "Unknown"}</p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="py-4 font-black text-slate-900 text-sm">
                          ₦{sale.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex gap-1">
                            {sale.payments.map((p, i) => (
                              <Badge key={i} variant="outline" className="bg-slate-50 text-[8px] font-black uppercase tracking-widest border-slate-200 text-slate-600 px-2 h-5">
                                {p.payment_method}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 rounded-full">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
            {!isLoading && filteredSales.length === 0 && (
              <div className="flex flex-col justify-center items-center h-96 gap-4">
                <Receipt className="w-16 h-16 text-slate-100" />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-widest text-slate-900">No transactions recorded</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1">Try adjusting your search criteria</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-xl h-full border-l border-slate-200 p-0 flex flex-col bg-white">
          {selectedSale && (
            <>
              <SheetHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4 mb-2 text-slate-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Transaction Record</span>
                </div>
                <SheetTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
                  <span>REF-{selectedSale.id.slice(-8).toUpperCase()}</span>
                  {selectedSale.status === "voided" ? (
                    <Badge className="bg-red-50 text-red-600 border-none font-black text-[10px] uppercase tracking-widest">Voided</Badge>
                  ) : Number(selectedSale.returned_amount || 0) > 0 ? (
                    <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[10px] uppercase tracking-widest">Partly returned</Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest">Completed</Badge>
                  )}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                  {/* Summary Section */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><User className="w-3 h-3" /> Account</p>
                      <p className="font-bold text-slate-900">{selectedSale.customer_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Calendar className="w-3 h-3" /> Registry</p>
                      <p className="font-bold text-slate-900">{format(new Date(selectedSale.created_at), "PPpp")}</p>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Liquidation</h4>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="text-[8px] font-black uppercase text-slate-400 h-10">Product</TableHead>
                            <TableHead className="text-[8px] font-black uppercase text-slate-400 h-10">Qty</TableHead>
                            <TableHead className="text-[8px] font-black uppercase text-slate-400 h-10 text-right">Unit</TableHead>
                            <TableHead className="text-[8px] font-black uppercase text-slate-400 h-10 text-right px-4">Gross</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleItems.map((item) => (
                            <TableRow key={item.id} className="border-slate-50 hover:bg-transparent">
                              <TableCell className="text-xs font-bold text-slate-900">{item.product_name}</TableCell>
                              <TableCell className="text-xs font-bold text-slate-500">
                                {item.quantity}
                                {item.unit_abbrev ? <span className="text-[10px] text-slate-400 ml-1 uppercase">({item.unit_abbrev})</span> : null}
                              </TableCell>
                              <TableCell className="text-xs font-bold text-slate-500 text-right">₦{item.unit_price.toLocaleString()}</TableCell>
                              <TableCell className="text-xs font-bold text-slate-900 text-right px-4">₦{item.total_price.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div className="space-y-4 p-6 bg-slate-900 rounded-3xl text-white">
                    <div className="flex justify-between items-center opacity-60">
                      <span className="text-[10px] font-black uppercase tracking-widest">Subtotal Volume</span>
                      <span className="text-xs font-bold">₦{selectedSale.total_amount.toLocaleString()}</span>
                    </div>
                    {Number(selectedSale.returned_amount || 0) > 0 && (
                      <div className="flex justify-between items-center opacity-60 text-red-300">
                        <span className="text-[10px] font-black uppercase tracking-widest">Returned</span>
                        <span className="text-xs font-bold">-₦{Number(selectedSale.returned_amount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-4 border-y border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest">Total Valuation</span>
                      <span className="text-2xl font-black">₦{(selectedSale.total_amount - Number(selectedSale.returned_amount || 0)).toLocaleString()}</span>
                    </div>
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Payment Synchronization</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedSale.payments.map((p, i) => (
                          <div key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between w-full">
                            <span className="text-[10px] font-bold uppercase">{p.payment_method}</span>
                            <span className="text-xs font-black">₦{p.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-8 border-t border-slate-200 flex items-center justify-between gap-4">
                <PrintInvoiceButton sale={selectedSale} items={saleItems} debt={false} />
                {isAdmin && selectedSale.status !== "voided" && (
                  <Button
                    variant="ghost"
                    onClick={() => setIsReturnOpen(true)}
                    className="text-slate-500 hover:text-red-600 h-12 px-4 rounded-2xl transition-colors text-[10px] font-black uppercase tracking-widest"
                  >
                    <Undo2 className="w-4 h-4 mr-2" /> Void / Return
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {selectedSale && (
        <SaleReturnDialog
          sale={selectedSale}
          items={saleItems}
          open={isReturnOpen}
          onOpenChange={setIsReturnOpen}
          onDone={handleReturnDone}
        />
      )}

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Export Sales</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Choose a date range and export format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPresetRange("today")} className="text-[10px] font-black uppercase tracking-widest">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange("yesterday")} className="text-[10px] font-black uppercase tracking-widest">
                Yesterday
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange("week")} className="text-[10px] font-black uppercase tracking-widest">
                This Week
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</Label>
                <Input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="h-10 bg-white border-slate-200 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</Label>
                <Input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="h-10 bg-white border-slate-200 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                disabled={isExporting}
                onClick={exportToExcel}
                className="border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] h-10 px-4"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                disabled={isExporting}
                onClick={exportToPDF}
                className="border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] h-10 px-4"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
