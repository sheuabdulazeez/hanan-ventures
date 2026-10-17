import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, ArrowLeftRight, Package } from "lucide-react";
import { getPaymentSummaryByDate, getProductSummaryByDate } from "@/database/cashier-summary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getUsers } from "@/database/user";

export default function CashierSummaryPage() {
  const { auth: { user } } = useAppStore();
  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "super_admin";
  const [isLoading, setIsLoading] = useState(true);
  const [cashiers, setCashiers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [paymentSummary, setPaymentSummary] = useState<{ cash: number; pos: number; transfer: number; total: number }>({
    cash: 0,
    pos: 0,
    transfer: 0,
    total: 0,
  });
  const [productSummary, setProductSummary] = useState<Array<{ product_name: string; unit_abbrev: string | null; quantity: number }>>([]);

  useEffect(() => {
    if (!isAdmin) {
      setSelectedCashierId(user?.id || "");
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    async function loadCashiers() {
      if (!isAdmin) return;
      try {
        const users = await getUsers();
        const cashierList = users
          .filter((u: any) => u.role === "sales" || u.role === "cashier")
          .map((u: any) => ({ id: u.id, name: u.name }));
        setCashiers(cashierList);
        if (!selectedCashierId && cashierList.length > 0) {
          setSelectedCashierId(cashierList[0].id);
        }
      } catch (error) {
        console.error("Failed to load cashiers:", error);
      }
    }
    loadCashiers();
  }, [isAdmin, selectedCashierId]);

  useEffect(() => {
    async function loadSummary() {
      const cashierId = isAdmin ? selectedCashierId : user?.id;
      if (!cashierId) return;
      setIsLoading(true);
      try {
        const [payments, products] = await Promise.all([
          getPaymentSummaryByDate(cashierId, selectedDate),
          getProductSummaryByDate(cashierId, selectedDate),
        ]);

        const totals = { cash: 0, pos: 0, transfer: 0, total: 0 };
        for (const row of payments) {
          const method = row.payment_method?.toLowerCase?.() || "";
          if (method === "cash") totals.cash = row.total;
          if (method === "pos") totals.pos = row.total;
          if (method === "transfer") totals.transfer = row.total;
          totals.total += row.total;
        }

        setPaymentSummary(totals);
        setProductSummary(products);
      } catch (error) {
        console.error("Failed to load cashier summary:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSummary();
  }, [user?.id, isAdmin, selectedCashierId, selectedDate]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Daily Cashier Summary</h1>
              <p className="text-slate-500 font-medium tracking-tight">
                {format(new Date(selectedDate), "PPP")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Select value={selectedCashierId} onValueChange={setSelectedCashierId}>
                  <SelectTrigger className="h-9 bg-white border-slate-200 font-bold text-xs w-[220px]">
                    <SelectValue placeholder="Select Cashier" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashiers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-bold">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isAdmin && (
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 w-[160px] bg-white border-slate-200 text-xs font-bold"
                />
              )}
              {!isAdmin && (
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[10px] h-9 px-4">
                  {user?.name || "Cashier"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                  <Banknote className="w-5 h-5" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest">Cash</Badge>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Cash</p>
              <p className="text-2xl font-black text-slate-900">₦{paymentSummary.cash.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                  <CreditCard className="w-5 h-5" />
                </div>
                <Badge className="bg-blue-50 text-blue-600 border-none text-[9px] font-black uppercase tracking-widest">POS</Badge>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total POS</p>
              <p className="text-2xl font-black text-slate-900">₦{paymentSummary.pos.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <Badge className="bg-amber-50 text-amber-600 border-none text-[9px] font-black uppercase tracking-widest">Transfer</Badge>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Transfer</p>
              <p className="text-2xl font-black text-slate-900">₦{paymentSummary.transfer.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Received</p>
              <p className="text-2xl font-black text-white">₦{paymentSummary.total.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Products Sold</CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Quantity sold per product and unit
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-48 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading summary...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6">Product</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right px-6">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummary.map((row, idx) => (
                    <TableRow key={`${row.product_name}-${row.unit_abbrev}-${idx}`} className="hover:bg-slate-50">
                      <TableCell className="px-6 py-4 text-xs font-black text-slate-900">{row.product_name}</TableCell>
                      <TableCell className="py-4 text-xs font-bold text-slate-500 uppercase">{row.unit_abbrev || "-"}</TableCell>
                      <TableCell className="px-6 py-4 text-right text-xs font-black text-slate-900">{row.quantity}</TableCell>
                    </TableRow>
                  ))}
                  {productSummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-40 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">No sales recorded today</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
