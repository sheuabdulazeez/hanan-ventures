import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useRef } from "react";
import { invoiceHtml } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";


interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Omit<TSale, 'updated_at' | 'sale_date' | 'customer_id'>;
  items: Pick<TSaleItem, 'product_name' | 'quantity' | 'unit_price' | 'total_price'>[];
}

export function InvoiceModal({
  open,
  onOpenChange,
  sale,
  items,
}: InvoiceModalProps) {
  const printWindow = useRef(null);

  const handlePrint = async () => {
    const content = document.getElementById("invoice-content");
    if (!content) return;

    // try {
      const htmlContent = invoiceHtml(sale, items)

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

  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-screen">
        <ScrollArea className="h-[90vh]">
          <div className="p-6" id="invoice-content" dangerouslySetInnerHTML={{__html: invoiceHtml(sale, items)}} />
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
