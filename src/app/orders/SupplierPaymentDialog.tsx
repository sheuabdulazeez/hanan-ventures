import { useEffect, useMemo, useState } from "react";
import { Supplier } from "@/database/suppliers";
import {
  getSupplierPayablesBySupplier,
  recordSupplierPayment,
} from "@/database/supplier-payments";
import { TSupplierPayable } from "@/types/database";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type SupplierPayableRow = TSupplierPayable & {
  outstanding_amount?: number;
  total_paid?: number;
  order_date?: string;
};

type SupplierPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  initialSupplierId?: string;
  initialPurchaseOrderId?: string | null;
  onSuccess?: () => Promise<void> | void;
};

function normalizeAmount(value: string | number) {
  return Number(Number(value || 0).toFixed(2));
}

export default function SupplierPaymentDialog({
  open,
  onOpenChange,
  suppliers,
  initialSupplierId,
  initialPurchaseOrderId,
  onSuccess,
}: SupplierPaymentDialogProps) {
  const {
    auth: { user },
  } = useAppStore();
  const [supplierId, setSupplierId] = useState(initialSupplierId || "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pos" | "transfer">("cash");
  const [bankName, setBankName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"allocate_now" | "credit">(
    initialPurchaseOrderId ? "allocate_now" : "credit",
  );
  const [payables, setPayables] = useState<SupplierPayableRow[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [loadingPayables, setLoadingPayables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allocationTouched, setAllocationTouched] = useState(false);

  const supplierLocked = Boolean(initialSupplierId);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSupplierId(initialSupplierId || "");
    setPaymentMethod("cash");
    setBankName("");
    setReferenceNumber("");
    setNotes("");
    setAmount("");
    setMode(initialPurchaseOrderId ? "allocate_now" : "credit");
    setAllocations({});
    setAllocationTouched(false);
  }, [open, initialSupplierId, initialPurchaseOrderId]);

  useEffect(() => {
    if (!open || !supplierId) {
      setPayables([]);
      return;
    }

    const loadPayables = async () => {
      setLoadingPayables(true);
      try {
        const data = await getSupplierPayablesBySupplier(supplierId);
        setPayables(data);
      } catch (error) {
        console.error(error);
        toast({
          title: "Failed to load supplier balances",
          description: "We could not load open purchase order balances.",
          variant: "destructive",
        });
      } finally {
        setLoadingPayables(false);
      }
    };

    loadPayables();
  }, [open, supplierId]);

  const visiblePayables = useMemo(() => {
    return payables.filter((payable) => {
      const outstanding = Number(payable.outstanding_amount || 0);
      if (outstanding <= 0) {
        return false;
      }

      if (initialPurchaseOrderId) {
        return payable.purchase_order_id === initialPurchaseOrderId;
      }

      return true;
    });
  }, [payables, initialPurchaseOrderId]);

  useEffect(() => {
    if (
      !open ||
      !initialPurchaseOrderId ||
      mode !== "allocate_now" ||
      allocationTouched
    ) {
      return;
    }

    const targetPayable = visiblePayables.find(
      (payable) => payable.purchase_order_id === initialPurchaseOrderId,
    );

    if (!targetPayable) {
      return;
    }

    const suggestedAmount = Math.min(
      normalizeAmount(amount),
      Number(targetPayable.outstanding_amount || 0),
    );

    setAllocations((prev) => ({
      ...prev,
      [targetPayable.id]: suggestedAmount > 0 ? String(suggestedAmount) : "",
    }));
  }, [open, initialPurchaseOrderId, mode, allocationTouched, visiblePayables, amount]);

  const totalAllocated = visiblePayables.reduce((sum, payable) => {
    return sum + normalizeAmount(allocations[payable.id] || 0);
  }, 0);

  const handleAllocationChange = (payableId: string, value: string) => {
    setAllocationTouched(true);
    setAllocations((prev) => ({
      ...prev,
      [payableId]: value,
    }));
  };

  const resetAndClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      toast({
        title: "Supplier required",
        description: "Choose the supplier this payment belongs to.",
        variant: "destructive",
      });
      return;
    }

    const amountValue = normalizeAmount(amount);
    if (amountValue <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a payment amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const allocationRows = visiblePayables
      .map((payable) => ({
        supplier_payable_id: payable.id,
        allocated_amount: normalizeAmount(allocations[payable.id] || 0),
      }))
      .filter((allocation) => allocation.allocated_amount > 0);

    if (mode === "allocate_now") {
      if (allocationRows.length === 0) {
        toast({
          title: "Allocation required",
          description: "Allocate this payment to at least one purchase order.",
          variant: "destructive",
        });
        return;
      }

      if (Math.abs(normalizeAmount(totalAllocated) - amountValue) > 0.0001) {
        toast({
          title: "Allocation mismatch",
          description: "Allocated total must exactly match the payment amount.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!user?.id) {
      toast({
        title: "User not found",
        description: "We could not identify the current staff member.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await recordSupplierPayment({
        supplier_id: supplierId,
        purchase_order_id:
          mode === "allocate_now" && initialPurchaseOrderId
            ? initialPurchaseOrderId
            : null,
        payment_date: new Date().toISOString(),
        payment_method: paymentMethod,
        bank_name: bankName,
        reference_number: referenceNumber,
        amount_paid: amountValue,
        notes,
        employee_id: user.id,
        is_unapplied_credit: mode === "credit",
        allocations: mode === "allocate_now" ? allocationRows : [],
      });

      toast({
        title: "Supplier payment recorded",
        description:
          mode === "credit"
            ? "The payment has been saved as supplier credit."
            : "The payment has been allocated successfully.",
      });

      resetAndClose();
      await onSuccess?.();
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to record payment",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">
            Record Supplier Payment
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Track a payment against open supplier balances or save it as credit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Supplier
              </Label>
              <Select
                value={supplierId}
                onValueChange={setSupplierId}
                disabled={supplierLocked}
              >
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 font-bold">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="font-bold">
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-bold">₦</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="h-12 pl-8 bg-slate-50 border-slate-200 text-lg font-black"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Method
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value: "cash" | "pos" | "transfer") => setPaymentMethod(value)}
              >
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 font-bold">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="cash" className="font-bold">Cash</SelectItem>
                  <SelectItem value="transfer" className="font-bold">Transfer</SelectItem>
                  <SelectItem value="pos" className="font-bold">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Reference
              </Label>
              <Input
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Optional reference"
                className="h-12 bg-slate-50 border-slate-200 font-bold"
              />
            </div>
          </div>

          {paymentMethod !== "cash" && (
            <div>
              <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Bank Name
              </Label>
              <Input
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                placeholder="Recipient bank"
                className="h-12 bg-slate-50 border-slate-200 font-bold"
              />
            </div>
          )}

          <div>
            <Label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Payment Mode
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as "allocate_now" | "credit")}
              className="grid gap-3 md:grid-cols-2"
            >
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                <RadioGroupItem value="allocate_now" className="mt-1" />
                <div>
                  <p className="text-sm font-black text-slate-900">Allocate to PO(s) now</p>
                  <p className="text-xs font-medium text-slate-500">
                    Apply this payment directly to open purchase order balances.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                <RadioGroupItem value="credit" className="mt-1" />
                <div>
                  <p className="text-sm font-black text-slate-900">Save as supplier credit</p>
                  <p className="text-xs font-medium text-slate-500">
                    Keep the amount as unapplied credit to allocate later.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional payment notes"
              className="min-h-[88px] bg-slate-50 border-slate-200 font-medium"
            />
          </div>

          {mode === "allocate_now" && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">Open Purchase Order Balances</p>
                  <p className="text-xs font-medium text-slate-500">
                    Allocate the full payment amount before saving.
                  </p>
                </div>
                <Badge variant="outline" className="bg-white border-slate-200 font-black">
                  Allocated: ₦{normalizeAmount(totalAllocated).toLocaleString()}
                </Badge>
              </div>

              {loadingPayables ? (
                <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading supplier balances...
                </div>
              ) : visiblePayables.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No outstanding purchase order balance is available for allocation yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {visiblePayables.map((payable) => {
                    const outstanding = Number(payable.outstanding_amount || 0);
                    return (
                      <div
                        key={payable.id}
                        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1.6fr_0.8fr_0.8fr]"
                      >
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            PO #{payable.purchase_order_id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {payable.order_date
                              ? new Date(payable.order_date).toLocaleDateString()
                              : "No order date"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Outstanding
                          </p>
                          <p className="text-sm font-black text-amber-600">
                            ₦{outstanding.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Allocate
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={outstanding}
                            value={allocations[payable.id] || ""}
                            onChange={(event) =>
                              handleAllocationChange(payable.id, event.target.value)
                            }
                            className="h-10 bg-slate-50 border-slate-200 font-black"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="flex-1 font-bold"
              onClick={resetAndClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]"
              onClick={handleSubmit}
              disabled={submitting || !supplierId}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
