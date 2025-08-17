import { Button } from "@/components/ui/button";
import { TDebtor, TDebtorPayment } from "@/types/database";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { format } from "date-fns";
import { useRef } from "react";
import { useAppStore } from "@/lib/store";

interface PaymentReceiptProps {
  debtor: TDebtor;
  payment: {
    amount: number;
    method: "cash" | "transfer" | "pos";
    bankName?: string;
    employeeName: string;
  };
}

function generatePaymentReceiptHtml(
  debtor: TDebtor,
  payment: PaymentReceiptProps["payment"],
  businessInfo: any,
  receiptSettings: any
) {
  const currentDate = new Date();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          max-width: 300px;
          margin: 0 auto;
          padding: 10px;
          background: white;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        
        .business-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .business-info {
          font-size: 10px;
          margin-bottom: 2px;
        }
        
        .receipt-title {
          font-size: 14px;
          font-weight: bold;
          margin: 15px 0 10px 0;
          text-align: center;
          text-decoration: underline;
        }
        
        .receipt-info {
          margin-bottom: 15px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 2px;
        }
        
        .label {
          font-weight: bold;
        }
        
        .amount {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          border: 2px solid #000;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #000;
          font-size: 10px;
        }
        
        .signature {
          margin-top: 30px;
          text-align: center;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          width: 200px;
          margin: 20px auto 5px auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-name">${businessInfo?.name || 'Business Name'}</div>
        <div class="business-info">${businessInfo?.address || 'Business Address'}</div>
        <div class="business-info">Tel: ${businessInfo?.phone || 'Phone Number'}</div>
        ${businessInfo?.email ? `<div class="business-info">Email: ${businessInfo.email}</div>` : ''}
      </div>
      
      <div class="receipt-title">PAYMENT RECEIPT</div>
      
      <div class="receipt-info">
        <div class="info-row">
          <span class="label">Date:</span>
          <span>${format(currentDate, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <div class="info-row">
          <span class="label">Customer:</span>
          <span>${debtor.customer_name}</span>
        </div>
        <div class="info-row">
          <span class="label">Customer ID:</span>
          <span>${debtor.customer_id.substring(0, 8)}</span>
        </div>
        <div class="info-row">
          <span class="label">Payment Method:</span>
          <span>${payment.method.toUpperCase()}</span>
        </div>
        ${payment.bankName && payment.method !== 'cash' ? `
        <div class="info-row">
          <span class="label">Bank:</span>
          <span>${payment.bankName}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="label">Cashier:</span>
          <span>${payment.employeeName}</span>
        </div>
      </div>
      
      <div class="amount">
        <div>AMOUNT PAID</div>
        <div style="font-size: 20px; margin-top: 5px;">₦${payment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
      </div>
      
      <div class="receipt-info">
        <div class="info-row">
          <span class="label">Previous Balance:</span>
          <span>₦${(debtor.amount_owed + payment.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="info-row">
          <span class="label">Payment:</span>
          <span>₦${payment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="info-row" style="border-bottom: 2px solid #000; font-weight: bold;">
          <span class="label">New Balance:</span>
          <span>₦${debtor.amount_owed.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <div class="signature">
        <div class="signature-line"></div>
        <div>Customer Signature</div>
      </div>
      
      <div class="footer">
        <div>Thank you for your payment!</div>
        <div style="margin-top: 5px;">Keep this receipt for your records</div>
        <div style="margin-top: 10px;">Printed on: ${format(currentDate, 'dd/MM/yyyy HH:mm:ss')}</div>
      </div>
    </body>
    </html>
  `;
}

export default function PrintPaymentReceiptButton(props: PaymentReceiptProps) {
  const { debtor, payment } = props;
  const printWindow = useRef<WebviewWindow | null>(null);
  const { businessInfo, receiptSettings } = useAppStore();

  const onClick = async () => {
    const htmlContent = generatePaymentReceiptHtml(
      debtor,
      payment,
      businessInfo,
      receiptSettings
    );

    printWindow.current = new WebviewWindow("print", {
      url: "/print.html",
      width: 400,
      height: 600,
      title: `Payment Receipt - ${debtor.customer_name}`,
    });

    printWindow.current.listen("close", () => {
      if (printWindow.current) {
        printWindow.current.close();
        printWindow.current = null;
      }
    });

    printWindow.current.listen("loaded", async () => {
      if (printWindow.current) {
        await printWindow.current.emit("print-content", {
          html: htmlContent,
        });
      }
    });
  };

  return (
    <Button
      className="flex items-center justify-center bg-green-600 hover:bg-green-700"
      onClick={onClick}
      title="Print Payment Receipt"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print Receipt
    </Button>
  );
}