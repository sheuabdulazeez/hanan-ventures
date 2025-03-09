import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Webview } from "@tauri-apps/api/webview";
import { Buffer } from "buffer";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Window } from "@tauri-apps/api/window";
import { useRef } from "react";


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
      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .mb-6 { margin-bottom: 1.5rem; }
            .py-2 { padding: 0.5rem 0; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .font-bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 0.5rem; }
            @media print {
              @page { margin: 0.5cm; }
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `;

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
      <DialogContent className="max-w-[600px]">
        <div className="flex justify-end mb-4">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
        </div>

        <div className="p-6" id="invoice-content">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Hanan Ventures</h2>
            <p>123 Business Street</p>
            <p>Lagos, Nigeria</p>
            <p>Phone: +234 123 456 7890</p>
          </div>

          <div className="flex justify-between mb-6">
            <div>
              <h3 className="font-semibold">Bill To:</h3>
              <p>{sale.customer_name}</p>
              <p>
                Invoice #: <span className="uppercase">{sale.id}</span>
              </p>
            </div>
            <div className="text-right">
              <p>Date: {format(new Date(sale.created_at), "PPP")}</p>
              <p>Time: {format(new Date(sale.created_at), "pp")}</p>
              <p>Cashier: {sale.employee_name}</p>
            </div>
          </div>

          <table className="w-full mb-6">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, _) => (
                <tr key={_} className="border-b">
                  <td className="py-2">{item.product_name}</td>
                  <td className="text-right py-2">{item.quantity}</td>
                  <td className="text-right py-2">
                    ₦{item.unit_price.toFixed(2)}
                  </td>
                  <td className="text-right py-2">
                    ₦{item.total_price.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span>Subtotal:</span>
                <span>₦{sale.total_amount.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between py-2">
                  <span>Discount:</span>
                  <span>₦{sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-bold border-t">
                <span>Total:</span>
                <span>
                  ₦{(sale.total_amount - (sale.discount || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span>Payment Method:</span>
                <span className="capitalize">{sale.payment_method}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm mt-8">
            <p>Thank you for your business!</p>
            <p>Please come again</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
