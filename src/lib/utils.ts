import { TSale, TSaleItem } from "@/types/database";
import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const randomString = (length: number) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result.toUpperCase();
};

export const invoiceHtml = (sale: Omit<TSale, 'updated_at' | 'sale_date' | 'customer_id'>, items: Pick<TSaleItem, 'product_name' | 'quantity' | 'unit_price' | 'total_price'>[]) => {
  const shortInvoiceId = sale.id.slice(-8).toUpperCase();
return `
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px;
      line-height: 24px; margin: 0;  padding: 1rem 0;
      }
    .container { padding: 1rem; margin: 2rem auto;  font-size: 0.875rem; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .text-xl { font-size: 1.25rem; }
    .text-xs { font-size: 0.75rem; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .border-b { border-bottom: 1px solid #000000; }
    .border-y { border-top: 1px solid #000000; border-bottom: 1px solid #000000; }
    .border-t { border-top: 1px solid #000000; }
    .border-black; { border-color: black; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .pt-2 { padding-top: 0.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.25rem 0; }
    
    @media print {
      .container { padding: 0; }
    }
  </style>
  <div class="container space-y-4">
    <div class="text-center space-y-1">
      <h2 class="text-xl font-bold uppercase">Hanan Ventures</h2>
      <p class="text-xs">
        Goshen Shopping Plaza Beside. Joyland Hospital,<br />
        Arogunmasa Osogbo, Osun State
      </p>
      <p class="text-xs">
        Tel: 09069410657, 07040861356,<br />
        WhatsApp: 08171431872
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
      <div>
        <h3 class="font-bold">Bill To:</h3>
        <p>${sale.customer_name}</p>
        <p>Invoice #: <span class="uppercase">${shortInvoiceId}</span></p>
      </div>
      <div class="text-right">
        <p>Date: ${format(new Date(sale.created_at), "PPP")}</p>
        <p>Time: ${format(new Date(sale.created_at), "pp")}</p>
        <p>Cashier: ${sale.employee_name}</p>
      </div>
    </div>

    <table class="w-full" style="margin-bottom: 1.5rem;">
      <thead class="border-b">
        <tr>
          <th class="text-left py-2">Item</th>
          <th class="text-right py-2">Qty</th>
          <th class="text-right py-2">Price</th>
          <th class="text-right py-2">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr class="border-b">
            <td class="py-2">${item.product_name}</td>
            <td class="text-right py-2">${item.quantity}</td>
            <td class="text-right py-2">₦${item.unit_price.toFixed(2)}</td>
            <td class="text-right py-2">₦${item.total_price.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
      <div style="width: 16rem;">
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
          <span>Subtotal:</span>
          <span>₦${sale.total_amount.toFixed(2)}</span>
        </div>
        ${sale.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
            <span>Discount:</span>
            <span>₦${sale.discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-weight: bold; border-top: 1px solid #e5e7eb;">
          <span>Total:</span>
          <span>₦${(sale.total_amount - (sale.discount || 0)).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
          <span>Payment Method:</span>
          <span style="text-transform: capitalize;">${sale.payment_method}</span>
        </div>
      </div>
    </div>

    <div class="text-center pt-2 border-t border-black">
      <p>Thank you for your patronage!</p>
      <p>Please come again</p>
    </div>
  </div>`
}