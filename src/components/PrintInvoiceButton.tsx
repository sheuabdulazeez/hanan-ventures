import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { format } from "date-fns";
import { useRef } from "react";
import { enhancedInvoiceHtml } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { getCustomerDebtSummary } from "@/database/debtors";

interface InvoiceModalProps {
  sale: TSale;
  items: TSaleItem[];
}



export default function PrintInvoiceButton(props: InvoiceModalProps) {
  const { sale, items } = props;
  const printWindow = useRef<WebviewWindow | null>(null);
  const { businessInfo, receiptSettings, systemSettings } = useAppStore();

  const onClick = async () => {
    let customerDebt = null;
    
    // Fetch customer debt information if it's not a walk-in customer
    // if (sale.customer_id && sale.customer_id !== 'WALK-IN') {
    //   try {
    //     customerDebt = await getCustomerDebtSummary(sale.customer_id, sale.total_amount - sale.payments.reduce((acc, cur) => acc + cur.amount, 0));
    //   } catch (error) {
    //     console.error('Failed to load customer debt:', error);
    //   }
    // }
    
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
    })

    printWindow.current.listen("loaded", async () => {
      await printWindow.current.emit("print-content", {
        html: htmlContent,
      });
    })
  }

  return (
    <Button
      className="flex items-center justify-center"
      onClick={onClick}
      title="Print Receipt"
    >
      <Printer size={24} />
      Print Receipt
    </Button>
  )
}
