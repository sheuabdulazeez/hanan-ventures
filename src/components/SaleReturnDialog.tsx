import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { round2 } from "@/database";
import { returnSaleItems } from "@/database/sales";
import { getSaleDebtOwed } from "@/database/debtors";
import { TSale, TSaleItem } from "@/types/database";

type Props = {
  sale: TSale;
  items: TSaleItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

type LineState = { quantity: string; restock: boolean };

export default function SaleReturnDialog({ sale, items, open, onOpenChange, onDone }: Props) {
  const { auth: { user } } = useAppStore();
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<"cash" | "pos" | "transfer">("cash");
  const [debtOwed, setDebtOwed] = useState(0);
  const [saving, setSaving] = useState(false);

  const remainingOf = (item: TSaleItem) =>
    Math.max(0, Number(item.quantity) - Number(item.returned_quantity || 0));

  useEffect(() => {
    if (!open) return;
    setLines({});
    setReason("");
    setMethod("cash");
    getSaleDebtOwed(sale.id).then(setDebtOwed).catch(() => setDebtOwed(0));
  }, [open, sale.id]);

  const lineValue = (item: TSaleItem) => {
    const qty = Math.min(remainingOf(item), Math.max(0, Number(lines[item.id]?.quantity) || 0));
    return round2((Number(item.total_price) * qty) / Number(item.quantity));
  };

  const returnValue = useMemo(
    () => round2(items.reduce((sum, item) => sum + lineValue(item), 0)),
    [items, lines]
  );
  const debtReduced = round2(Math.min(debtOwed, returnValue));
  const refund = round2(returnValue - debtReduced);
  const everythingSelected = items.every(
    (item) => remainingOf(item) === 0 || Math.abs((Number(lines[item.id]?.quantity) || 0) - remainingOf(item)) < 1e-9
  );

  const setQty = (item: TSaleItem, value: string) =>
    setLines((prev) => ({ ...prev, [item.id]: { restock: prev[item.id]?.restock ?? true, quantity: value } }));

  const selectAll = () =>
    setLines(
      Object.fromEntries(
        items.map((item) => [item.id, { restock: lines[item.id]?.restock ?? true, quantity: String(remainingOf(item)) }])
      )
    );

  const submit = async () => {
    if (!user) return;
    const chosen = items
      .map((item) => ({
        sale_item_id: item.id,
        quantity: Math.min(remainingOf(item), Number(lines[item.id]?.quantity) || 0),
        restock: lines[item.id]?.restock ?? true,
      }))
      .filter((l) => l.quantity > 0);

    if (chosen.length === 0) {
      toast({ title: "Nothing selected", description: "Enter a quantity for at least one item.", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Say why these items are being returned.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await returnSaleItems({
        sale_id: sale.id,
        lines: chosen,
        reason,
        employee_id: user.id,
        refund_method: refund > 0 ? method : undefined,
      });
      toast({
        title: everythingSelected ? "Sale voided" : "Return recorded",
        description:
          `₦${result.totalAmount.toLocaleString()} returned` +
          (result.debtReduced > 0 ? `, ₦${result.debtReduced.toLocaleString()} taken off the customer's debt` : "") +
          (result.refundAmount > 0 ? `, ₦${result.refundAmount.toLocaleString()} to refund` : "") +
          ".",
      });
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast({
        title: "Could not record return",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const anythingLeft = items.some((item) => remainingOf(item) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Void / Return</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Goods go back to stock and the sale stays on record. Any debt still owed on this sale is cancelled first;
            only the rest is refunded.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[320px] pr-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[9px] font-black uppercase">Item</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Can return</TableHead>
                <TableHead className="text-[9px] font-black uppercase w-28">Return qty</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Restock</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const remaining = remainingOf(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-bold text-slate-900">{item.product_name}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {remaining} / {item.quantity}
                      {item.unit_abbrev ? ` ${item.unit_abbrev}` : ""}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={remaining}
                        step="any"
                        disabled={remaining === 0}
                        value={lines[item.id]?.quantity ?? ""}
                        onChange={(e) => setQty(item, e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={lines[item.id]?.restock ?? true}
                        disabled={remaining === 0}
                        onCheckedChange={(checked) =>
                          setLines((prev) => ({
                            ...prev,
                            [item.id]: { quantity: prev[item.id]?.quantity ?? "", restock: checked === true },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs font-bold text-right">₦{lineValue(item).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. wrong item, damaged, customer changed mind" className="mt-1" />
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span>Value of goods returned</span><span className="font-black">₦{returnValue.toLocaleString()}</span></div>
            {debtOwed > 0 && (
              <div className="flex justify-between text-slate-500"><span>Taken off debt still owed (₦{debtOwed.toLocaleString()})</span><span className="font-bold">₦{debtReduced.toLocaleString()}</span></div>
            )}
            <div className="flex justify-between"><span>Refund to customer</span><span className="font-black">₦{refund.toLocaleString()}</span></div>
          </div>

          {refund > 0 && (
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Refund paid by</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={selectAll} disabled={!anythingLeft || saving} className="text-[10px] font-black uppercase tracking-widest">
            Select everything (void)
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="text-[10px] font-black uppercase tracking-widest">
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !anythingLeft} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest">
            {saving ? "Saving..." : everythingSelected ? "Void sale" : "Record return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
