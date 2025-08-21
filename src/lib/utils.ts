import { TSale, TSaleItem } from "@/types/database";
import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
export const invoiceHtml = (
  sale: Omit<TSale, "updated_at" | "sale_date" | "customer_id">,
  items: Pick<
    TSaleItem,
    "product_name" | "quantity" | "unit_price" | "total_price"
  >[],
  settings: {
    businessInfo: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
      website: string;
      logo: string | null;
    };
    receiptSettings: {
      footerText: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  },
  customerDebt?: {
    previousBalance: number;
    currentBalance: number;
    totalBalance: number;
  }
) => {
  const { businessInfo, receiptSettings, systemSettings } = settings;
  const amountPaid = sale.payments.reduce(
    (acc, payment) => acc + payment.amount,
    0
  );
  const shortInvoiceId = sale.id.slice(-8).toUpperCase();
  const totalAfterDiscount = sale.total_amount - (sale.discount || 0);
  const change = Math.max(0, (amountPaid || 0) - totalAfterDiscount);
  const outstanding = Math.max(0, totalAfterDiscount - (amountPaid || 0));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Receipt - ${shortInvoiceId}</title>
    <style>
        @page {
          font-family:Tahoma;
          size: 80mm auto;
          margin: 0;
          padding: 0;
        }
        
        @media print {
            @page {
                font-family:Tahoma;
                font-style: normal;
                margin: 0;
                padding: 0;
                size: 80mm auto;
            }
            
            body {
                font-size: 12px;
                line-height: 1.4;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                color: black;
            }

            .print-content {
                width: 100%;
                height: auto;
                padding: 0;
                box-sizing: border-box;
                margin: 0;
            }
            
            * {
                -webkit-box-sizing: border-box;
                box-sizing: border-box;
            }
        }

        body {
            font-family:Tahoma;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 2mm;
            color: black;
            background: white;
        }

        .print-content {
            // max-width: 80mm;
            margin: 0 auto;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .text-xl { font-size: 16px; font-weight: 900; }
        .text-lg { font-size: 14px; font-weight: 800; }
        .text-sm { font-size: 12px; font-weight: 600; }
        .text-xs { font-size: 10px; font-weight: 600; }
        .font-bold { font-weight: 700; }
        .font-extra-bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .gap-2 { gap: 0.5rem; }
        
        .separator {
            border-top: 2px dashed black;
            margin: 5px 0;
            width: 100%;
        }
        
        .separator-solid {
            border-top: 2px solid black;
            margin: 4px 0;
            width: 100%;
        }
        
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .pt-2 { padding-top: 0.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        
        table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 5px 0;
            table-layout: fixed;
            border: 1px solid black;
        }
        
        th, td { 
            padding: 4px 3px;
            border: 1px solid black;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-weight: 600;
        }
        
        .item-table th {
            font-size: 10px;
            font-weight: 800;
            background-color: #f0f0f0;
            border: 1px solid black;
            padding: 8px 4px;
            text-align: center;
        }
        
        .item-table td {
            font-size: 10px;
            font-weight: 600;
            padding: 4px 3px;
            vertical-align: top;
            border: 1px solid black;
        }
        
        .qty-col { width: 12%; text-align: center; }
        .item-col { width: 48%; text-align: left; }
        .price-col { width: 20%; text-align: right; }
        .total-col { width: 20%; text-align: right; }
        
        .header-section {
            margin-bottom: 3px;
        }
        
        .logo {
            max-width: 100px;
            max-height: 100px;
            margin: 0 auto 0 auto;
            display: block;
        }
        
        .business-name {
            font-size: 22px;
            font-weight: 900;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
        }
        
        .business-info {
            font-size: 10px;
            font-weight: 600;
            line-height: 1.4;
            margin-bottom: 3px;
        }
        
        .transaction-info {
            margin: 6px 0;
            font-size: 10px;
            font-weight: 600;
        }
        
        .transaction-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-weight: 600;
        }
        
        .totals-section {
            margin-top: 6px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 12px;
            font-weight: 700;
            padding: 2px 0;
        }
        
        .final-total {
            font-weight: 900;
            font-size: 14px;
            border-top: 1px solid black;
            border-bottom: 1px solid black;
            padding: 6px 0;
            margin: 4px 0;
            background-color: #f0f0f0;
        }
        
        .payment-section {
            margin-top: 5px;
            padding-top: 8px;
            border-top: 1px dashed black;
        }
        
        .footer-section {
            text-align: center;
            margin-top: 8px;
            padding-top: 10px;
            border-top: 1px dashed black;
            font-size: 10px;
            font-weight: 600;
        }
        
        .cut-line {
            text-align: center;
            margin: 8px 0 10px 0;
            font-size: 10px;
            font-weight: 700;
            color: #333;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        .item-name {
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-weight: 600;
        }
        
        .outstanding {
            background-color: #e0e0e0;
            padding: 6px;
            border: 1px solid black;
            margin-top: 4px;
            font-weight: 800;
        }
        
        .price-text {
            font-weight: 700;
            white-space: nowrap;
            overflow: visible;
        }
        
        /* Ensure all text is bold and readable */
        body, div, span, p, td, th {
            font-weight: 600;
        }
        
        /* Extra bold for important elements */
        .business-name,
        .final-total,
        .outstanding,
        .item-table th {
            font-weight: 900;
        }

        .flex {
            display: flex;
        }
        .justify-between {
            justify-content: space-between;
        }
        
        /* Responsive adjustments for different paper sizes */
        @media print and (max-width: 60mm) {
            .print-content { padding: 1mm; }
            .text-xl { font-size: 14px; font-weight: 900; }
            .text-lg { font-size: 12px; font-weight: 800; }
            body { font-size: 10px; font-weight: 600; }
            .logo { max-width: 100px; max-height: 100px; }
            .business-name { font-size: 22px; }
            .item-table th, .item-table td { font-size: 10px; padding: 4px 2px; }
            .total-row { font-size: 10px; }
            .final-total { font-size: 13px; }
        }
        
        @media print and (min-width: 100mm) {
            .print-content { padding: 1mm; }
            .text-xl { font-size: 18px; font-weight: 900; }
            .text-lg { font-size: 16px; font-weight: 800; }
            body { font-size: 14px; font-weight: 600; }
            .logo { max-width: 100px; max-height: 100px; }
            .business-name { font-size: 22px; }
            .item-table th, .item-table td { font-size: 13px; padding: 8px 6px; }
            .total-row { font-size: 14px; }
            .final-total { font-size: 16px; }
        }
    </style>
</head>
<body>
    <div class="print-content">
        <!-- Header Section -->
        <div class="header-section text-center space-y-1">
            ${businessInfo.logo ? `
                <img src="${businessInfo.logo}" alt="Logo" class="logo" />
            ` : ''}
            
            <div class="business-name uppercase">${businessInfo.name}</div>
            
            <div class="business-info">
                ${businessInfo.address ? `${businessInfo.address}` : ''}
                ${businessInfo.city || businessInfo.state || businessInfo.zipCode ? 
                    `${[businessInfo.city, businessInfo.state, businessInfo.zipCode].filter(Boolean).join(', ')}<br/>` : ''}
                ${businessInfo.phone ? `Tel: ${businessInfo.phone}<br/>` : ''}
                ${businessInfo.email ? `${businessInfo.email}<br/>` : ''}
                ${businessInfo.website ? `${businessInfo.website}` : ''}
            </div>
        </div>

        <div class="separator"></div>

        <!-- Transaction Info -->
        <div class="transaction-info">
            <div class="flex justify-between gap-2">
              <div>
                  <span>Invoice #:</span>
                  <span class="uppercase font-bold">${shortInvoiceId}</span>
              </div>
              <div>
                  <span>Cashier:</span>
                  <span>${sale.employee_name}</span>
              </div>
            </div>
            <div class="flex justify-between gap-2">
              <div>
                  <span>Date:</span>
                  <span>${format(new Date(sale.created_at), "dd/MM/yyyy")}</span>
              </div>
              <div>
                  <span>Time:</span>
                  <span>${format(new Date(sale.created_at), "HH:mm:ss")}</span>
              </div>
            </div>
            ${sale.customer_name && sale.customer_name !== 'Walk-in Customer' ? `
                <div class="transaction-row">
                    <span>Customer:</span>
                    <span>${sale.customer_name}</span>
                </div>
            ` : ''}
        </div>

        <div class="separator"></div>

        <!-- Items Table -->
        <table class="item-table">
            <thead>
                <tr>
                    <th class="qty-col">Qty</th>
                    <th class="item-col">Item</th>
                    <th class="price-col">Price</th>
                    <th class="total-col">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td class="qty-col font-bold">${
                            item.quantity % 1 === 0 ? 
                                Math.floor(item.quantity) : 
                                item.quantity
                        }</td>
                        <td class="item-col item-name">${item.product_name}</td>
                        <td class="price-col price-text">${item.unit_price.toLocaleString()}</td>
                        <td class="total-col price-text font-bold">${item.total_price.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="separator"></div>

        <!-- Totals Section -->
        <div class="totals-section">
            ${sale.discount && sale.discount > 0 ? `
                <div class="total-row">
                    <span class="font-bold">Discount:</span>
                    <span class="price-text">-${systemSettings.currencySymbol}${sale.discount.toLocaleString()}</span>
                </div>
            ` : ''}
            
            <div class="total-row final-total">
                <span class="font-extra-bold">TOTAL:</span>
                <span class="price-text font-extra-bold">${systemSettings.currencySymbol}${totalAfterDiscount.toLocaleString()}</span>
            </div>
        </div>

        <!-- Payment Section -->
        <div class="payment-section">
            <div class="total-row">
                <span class="font-bold">Amount Paid:</span>
                <span class="price-text">${systemSettings.currencySymbol}${amountPaid.toLocaleString()}</span>
            </div>
            
            ${sale.payments.length > 0 ? `
                <div class="total-row">
                    <span class="font-bold">Payment Method:</span>
                    <span class="font-bold" style="text-transform: capitalize;">${sale.payments.map(p => p.payment_method).join(', ')}</span>
                </div>
            ` : ''}
            
            ${change > 0 ? `
                <div class="total-row">
                    <span class="font-bold">Change:</span>
                    <span class="price-text font-bold">${systemSettings.currencySymbol}${change.toLocaleString()}</span>
                </div>
            ` : ''}
            
            ${outstanding > 0 ? `
                <div class="total-row outstanding">
                    <span class="font-extra-bold">Outstanding:</span>
                    <span class="price-text font-extra-bold">${systemSettings.currencySymbol}${outstanding.toLocaleString()}</span>
                </div>
            ` : ''}
        </div>

        ${customerDebt && sale.customer_name && sale.customer_name !== 'Walk-in Customer' ? `
            <!-- Customer Debt Section -->
            <div class="separator"></div>
            <div class="payment-section">
                <div class="total-row">
                    <span class="font-bold">Previous Balance:</span>
                    <span class="price-text">${systemSettings.currencySymbol}${customerDebt.previousBalance.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span class="font-bold">Current Balance:</span>
                    <span class="price-text">${systemSettings.currencySymbol}${customerDebt.currentBalance.toLocaleString()}</span>
                </div>
                <div class="total-row outstanding">
                    <span class="font-extra-bold">Total Balance:</span>
                    <span class="price-text font-extra-bold">${systemSettings.currencySymbol}${customerDebt.totalBalance.toLocaleString()}</span>
                </div>
            </div>
        ` : ''}

        <!-- Footer Section -->
        <div class="footer-section">
            ${receiptSettings.footerText ? `
                <div class="mt-2 text-xs font-bold">
                    ${receiptSettings.footerText}
                </div>
            ` : ''}
        </div>

        <div class="cut-line">✂ ═══════════════════ ✂</div>
    </div>
</body>
</html>`;
};

// Helper function to format currency properly
export const formatCurrency = (amount: number, settings: { currencySymbol: string }) => {
  return `${settings.currencySymbol}${amount.toFixed(2)}`;
};

// Helper function to format date according to system settings
export const formatReceiptDate = (date: Date, format: string) => {
  switch (format.toLowerCase()) {
    case 'dd/mm/yyyy':
      return date.toLocaleDateString('en-GB');
    case 'mm/dd/yyyy':
      return date.toLocaleDateString('en-US');
    case 'yyyy-mm-dd':
      return date.toISOString().split('T')[0];
    default:
      return date.toLocaleDateString();
  }
};

// Helper function for time formatting
export const formatReceiptTime = (date: Date, format: string) => {
  switch (format.toLowerCase()) {
    case '12h':
    case '12-hour':
      return date.toLocaleTimeString('en-US', { 
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });
    case '24h':
    case '24-hour':
    default:
      return date.toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
  }
};

// Enhanced version with better date/time formatting
export const enhancedInvoiceHtml = (
  sale: Omit<TSale, "updated_at" | "sale_date" | "customer_id">,
  items: Pick<TSaleItem, "product_name" | "quantity" | "unit_price" | "total_price">[],
  settings: {
    businessInfo: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
      website: string;
      logo: string | null;
    };
    receiptSettings: {
      footerText: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  },
  customerDebt?: {
    previousBalance: number;
    currentBalance: number;
    totalBalance: number;
  }
) => {
  const { businessInfo, receiptSettings, systemSettings } = settings;
  const saleDate = new Date(sale.created_at);
  
  // Use the enhanced formatting functions
  const formattedDate = formatReceiptDate(saleDate, systemSettings.dateFormat);
  const formattedTime = formatReceiptTime(saleDate, systemSettings.timeFormat);
  
  // Replace the date/time formatting in the original template
  return invoiceHtml(sale, items, settings, customerDebt)
    .replace(
      `<span>${format(new Date(sale.created_at), "dd/MM/yyyy")}</span>`,
      `<span>${formattedDate}</span>`
    )
    .replace(
      `<span>${format(new Date(sale.created_at), "HH:mm:ss")}</span>`,
      `<span>${formattedTime}</span>`
    );
};

export const customerDebtStatementHtml = (
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  },
  debtHistory: any[],
  settings: {
    businessInfo: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
      website: string;
      logo: string | null;
    };
    receiptSettings: {
      footerText: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  },
) => {
  const { businessInfo, receiptSettings, systemSettings } = settings;
  const currentDate = new Date();
  const totalOutstanding = debtHistory
    .filter(debt => !debt.is_paid)
    .reduce((sum, debt) => sum + debt.amount_owed, 0);
  
  const totalPaid = debtHistory
    .flatMap(debt => debt.payments || [])
    .reduce((sum, payment) => sum + payment.amount_paid, 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Debt Statement - ${customer.name}</title>
    <style>
        @page {
          font-family:Tahoma;
          size: 80mm auto;
          margin: 0;
          padding: 0;
        }
        
        @media print {
            @page {
                font-family:Tahoma;
                font-style: normal;
                margin: 0;
                padding: 0;
                size: 80mm auto;
            }
            
            body {
                font-size: 12px;
                line-height: 1.4;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                color: black;
            }

            .print-content {
                width: 100%;
                height: auto;
                padding: 0;
                box-sizing: border-box;
                margin: 0;
            }
            
            * {
                -webkit-box-sizing: border-box;
                box-sizing: border-box;
            }
        }

        body {
            font-family:Tahoma;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 2mm;
            color: black;
            background: white;
        }

        .print-content {
            margin: 0 auto;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .text-xl { font-size: 16px; font-weight: 900; }
        .text-lg { font-size: 14px; font-weight: 800; }
        .text-sm { font-size: 12px; font-weight: 600; }
        .text-xs { font-size: 10px; font-weight: 600; }
        .font-bold { font-weight: 700; }
        .font-extra-bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .gap-2 { gap: 0.5rem; }
        
        .separator {
            border-top: 2px dashed black;
            margin: 5px 0;
            width: 100%;
        }
        
        .separator-solid {
            border-top: 2px solid black;
            margin: 4px 0;
            width: 100%;
        }
        
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .pt-2 { padding-top: 0.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        
        table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 5px 0;
            table-layout: fixed;
            border: 1px solid black;
        }
        
        th, td { 
            padding: 4px 3px;
            border: 1px solid black;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-weight: 600;
        }
        
        .item-table th {
            font-size: 10px;
            font-weight: 800;
            background-color: #f0f0f0;
            border: 1px solid black;
            padding: 8px 4px;
            text-align: center;
        }
        
        .item-table td {
            font-size: 10px;
            font-weight: 600;
            padding: 4px 3px;
            vertical-align: top;
            border: 1px solid black;
        }
        
        .header-section {
            margin-bottom: 3px;
        }
        
        .logo {
            max-width: 100px;
            max-height: 100px;
            margin: 0 auto 0 auto;
            display: block;
        }
        
        .business-name {
            font-size: 22px;
            font-weight: 900;
            margin-bottom: 3px;
            letter-spacing: 0.5px;
        }
        
        .business-info {
            font-size: 10px;
            font-weight: 600;
            line-height: 1.4;
            margin-bottom: 3px;
        }
        
        .transaction-info {
            margin: 6px 0;
            font-size: 10px;
            font-weight: 600;
        }
        
        .transaction-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-weight: 600;
        }
        
        .totals-section {
            margin-top: 6px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 12px;
            font-weight: 700;
            padding: 2px 0;
        }
        
        .final-total {
            font-weight: 900;
            font-size: 14px;
            border-top: 1px solid black;
            border-bottom: 1px solid black;
            padding: 6px 0;
            margin: 4px 0;
            background-color: #f0f0f0;
        }
        
        .payment-section {
            margin-top: 5px;
            padding-top: 8px;
            border-top: 1px dashed black;
        }
        
        .footer-section {
            text-align: center;
            margin-top: 8px;
            padding-top: 10px;
            border-top: 1px dashed black;
            font-size: 10px;
            font-weight: 600;
        }
        
        .cut-line {
            text-align: center;
            margin: 8px 0 10px 0;
            font-size: 10px;
            font-weight: 700;
            color: #333;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
        
        .outstanding {
            background-color: #e0e0e0;
            padding: 6px;
            border: 1px solid black;
            margin-top: 4px;
            font-weight: 800;
        }
        
        .price-text {
            font-weight: 700;
            white-space: nowrap;
            overflow: visible;
        }
        
        /* Ensure all text is bold and readable */
        body, div, span, p, td, th {
            font-weight: 600;
        }
        
        /* Extra bold for important elements */
        .business-name,
        .final-total,
        .outstanding,
        .item-table th {
            font-weight: 900;
        }

        .flex {
            display: flex;
        }
        .justify-between {
            justify-content: space-between;
        }
        
        /* Responsive adjustments for different paper sizes */
        @media print and (max-width: 60mm) {
            .print-content { padding: 1mm; }
            .text-xl { font-size: 14px; font-weight: 900; }
            .text-lg { font-size: 12px; font-weight: 800; }
            body { font-size: 10px; font-weight: 600; }
            .logo { max-width: 100px; max-height: 100px; }
            .business-name { font-size: 22px; }
            .item-table th, .item-table td { font-size: 10px; padding: 4px 2px; }
            .total-row { font-size: 10px; }
            .final-total { font-size: 13px; }
        }
    </style>
</head>
<body>
    <div class="print-content">
        <div class="header-section text-center">
            ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="Logo" class="logo">` : ''}
            <div class="business-name">${businessInfo.name}</div>
            <div class="business-info">${businessInfo.address}</div>
            <div class="business-info">${businessInfo.city}, ${businessInfo.state} ${businessInfo.zipCode}</div>
            <div class="business-info">Phone: ${businessInfo.phone}</div>
            <div class="business-info">Email: ${businessInfo.email}</div>
            ${businessInfo.website ? `<div class="business-info">Website: ${businessInfo.website}</div>` : ''}
        </div>
        
        <div class="separator"></div>
        
        <div class="text-center text-lg font-extra-bold uppercase mb-2">Customer Debt Statement</div>
        
        <div class="separator"></div>
        
        <div class="transaction-info">
            <div class="transaction-row">
                <span class="font-bold">Customer:</span>
                <span class="font-bold">${customer.name}</span>
            </div>
            <div class="transaction-row">
                <span>Customer ID:</span>
                <span>${customer.id.slice(-8).toUpperCase()}</span>
            </div>
            <div class="transaction-row">
                <span>Phone:</span>
                <span>${customer.phone || 'N/A'}</span>
            </div>
            <div class="transaction-row">
                <span>Email:</span>
                <span>${customer.email || 'N/A'}</span>
            </div>
            <div class="transaction-row">
                <span>Address:</span>
                <span>${customer.address || 'N/A'}</span>
            </div>
            <div class="transaction-row">
                <span>Statement Date:</span>
                <span>${format(currentDate, 'MMM dd, yyyy')}</span>
            </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="totals-section">
            <div class="total-row">
                <span>Total Outstanding:</span>
                <span class="price-text">${systemSettings.currencySymbol}${formatAmount(totalOutstanding)}</span>
            </div>
            <div class="total-row">
                <span>Total Paid:</span>
                <span class="price-text">${systemSettings.currencySymbol}${formatAmount(totalPaid)}</span>
            </div>
            <div class="total-row">
                <span>Debt Records:</span>
                <span>${debtHistory.length}</span>
            </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="text-center text-sm font-bold mb-2">DEBT HISTORY</div>
        
        <table class="item-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${debtHistory.map(debt => {
                    const isOverdue = !debt.is_paid && new Date(debt.due_date) < new Date();
                    return `
                        <tr>
                            <td class="text-xs">${format(new Date(debt.created_at), 'MMM dd, yyyy')}</td>
                            <td class="text-xs text-right price-text">${systemSettings.currencySymbol}${formatAmount(debt.amount_owed)}</td>
                            <td class="text-xs">${format(new Date(debt.due_date), 'MMM dd, yyyy')}</td>
                            <td class="text-xs font-bold">
                                ${debt.is_paid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                            </td>
                        </tr>
                        ${debt.payments && debt.payments.length > 0 ? debt.payments.map(payment => `
                            <tr>
                                <td class="text-xs" style="padding-left: 8px;">Payment: ${format(new Date(payment.payment_date), 'MMM dd')}</td>
                                <td class="text-xs text-right price-text">-${systemSettings.currencySymbol}${formatAmount(payment.amount_paid)}</td>
                                <td class="text-xs">${payment.payment_method.toUpperCase()}</td>
                                <td class="text-xs">PAID</td>
                            </tr>
                        `).join('') : ''}
                    `;
                }).join('')}
            </tbody>
        </table>
        
        ${totalOutstanding > 0 ? `
            <div class="outstanding">
                <div class="flex justify-between">
                    <span class="font-extra-bold">TOTAL OUTSTANDING:</span>
                    <span class="font-extra-bold price-text">${systemSettings.currencySymbol}${formatAmount(totalOutstanding)}</span>
                </div>
            </div>
        ` : ''}
        
        <div class="footer-section">
            <div class="text-xs">${receiptSettings.footerText}</div>
            <div class="text-xs mt-2">Generated: ${format(currentDate, 'MMM dd, yyyy HH:mm:ss')}</div>
            <div class="text-xs">Contact: ${businessInfo.phone} | ${businessInfo.email}</div>
        </div>
        
        <div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - - - ✂</div>
    </div>
</body>
</html>
  `;
};

export const stockInventoryHtml = (
  products: {
    id: string;
    name: string;
    category: string;
    cost_price: number;
    selling_price: number;
    quantity_on_hand: number;
    reorder_level: number;
  }[],
  settings: {
    businessInfo: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
      website: string;
      logo: string | null;
    };
    receiptSettings: {
      footerText: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  },
) => {
  const currentDate = new Date();
  const formattedDate = formatReceiptDate(currentDate, settings.systemSettings.dateFormat);
  const formattedTime = formatReceiptTime(currentDate, settings.systemSettings.timeFormat);
  
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, product) => sum + (product.selling_price * product.quantity_on_hand), 0);
  const lowStockItems = products.filter(product => product.quantity_on_hand <= product.reorder_level);
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stock Inventory Report</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        
        body {
          font-family: 'Tahoma', Arial, sans-serif;
          font-size: 10px;
          line-height: 1.2;
          color: #000;
          margin: 0;
          padding: 4px;
          width: 72mm;
          background: white;
        }
        
        .print-content {
          width: 100%;
          margin: 0;
          padding: 0;
        }
        
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-xs { font-size: 8px; }
        .text-sm { font-size: 9px; }
        .text-lg { font-size: 12px; }
        .font-bold { font-weight: bold; }
        .font-extra-bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .mb-1 { margin-bottom: 2px; }
        .mb-2 { margin-bottom: 4px; }
        .mt-2 { margin-top: 4px; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        
        .header-section {
          text-align: center;
          margin-bottom: 8px;
        }
        
        .logo {
          max-width: 40mm;
          max-height: 15mm;
          margin: 0 auto 4px;
        }
        
        .business-name {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 2px;
          line-height: 1.1;
        }
        
        .business-info {
          font-size: 8px;
          line-height: 1.2;
          margin-bottom: 1px;
        }
        
        .separator {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        
        .transaction-info {
          margin: 4px 0;
        }
        
        .transaction-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
          font-size: 8px;
        }
        
        .item-table {
          width: 100%;
          border-collapse: collapse;
          margin: 4px 0;
        }
        
        .item-table th,
        .item-table td {
          padding: 1px 2px;
          text-align: left;
          border: none;
          font-size: 8px;
          line-height: 1.1;
        }
        
        .item-table th {
          font-weight: bold;
          border-bottom: 1px solid #000;
        }
        
        .price-text {
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .totals-section {
          margin-top: 4px;
          border-top: 1px dashed #000;
          padding-top: 4px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
          font-size: 9px;
        }
        
        .grand-total {
          border-top: 1px solid #000;
          border-bottom: 1px double #000;
          padding: 2px 0;
          margin-top: 2px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .footer-section {
          text-align: center;
          margin-top: 8px;
          font-size: 7px;
          line-height: 1.2;
        }
        
        .cut-line {
          text-align: center;
          margin: 8px 0 4px;
          font-size: 8px;
          color: #666;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin: 4px 0;
          font-size: 8px;
        }
        
        .summary-item {
          text-align: center;
          padding: 2px;
          border: 1px solid #000;
        }
        
        .low-stock {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .out-of-stock {
          background-color: #f8d7da;
          color: #721c24;
        }
      </style>
    </head>
    <body>
      <div class="print-content">
        <div class="header-section">
          ${settings.businessInfo.logo ? `<img src="${settings.businessInfo.logo}" alt="Logo" class="logo">` : ''}
          <div class="business-name text-center">${settings.businessInfo.name}</div>
          <div class="business-info text-center">
            ${settings.businessInfo.address}<br>
            ${settings.businessInfo.city}, ${settings.businessInfo.state} ${settings.businessInfo.zipCode}<br>
            ${settings.businessInfo.phone} | ${settings.businessInfo.email}
            ${settings.businessInfo.website ? `<br>${settings.businessInfo.website}` : ''}
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="text-center text-lg font-extra-bold uppercase mb-2">STOCK INVENTORY</div>
        
        <div class="transaction-info">
          <div class="transaction-row">
            <span>Date:</span>
            <span>${formattedDate}</span>
          </div>
          <div class="transaction-row">
            <span>Time:</span>
            <span>${formattedTime}</span>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="summary-grid">
          <div class="summary-item">
            <div class="text-xs font-bold">TOTAL PRODUCTS</div>
            <div class="font-extra-bold">${totalProducts}</div>
          </div>
          <div class="summary-item">
            <div class="text-xs font-bold">TOTAL VALUE</div>
            <div class="font-extra-bold price-text">${formatCurrency(totalValue, settings.systemSettings)}</div>
          </div>
          <div class="summary-item">
            <div class="text-xs font-bold">LOW STOCK</div>
            <div class="font-extra-bold">${lowStockItems.length}</div>
          </div>
          <div class="summary-item">
            <div class="text-xs font-bold">CURRENCY</div>
            <div class="font-extra-bold">${settings.systemSettings.currencySymbol}</div>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <table class="item-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => {
              const stockValue = product.selling_price * product.quantity_on_hand;
              const isLowStock = product.quantity_on_hand <= product.reorder_level;
              
              return `
                <tr ${isLowStock ? 'class="low-stock"' : ''}>
                  <td class="text-xs">
                    ${product.name}<br>
                    <span style="color: #666; font-style: italic;">${product.category}</span>
                  </td>
                  <td class="text-xs text-center">${product.quantity_on_hand}${isLowStock ? ' ⚠️' : ''}</td>
                  <td class="text-xs text-right price-text">${formatCurrency(product.selling_price, settings.systemSettings)}</td>
                  <td class="text-xs text-right price-text">${formatCurrency(stockValue, settings.systemSettings)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        ${lowStockItems.length > 0 ? `
          <div class="separator"></div>
          
          <div class="text-center text-sm font-bold mb-2">⚠️ LOW STOCK ALERT</div>
          
          <table class="item-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current</th>
                <th>Reorder</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockItems.map(product => {
                return `
                  <tr class="low-stock">
                    <td class="text-xs">${product.name}</td>
                    <td class="text-xs text-center">${product.quantity_on_hand}</td>
                    <td class="text-xs text-center">${product.reorder_level}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}
        
        <div class="totals-section">
          <div class="grand-total">
            <div class="flex justify-between">
              <span class="font-extra-bold">TOTAL INVENTORY VALUE:</span>
              <span class="font-extra-bold price-text">${formatCurrency(totalValue, settings.systemSettings)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer-section">
          <div class="text-xs">${settings.receiptSettings.footerText}</div>
          <div class="text-xs mt-2">Generated: ${formattedDate} ${formattedTime}</div>
          <div class="text-xs">Contact: ${settings.businessInfo.phone} | ${settings.businessInfo.email}</div>
        </div>
        
        <div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - - - ✂</div>
      </div>
    </body>
    </html>
  `;
  
  return html;
};

export const profitReportHtml = (
  profitData: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  },
  dailyBreakdown: {
    date: string;
    revenue: number;
    cost: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  }[],
  productProfitability: {
    productName: string;
    quantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  }[],
  periodLabel: string,
  settings: {
    businessInfo: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
      website: string;
      logo: string | null;
    };
    receiptSettings: {
      footerText: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  },
) => {
  const { businessInfo, receiptSettings, systemSettings } = settings;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Profit Report - ${periodLabel}</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0;
        }
        
        @media print {
            body { 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Tahoma', 'Arial', sans-serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 8px;
            width: 80mm;
            box-sizing: border-box;
        }
        
        .print-content {
            width: 100%;
            max-width: 80mm;
        }
        
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-lg { font-size: 13px; }
        .text-sm { font-size: 10px; }
        .text-xs { font-size: 9px; }
        .font-bold { font-weight: bold; }
        .font-extra-bold { font-weight: 900; }
        .uppercase { text-transform: uppercase; }
        .mb-1 { margin-bottom: 2px; }
        .mb-2 { margin-bottom: 4px; }
        .mb-3 { margin-bottom: 6px; }
        .mt-2 { margin-top: 4px; }
        .mt-3 { margin-top: 6px; }
        .py-1 { padding-top: 2px; padding-bottom: 2px; }
        .px-1 { padding-left: 2px; padding-right: 2px; }
        
        .separator {
            border-top: 1px dashed #000;
            margin: 6px 0;
            height: 1px;
        }
        
        .header-section {
            margin-bottom: 8px;
        }
        
        .logo {
            max-width: 60px;
            max-height: 60px;
            margin: 0 auto 4px;
            display: block;
        }
        
        .business-name {
            font-size: 14px;
            font-weight: 900;
            margin-bottom: 2px;
        }
        
        .business-info {
            font-size: 9px;
            line-height: 1.2;
            margin-bottom: 2px;
        }
        
        .transaction-info {
            margin: 6px 0;
        }
        
        .transaction-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            font-size: 10px;
        }
        
        .summary-grid {
            margin: 6px 0;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 10px;
        }
        
        .summary-label {
            font-weight: bold;
        }
        
        .summary-value {
            font-weight: bold;
        }
        
        .positive { color: #000; }
        .negative { color: #000; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
            font-size: 9px;
        }
        
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            padding: 2px 1px;
            text-align: left;
            border-bottom: 1px solid #000;
            font-size: 8px;
        }
        
        td {
            padding: 1px;
            border-bottom: 1px dotted #ccc;
            vertical-align: top;
        }
        
        .totals-section {
            margin-top: 6px;
            border-top: 1px solid #000;
            padding-top: 4px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-weight: bold;
        }
        
        .price-text {
            font-family: 'Courier New', monospace;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 8px;
            text-align: center;
            font-size: 8px;
            line-height: 1.2;
        }
        
        .cut-line {
            text-align: center;
            margin: 8px 0 4px;
            font-size: 8px;
            letter-spacing: 2px;
        }
        
    </style>
</head>
<body>
    <div class="print-content">
        <!-- Header Section -->
        <div class="header-section text-center">
            ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="Logo" class="logo">` : ''}
            <div class="business-name text-lg font-extra-bold uppercase mb-2">${businessInfo.name}</div>
            <div class="business-info text-xs mb-1">${businessInfo.address}</div>
            <div class="business-info text-xs mb-1">${businessInfo.city}, ${businessInfo.state} ${businessInfo.zipCode}</div>
            <div class="business-info text-xs mb-1">Tel: ${businessInfo.phone}</div>
            ${businessInfo.email ? `<div class="business-info text-xs mb-1">Email: ${businessInfo.email}</div>` : ''}
            ${businessInfo.website ? `<div class="business-info text-xs mb-2">Web: ${businessInfo.website}</div>` : ''}
        </div>
        
        <div class="separator"></div>
        
        <!-- Report Title -->
        <div class="text-center mb-3">
            <div class="text-lg font-bold uppercase">PROFIT REPORT</div>
            <div class="text-sm">${periodLabel}</div>
            <div class="text-xs">Generated: ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="separator"></div>
        
        <!-- Transaction Info -->
        <div class="transaction-info">
            <div class="transaction-row">
                <span>Report Period:</span>
                <span class="price-text">${periodLabel}</span>
            </div>
            <div class="transaction-row">
                <span>Generated:</span>
                <span>${new Date().toLocaleDateString()}</span>
            </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- Financial Summary -->
        <div class="text-center text-sm font-bold mb-2 uppercase">FINANCIAL SUMMARY</div>
        <div class="summary-grid">
            <div class="summary-item">
                <span class="summary-label">Total Revenue:</span>
                <span class="summary-value price-text">${formatCurrency(profitData.totalRevenue)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Total Cost:</span>
                <span class="summary-value price-text">${formatCurrency(profitData.totalCost)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Gross Profit:</span>
                <span class="summary-value price-text">${formatCurrency(profitData.grossProfit)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Total Expenses:</span>
                <span class="summary-value price-text">${formatCurrency(profitData.totalExpenses)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Net Profit:</span>
                <span class="summary-value price-text">${formatCurrency(profitData.netProfit)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Profit Margin:</span>
                <span class="summary-value">${formatPercentage(profitData.profitMargin)}</span>
            </div>
        </div>

        
        ${dailyBreakdown.length > 0 ? `
        <div class="separator"></div>
        
        <!-- Daily Breakdown -->
        <div class="text-center text-sm font-bold mb-2 uppercase">DAILY BREAKDOWN</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                </tr>
            </thead>
            <tbody>
                ${dailyBreakdown.map(day => `
                <tr>
                    <td>${new Date(day.date).toLocaleDateString()}</td>
                    <td class="price-text">${formatCurrency(day.revenue)}</td>
                    <td class="price-text">${formatCurrency(day.cost)}</td>
                    <td class="price-text">${formatCurrency(day.netProfit)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${productProfitability.length > 0 ? `
        <div class="separator"></div>
        
        <!-- Product Profitability -->
        <div class="text-center text-sm font-bold mb-2 uppercase">PRODUCT PROFITABILITY</div>
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                </tr>
            </thead>
            <tbody>
                ${productProfitability.map(product => `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.quantitySold}</td>
                    <td class="price-text">${formatCurrency(product.totalRevenue)}</td>
                    <td class="price-text">${formatCurrency(product.grossProfit)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        <!-- Totals Section -->
        <div class="totals-section">
            <div class="total-row">
                <span>NET PROFIT:</span>
                <span class="price-text">${formatCurrency(profitData.netProfit)}</span>
            </div>
            <div class="total-row">
                <span>PROFIT MARGIN:</span>
                <span class="price-text">${formatPercentage(profitData.profitMargin)}</span>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="mb-1">${receiptSettings.footerText}</div>
            <div class="text-xs">Generated: ${new Date().toLocaleString()}</div>
            <div class="text-xs">By: ${businessInfo.name}</div>
            ${businessInfo.phone ? `<div class="text-xs">Tel: ${businessInfo.phone}</div>` : ''}
        </div>
        
        <div class="cut-line">- - - - - - - - - - - - - - - -</div>
    </div>
</body>
</html>
  `;
  
  return html;
};

export const debtorsListHtml = (
  debtors: {
    id: string;
    customer_name: string;
    amount_owed: number;
    due_date: string;
    is_paid: boolean;
    created_at: string;
  }[],
  settings: {
    businessInfo: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      email: string;
      website: string;
      logo: string | null;
    };
    receiptSettings: {
      footerText: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  },
) => {
  const currentDate = new Date();
  const formattedDate = formatReceiptDate(currentDate, settings.systemSettings.dateFormat);
  const formattedTime = formatReceiptTime(currentDate, settings.systemSettings.timeFormat);
  
  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.amount_owed, 0);
  const paidDebtors = debtors.filter(debtor => debtor.is_paid);
  const unpaidDebtors = debtors.filter(debtor => !debtor.is_paid);
  const overdueDebtors = unpaidDebtors.filter(debtor => new Date(debtor.due_date) < new Date());
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Debtors List</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 5mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Tahoma', 'Arial', sans-serif;
          font-size: 11px;
          line-height: 1.3;
          color: #000;
          background: white;
          width: 80mm;
          margin: 0 auto;
          padding: 8px;
          box-sizing: border-box;
        }
        
        .container {
          width: 100%;
          padding: 2mm;
        }
        
        .header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        
        .business-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .business-info {
          font-size: 8px;
          line-height: 1.3;
        }
        
        .report-title {
          font-size: 11px;
          font-weight: bold;
          text-align: center;
          margin: 8px 0;
          text-transform: uppercase;
        }
        
        .report-meta {
          font-size: 8px;
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        
        .summary {
          margin-bottom: 8px;
          font-size: 9px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
        }
        
        .summary-label {
          font-weight: bold;
        }
        
        .summary-value {
          font-weight: bold;
        }
        
        .total-debt {
          font-size: 10px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 2px 0;
          margin: 3px 0;
        }
        
        .debtors-list {
          margin-bottom: 8px;
        }
        
        .debtor-item {
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dotted #ccc;
          font-size: 8px;
        }
        
        .debtor-name {
          font-weight: bold;
          font-size: 9px;
          margin-bottom: 1px;
        }
        
        .debtor-details {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
        }
        
        .amount {
          font-weight: bold;
        }
        
        .overdue {
          color: #000;
          font-weight: bold;
        }
        
        .paid {
          text-decoration: line-through;
        }
        
        .status {
          font-size: 7px;
          text-transform: uppercase;
          font-weight: bold;
        }
        
        .footer {
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px dashed #000;
          text-align: center;
          font-size: 7px;
        }
        
        .cut-line {
          text-align: center;
          margin: 8px 0;
          font-size: 8px;
          font-weight: bold;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="business-name">${settings.businessInfo.name}</div>
          <div class="business-info">
            ${settings.businessInfo.address}<br>
            ${settings.businessInfo.phone}
          </div>
        </div>
        
        <div class="report-title">Debtors List</div>
        
        <div class="report-meta">
          ${formattedDate} ${formattedTime}
        </div>
        
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Total Debtors:</span>
            <span class="summary-value">${debtors.length}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Paid:</span>
            <span class="summary-value">${paidDebtors.length}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Unpaid:</span>
            <span class="summary-value">${unpaidDebtors.length}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Overdue:</span>
            <span class="summary-value">${overdueDebtors.length}</span>
          </div>
          <div class="summary-row total-debt">
            <span class="summary-label">Total Debt:</span>
            <span class="summary-value">${formatCurrency(totalDebt, settings.systemSettings)}</span>
          </div>
        </div>
        
        <div class="debtors-list">
          ${debtors.map(debtor => {
            const isOverdue = !debtor.is_paid && new Date(debtor.due_date) < new Date();
            const dueDate = formatReceiptDate(new Date(debtor.due_date), settings.systemSettings.dateFormat);
            
            return `
              <div class="debtor-item ${debtor.is_paid ? 'paid' : ''}">
                <div class="debtor-name">${debtor.customer_name}</div>
                <div class="debtor-details">
                  <span>Amount:</span>
                  <span class="amount">${formatCurrency(debtor.amount_owed, settings.systemSettings)}</span>
                </div>
                <div class="debtor-details">
                  <span>Due:</span>
                  <span class="${isOverdue ? 'overdue' : ''}">${dueDate}</span>
                </div>
                <div class="debtor-details">
                  <span>Status:</span>
                  <span class="status ${debtor.is_paid ? 'paid' : isOverdue ? 'overdue' : ''}">
                    ${debtor.is_paid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="footer">
          <div>${settings.receiptSettings.footerText}</div>
          <div class="cut-line">- - - - - - - - - - - - - - - -</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
};