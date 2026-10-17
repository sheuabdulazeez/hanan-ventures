import { useEffect, useMemo, useState } from "react";
import { allocateSupplierCredit, getSupplierPayablesBySupplier } from "@/database/supplier-payments";
import { TSupplierPayable, TSupplierPayment } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type SupplierPayableRow = TSupplierPayable & {
  outstanding_amount?: number;
  order_date?: string;
};

type AllocateSupplierCreditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: TSupplierPayment | null;
  onSuccess?: () => Promise<void> | void;
};

function normalizeAmount(value: string | number) {
  return Number(Number(value || 0).toFixed(2));
}

export default function AllocateSupplierCreditDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: AllocateSupplierCreditDialogProps) {
  const [payables, setPayables] = useState<SupplierPayableRow[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !payment?.supplier_id) {
      setPayables([]);
      setAllocations({});
      return;
    }

    const loadPayables = async () => {
      setLoading(true);
      try {
        const data = await getSupplierPayablesBySupplier(payment.supplier_id);
        setPayables(data.filter((row) => Number(row.outstanding_amount || 0) > 0));
      } catch (error) {
        console.error(error);
        toast({
          title: "Failed to load balances",
          description: "We could not load open balances for this supplier credit.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPayables();
  }, [open, payment]);

  const remainingCredit = useMemo(() => {
    return normalizeAmount(payment?.remaining_credit || 0);
  }, [payment]);

  const totalToAllocate = payables.reduce((sum, payable) => {
    return sum + normalizeAmount(allocations[payable.id] || 0);
  }, 0);

  const handleSubmit = async () => {
    if (!payment) {
      return;
    }

    const allocationRows = payables
      .map((payable) => ({
        supplier_payable_id: payable.id,
        allocated_amount: normalizeAmount(allocations[payable.id] || 0),
      }))
      .filter((allocation) => allocation.allocated_amount > 0);

    if (allocationRows.length === 0) {
      toast({
        title: "Allocation required",
        description: "Enter at least one allocation amount.",
        variant: "destructive",
      });
      return;
    }

    if (normalizeAmount(totalToAllocate) - remainingCredit > 0.0001) {
      toast({
        title: "Credit exceeded",
        description: "Allocation cannot exceed the remaining supplier credit.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await allocateSupplierCredit({
        supplier_payment_id: payment.id,
        allocations: allocationRows,
      });

      toast({
        title: "Supplier credit allocated",
        description: "The selected purchase order balances have been updated.",
      });

      onOpenChange(false);
      await onSuccess?.();
    } catch (error) {
      console.error(error);
      toast({
        title: "Allocation failed",
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
            Allocate Supplier Credit
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Apply available supplier credit to one or more open purchase order balances.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="outline" className="bg-white border-slate-200 font-black">
              Remaining Credit: ₦{remainingCredit.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="bg-white border-slate-200 font-black">
              Allocating: ₦{normalizeAmount(totalToAllocate).toLocaleString()}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading supplier balances...
            </div>
          ) : payables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              There are no open purchase order balances available for this supplier.
            </div>
          ) : (
            <div className="space-y-3">
              {payables.map((payable) => {
                const outstanding = Number(payable.outstanding_amount || 0);
                return (
                  <div
                    key={payable.id}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.6fr_0.8fr_0.8fr]"
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
                        max={Math.min(outstanding, remainingCredit)}
                        value={allocations[payable.id] || ""}
                        onChange={(event) =>
                          setAllocations((prev) => ({
                            ...prev,
                            [payable.id]: event.target.value,
                          }))
                        }
                        className="h-10 bg-white border-slate-200 font-black"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="flex-1 font-bold"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]"
              onClick={handleSubmit}
              disabled={submitting || !payment}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Allocate Credit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
