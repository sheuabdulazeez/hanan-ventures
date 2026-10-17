import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Supplier } from "@/database/suppliers";
import {
  getSupplierBalanceSummary,
  getSupplierPayablesBySupplier,
  getSupplierPaymentHistory,
} from "@/database/supplier-payments";
import {
  TSupplierBalanceSummary,
  TSupplierPayable,
  TSupplierPayment,
} from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2, Plus, Wallet } from "lucide-react";
import SupplierPaymentDialog from "./SupplierPaymentDialog";
import AllocateSupplierCreditDialog from "./AllocateSupplierCreditDialog";

type SupplierPayableRow = TSupplierPayable & {
  outstanding_amount?: number;
  total_paid?: number;
  order_date?: string;
};

type PaymentsProps = {
  suppliers: Supplier[];
};

const emptySummary: TSupplierBalanceSummary = {
  supplier_id: "",
  total_accrued: 0,
  total_allocated_paid: 0,
  unapplied_credit: 0,
  net_outstanding: 0,
};

function getPaymentModeLabel(payment: TSupplierPayment) {
  const allocatedAmount = Number(payment.allocated_amount || 0);
  const remainingCredit = Number(payment.remaining_credit || 0);

  if (payment.is_unapplied_credit && remainingCredit > 0 && allocatedAmount > 0) {
    return "Credit + Partial Allocation";
  }

  if (payment.is_unapplied_credit) {
    return remainingCredit > 0 ? "Supplier Credit" : "Credit Allocated";
  }

  return "Allocated to PO";
}

export default function Payments({ suppliers }: PaymentsProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [summary, setSummary] = useState<TSupplierBalanceSummary>(emptySummary);
  const [payables, setPayables] = useState<SupplierPayableRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<TSupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDialogPOId, setPaymentDialogPOId] = useState<string | null>(null);
  const [creditToAllocate, setCreditToAllocate] = useState<TSupplierPayment | null>(null);

  useEffect(() => {
    if (!selectedSupplierId && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [selectedSupplierId, suppliers]);

  const loadSupplierData = async (supplierId: string) => {
    if (!supplierId) {
      setSummary(emptySummary);
      setPayables([]);
      setPaymentHistory([]);
      return;
    }

    setLoading(true);
    try {
      const [summaryData, payablesData, historyData] = await Promise.all([
        getSupplierBalanceSummary(supplierId),
        getSupplierPayablesBySupplier(supplierId),
        getSupplierPaymentHistory(supplierId),
      ]);

      setSummary(summaryData);
      setPayables(payablesData);
      setPaymentHistory(historyData);
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to load supplier payments",
        description: "We could not load the selected supplier payment data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplierData(selectedSupplierId);
  }, [selectedSupplierId]);

  const outstandingPayables = payables.filter(
    (payable) => Number(payable.outstanding_amount || 0) > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Supplier Payments</h2>
          <p className="text-sm text-slate-500">
            Record part-payments, hold supplier credit, and track what is still owed.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:min-w-[320px]">
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-bold">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id} className="font-bold">
                  {supplier.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]"
            onClick={() => {
              setPaymentDialogPOId(null);
              setShowPaymentDialog(true);
            }}
            disabled={!selectedSupplierId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Accrued
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              ₦{Number(summary.total_accrued || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Allocated Paid
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-600">
              ₦{Number(summary.total_allocated_paid || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Unapplied Credit
            </p>
            <p className="mt-2 text-2xl font-black text-blue-600">
              ₦{Number(summary.unapplied_credit || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-900 text-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Net Outstanding
            </p>
            <p className="mt-2 text-2xl font-black">
              ₦{Number(summary.net_outstanding || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="bg-white border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900">
              <Wallet className="h-4 w-4 text-slate-400" />
              Outstanding Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading supplier balances...
              </div>
            ) : outstandingPayables.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No outstanding purchase order balances for this supplier.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      PO
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Order Date
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                      Accrued
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                      Paid
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                      Outstanding
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingPayables.map((payable) => (
                    <TableRow key={payable.id} className="border-slate-50">
                      <TableCell className="font-black text-slate-900">
                        #{payable.purchase_order_id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-500">
                        {payable.order_date
                          ? format(new Date(payable.order_date), "MMM dd, yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-700">
                        ₦{Number(payable.amount_accrued || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-600">
                        ₦{Number(payable.total_paid || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs font-black text-amber-600">
                        ₦{Number(payable.outstanding_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-200 font-black uppercase tracking-widest text-[10px]"
                          onClick={() => {
                            setPaymentDialogPOId(payable.purchase_order_id);
                            setShowPaymentDialog(true);
                          }}
                        >
                          Pay PO
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900">
              <CreditCard className="h-4 w-4 text-slate-400" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment history...
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No supplier payments have been recorded yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Date
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Method
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                      Amount
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Mode
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Staff
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => {
                    const remainingCredit = Number(payment.remaining_credit || 0);
                    return (
                      <TableRow key={payment.id} className="border-slate-50">
                        <TableCell className="text-xs font-medium text-slate-500">
                          {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-xs font-black uppercase text-slate-900">
                          {payment.payment_method}
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-slate-900">
                          ₦{Number(payment.amount_paid || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-white border-slate-200 font-black">
                              {getPaymentModeLabel(payment)}
                            </Badge>
                            {remainingCredit > 0 ? (
                              <p className="text-[10px] font-bold text-blue-600">
                                Credit left: ₦{remainingCredit.toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-500">
                          {payment.employee_name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.is_unapplied_credit && remainingCredit > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 font-black uppercase tracking-widest text-[10px]"
                              onClick={() => setCreditToAllocate(payment)}
                            >
                              Allocate
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                              Closed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        suppliers={suppliers}
        initialSupplierId={selectedSupplierId || undefined}
        initialPurchaseOrderId={paymentDialogPOId}
        onSuccess={() => loadSupplierData(selectedSupplierId)}
      />

      <AllocateSupplierCreditDialog
        open={!!creditToAllocate}
        onOpenChange={(open) => {
          if (!open) {
            setCreditToAllocate(null);
          }
        }}
        payment={creditToAllocate}
        onSuccess={() => loadSupplierData(selectedSupplierId)}
      />
    </div>
  );
}
