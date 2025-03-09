import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { format } from "date-fns";
import { useRef } from "react";
import { invoiceHtml } from "@/lib/utils";

interface InvoiceModalProps {
  sale: TSale;
  items: TSaleItem[];
}



export default function PrintInvoiceButton(props: InvoiceModalProps) {
  const { sale, items } = props;
  const printWindow = useRef<WebviewWindow | null>(null);

  const onClick = async () => {
    const htmlContent = invoiceHtml(sale, items);

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
