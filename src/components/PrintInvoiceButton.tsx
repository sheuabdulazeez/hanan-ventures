import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { format } from "date-fns";
import { useRef } from "react";

interface InvoiceModalProps {
  sale: TSale;
  items: TSaleItem[];
}

const invoiceHtml = (sale: TSale, items: TSaleItem[]) => {
  // Create shorter invoice number (take last 8 characters)
  const shortInvoiceId = sale.id.slice(-8).toUpperCase();

  return `
    <style>
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 24px;
        margin: 0;
        padding: 0;
      }
      .container {
        width: 72mm;
        padding: 5mm;
        margin: 0 auto;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .border-b { border-bottom: 1px solid black; }
      table { width: 100%; }
      th, td { padding: 2px 0; }
      
      @media print {
        @page {
          size: 72mm auto;
          margin: 0;
        }
      }
    </style>
    <div class="container">
      <div class="text-center">
        <h2>HANAN VENTURES</h2>
        <div>
          Goshen Shopping Plaza<br/>
          Beside Joyland Hospital,<br/>
          Arogunmasa Osogbo, Osun State<br/>
          Tel: 09069410657, 07040861356
        </div>
      </div>

      <div class="border-b">
        <div>Invoice: #${shortInvoiceId}</div>
        <div>Date: ${format(new Date(sale.created_at), "dd/MM/yy HH:mm")}</div>
        <div>Cashier: ${sale.employee_name}</div>
        <div>Customer: ${sale.customer_name}</div>
      </div>

      <table>
        <tr class="border-b">
          <th align="left">Item</th>
          <th align="right">Qty</th>
          <th align="right">Price</th>
          <th align="right">Total</th>
        </tr>
        ${items.map((item) => `
          <tr>
            <td>${item.product_name}</td>
            <td align="right">${item.quantity}</td>
            <td align="right">${item.unit_price.toFixed(2)}</td>
            <td align="right">${item.total_price.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>

      <div class="border-b">
        <div class="text-right">
          <div>Subtotal: ₦${sale.total_amount.toFixed(2)}</div>
          ${sale.discount > 0 ? `<div>Discount: ₦${sale.discount.toFixed(2)}</div>` : ''}
          <div>Total: ₦${(sale.total_amount - (sale.discount || 0)).toFixed(2)}</div>
          <div>Payment: ${sale.payment_method.toUpperCase()}</div>
        </div>
      </div>

      <div class="text-center">
        <div>Thank you for your patronage!</div>
        <div>Please come again</div>
      </div>
    </div>`
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
