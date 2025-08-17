import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useRef, useState, useEffect } from "react";
import { enhancedInvoiceHtml } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { getCustomerDebtSummary } from "@/database/debtors";

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Omit<TSale, "updated_at" | "sale_date">;
  items: Pick<
    TSaleItem,
    "product_name" | "quantity" | "unit_price" | "total_price"
  >[];
}

export function InvoiceModal({
  open,
  onOpenChange,
  sale,
  items,
}: InvoiceModalProps) {
  const printWindow = useRef(null);
  const { systemSettings, businessInfo, receiptSettings } = useAppStore();
  const [customerDebt, setCustomerDebt] = useState<{
    previousBalance: number;
    currentBalance: number;
    totalBalance: number;
  } | null>(null);

  useEffect(() => {
    if (open && sale.customer_id && sale.customer_id !== 'WALK-IN') {
      loadCustomerDebt();
    } else {
      setCustomerDebt(null);
    }
  }, [open, sale.customer_id, sale.total_amount]);

  const loadCustomerDebt = async () => {
    try {
      const debtSummary = await getCustomerDebtSummary(sale.customer_id, sale.total_amount - sale.payments.reduce((acc, cur) => acc + cur.amount, 0));
      setCustomerDebt(debtSummary);
    } catch (error) {
      console.error('Failed to load customer debt:', error);
      setCustomerDebt(null);
    }
  };

  const handlePrint = async () => {
    const content = document.getElementById("invoice-content");
    if (!content) return;

    // try {
    const htmlContent = enhancedInvoiceHtml(sale, items, {
      businessInfo,
      receiptSettings,
      systemSettings,
    }, customerDebt || undefined);

    printWindow.current = new WebviewWindow("print", {
      url: "/print.html",
      width: 800,
      height: 600,
      title: `Invoice #${sale.id}`,
    });

    printWindow.current.listen("close", () => {
      printWindow.current.close();
      printWindow.current = null;
    });

    printWindow.current.listen("loaded", async () => {
      await printWindow.current.emit("print-content", {
        html: htmlContent,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-screen">
        <ScrollArea className="h-[90vh]">
          <div
            className="p-6"
            id="invoice-content"
            dangerouslySetInnerHTML={{
          __html: enhancedInvoiceHtml(sale, items, {
            businessInfo,
            receiptSettings,
            systemSettings,
          }, customerDebt || undefined),
        }}
          />
          <div className="flex justify-end pb-4">
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print Invoice
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
