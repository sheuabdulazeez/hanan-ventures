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
          font-family: Tahoma;
          size: A4;
          margin: 20mm;
        }
        
        @media print {
            @page {
                font-family: Tahoma;
                margin: 20mm;
                size: A4;
            }
            
            body {
                font-size: 12px;
                line-height: 1.4;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
        
        body {
            font-family: Tahoma, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .business-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .business-info {
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .statement-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0 20px 0;
            text-transform: uppercase;
        }
        
        .customer-info {
            background: #f5f5f5;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        
        .customer-info h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .summary {
            background: #e8f4fd;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            border-left: 4px solid #2196F3;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .outstanding {
            color: #d32f2f;
            font-size: 16px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .amount {
            text-align: right;
        }
        
        .status-paid {
            color: #4caf50;
            font-weight: bold;
        }
        
        .status-outstanding {
            color: #f44336;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        .payment-history {
            margin-top: 10px;
            font-size: 10px;
        }
        
        .payment-history table {
            margin-top: 5px;
        }
        
        .payment-history th,
        .payment-history td {
            padding: 4px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="business-name">${businessInfo.name}</div>
        <div class="business-info">${businessInfo.address}</div>
        <div class="business-info">${businessInfo.city}, ${businessInfo.state} ${businessInfo.zipCode}</div>
        <div class="business-info">Phone: ${businessInfo.phone} | Email: ${businessInfo.email}</div>
        ${businessInfo.website ? `<div class="business-info">Website: ${businessInfo.website}</div>` : ''}
    </div>
    
    <div class="statement-title">Customer Debt Statement</div>
    
    <div class="customer-info">
        <h3>Customer Information</h3>
        <div class="info-row">
            <span><strong>Name:</strong> ${customer.name}</span>
            <span><strong>Customer ID:</strong> ${customer.id.slice(-8).toUpperCase()}</span>
        </div>
        <div class="info-row">
            <span><strong>Phone:</strong> ${customer.phone || 'N/A'}</span>
            <span><strong>Email:</strong> ${customer.email || 'N/A'}</span>
        </div>
        <div class="info-row">
            <span><strong>Address:</strong> ${customer.address || 'N/A'}</span>
            <span><strong>Statement Date:</strong> ${format(currentDate, 'MMM dd, yyyy')}</span>
        </div>
    </div>
    
    <div class="summary">
        <div class="summary-row">
            <span>Total Outstanding:</span>
            <span class="outstanding">${systemSettings.currencySymbol}${formatAmount(totalOutstanding)}</span>
        </div>
        <div class="summary-row">
            <span>Total Paid:</span>
            <span>${systemSettings.currencySymbol}${formatAmount(totalPaid)}</span>
        </div>
        <div class="summary-row">
            <span>Number of Debt Records:</span>
            <span>${debtHistory.length}</span>
        </div>
    </div>
    
    <h3>Debt History</h3>
    <table>
        <thead>
            <tr>
                <th>Date Created</th>
                <th>Original Amount</th>
                <th>Amount Owed</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Payments</th>
            </tr>
        </thead>
        <tbody>
            ${debtHistory.map(debt => `
                <tr>
                    <td>${format(new Date(debt.created_at), 'MMM dd, yyyy')}</td>
                    <td class="amount">${systemSettings.currencySymbol}${formatAmount(debt.sale_amount || debt.amount_owed)}</td>
                    <td class="amount">${systemSettings.currencySymbol}${formatAmount(debt.amount_owed)}</td>
                    <td>${format(new Date(debt.due_date), 'MMM dd, yyyy')}</td>
                    <td class="${debt.is_paid ? 'status-paid' : 'status-outstanding'}">
                        ${debt.is_paid ? 'PAID' : 'OUTSTANDING'}
                    </td>
                    <td>
                        ${debt.payments && debt.payments.length > 0 ? `
                            <div class="payment-history">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${debt.payments.map(payment => `
                                            <tr>
                                                <td>${format(new Date(payment.payment_date), 'MMM dd')}</td>
                                                <td>${systemSettings.currencySymbol}${formatAmount(payment.amount_paid)}</td>
                                                <td>${payment.payment_method.toUpperCase()}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : 'No payments'}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>This statement was generated on ${format(currentDate, 'MMM dd, yyyy')} at ${format(currentDate, 'HH:mm:ss')}</p>
        <p>${receiptSettings.footerText}</p>
        <p>For any queries regarding this statement, please contact us at ${businessInfo.phone} or ${businessInfo.email}</p>
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
          size: A4;
          margin: 20mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        .container {
          max-width: 100%;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        
        .logo {
          max-width: 80px;
          max-height: 80px;
          margin: 0 auto 15px;
          display: block;
        }
        
        .business-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 8px;
        }
        
        .business-info {
          font-size: 11px;
          color: #666;
          line-height: 1.5;
        }
        
        .report-title {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          color: #1f2937;
        }
        
        .report-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .meta-item {
          text-align: center;
        }
        
        .meta-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .meta-value {
          font-size: 14px;
          font-weight: bold;
          color: #1f2937;
        }
        
        .summary-section {
          margin-bottom: 25px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .summary-card {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        
        .summary-card.total {
          background-color: #dbeafe;
          border-color: #2563eb;
        }
        
        .summary-card.value {
          background-color: #dcfce7;
          border-color: #16a34a;
        }
        
        .summary-card.low-stock {
          background-color: #fef3c7;
          border-color: #d97706;
        }
        
        .summary-title {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .summary-number {
          font-size: 18px;
          font-weight: bold;
        }
        
        .table-container {
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        
        th {
          background-color: #f1f5f9;
          color: #374151;
          font-weight: 600;
          padding: 12px 8px;
          text-align: left;
          border-bottom: 2px solid #e2e8f0;
          font-size: 10px;
          text-transform: uppercase;
        }
        
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        
        tr:hover {
          background-color: #f0f9ff;
        }
        
        .product-name {
          font-weight: 600;
          color: #1f2937;
        }
        
        .category {
          color: #6b7280;
          font-style: italic;
        }
        
        .price {
          text-align: right;
          font-weight: 500;
        }
        
        .quantity {
          text-align: center;
          font-weight: 600;
        }
        
        .low-stock-indicator {
          background-color: #fef3c7;
          color: #92400e;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #6b7280;
          font-size: 10px;
        }
        
        .generated-info {
          margin-top: 10px;
          font-size: 9px;
          color: #9ca3af;
        }
        
        @media print {
          .container {
            padding: 0;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${settings.businessInfo.logo ? `<img src="${settings.businessInfo.logo}" alt="Logo" class="logo">` : ''}
          <div class="business-name">${settings.businessInfo.name}</div>
          <div class="business-info">
            ${settings.businessInfo.address}<br>
            ${settings.businessInfo.city}, ${settings.businessInfo.state} ${settings.businessInfo.zipCode}<br>
            Phone: ${settings.businessInfo.phone} | Email: ${settings.businessInfo.email}
            ${settings.businessInfo.website ? `<br>Website: ${settings.businessInfo.website}` : ''}
          </div>
        </div>
        
        <div class="report-title">Stock Inventory Report</div>
        
        <div class="report-meta">
          <div class="meta-item">
            <div class="meta-label">Report Date</div>
            <div class="meta-value">${formattedDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Report Time</div>
            <div class="meta-value">${formattedTime}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Currency</div>
            <div class="meta-value">${settings.systemSettings.currencySymbol}</div>
          </div>
        </div>
        
        <div class="summary-section">
          <div class="summary-grid">
            <div class="summary-card total">
              <div class="summary-title">Total Products</div>
              <div class="summary-number">${totalProducts}</div>
            </div>
            <div class="summary-card value">
              <div class="summary-title">Total Inventory Value</div>
              <div class="summary-number">${formatCurrency(totalValue, settings.systemSettings)}</div>
            </div>
            <div class="summary-card low-stock">
              <div class="summary-title">Low Stock Items</div>
              <div class="summary-number">${lowStockItems.length}</div>
            </div>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Qty on Hand</th>
                <th>Stock Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(product => {
                const stockValue = product.selling_price * product.quantity_on_hand;
                const isLowStock = product.quantity_on_hand <= product.reorder_level;
                
                return `
                  <tr>
                    <td class="product-name">${product.name}</td>
                    <td class="category">${product.category}</td>
                    <td class="price">${formatCurrency(product.cost_price, settings.systemSettings)}</td>
                    <td class="price">${formatCurrency(product.selling_price, settings.systemSettings)}</td>
                    <td class="quantity">${product.quantity_on_hand}</td>
                    <td class="price">${formatCurrency(stockValue, settings.systemSettings)}</td>
                    <td>
                      ${isLowStock ? '<span class="low-stock-indicator">Low Stock</span>' : '<span style="color: #16a34a; font-weight: 600;">In Stock</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        ${lowStockItems.length > 0 ? `
          <div class="table-container">
            <h3 style="margin-bottom: 15px; color: #d97706; font-size: 16px;">⚠️ Low Stock Alert</h3>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Current Stock</th>
                  <th>Shortage</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockItems.map(product => {
                  const shortage = product.reorder_level - product.quantity_on_hand;
                  return `
                    <tr>
                      <td class="product-name">${product.name}</td>
                      <td class="quantity">${product.quantity_on_hand}</td>
                      <td class="quantity" style="color: #dc2626; font-weight: 600;">${shortage > 0 ? shortage : 0}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        <div class="footer">
          <div>${settings.receiptSettings.footerText}</div>
          <div class="generated-info">
            Report generated on ${formattedDate} at ${formattedTime}
          </div>
        </div>
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
          font-family: Tahoma;
          size: A4;
          margin: 20mm;
          padding: 0;
        }
        
        @media print {
            @page {
                font-family: Tahoma;
                font-style: normal;
                margin: 20mm;
                padding: 0;
                size: A4;
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
            font-family: Tahoma;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: black;
            background: white;
        }

        .print-content {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-4 { margin-top: 1rem; }
        .font-bold { font-weight: bold; }
        .text-lg { font-size: 1.125rem; }
        .text-xl { font-size: 1.25rem; }
        .text-2xl { font-size: 1.5rem; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }
        .border { border: 1px solid #ddd; }
        .border-collapse { border-collapse: collapse; }
        .w-full { width: 100%; }
        .p-2 { padding: 0.5rem; }
        .p-4 { padding: 1rem; }
        .bg-gray { background-color: #f5f5f5; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .metric-card {
            border: 1px solid #ddd;
            padding: 1rem;
            border-radius: 8px;
            background: #f9f9f9;
        }
        
        .metric-title {
            font-size: 12px;
            color: #666;
            margin-bottom: 0.25rem;
        }
        
        .metric-value {
            font-size: 16px;
            font-weight: bold;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 1.5rem 0 0.5rem 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.25rem;
        }
        
        .header {
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #ddd;
            padding-bottom: 1rem;
        }
        
        .business-info {
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="print-content">
        <div class="header">
            <div class="business-info">
                <div class="text-2xl font-bold">${businessInfo.name}</div>
                <div>${businessInfo.address}</div>
                <div>${businessInfo.city}, ${businessInfo.state} ${businessInfo.zipCode}</div>
                <div>Phone: ${businessInfo.phone}</div>
                <div>Email: ${businessInfo.email}</div>
                ${businessInfo.website ? `<div>Website: ${businessInfo.website}</div>` : ''}
            </div>
            <div class="text-xl font-bold mt-4">Profit Report - ${periodLabel}</div>
            <div>Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <!-- Key Metrics -->
        <div class="section-title">Financial Summary</div>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">Total Revenue</div>
                <div class="metric-value">${formatCurrency(profitData.totalRevenue)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Total Cost</div>
                <div class="metric-value text-red">${formatCurrency(profitData.totalCost)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Gross Profit</div>
                <div class="metric-value ${profitData.grossProfit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(profitData.grossProfit)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Total Expenses</div>
                <div class="metric-value text-red">${formatCurrency(profitData.totalExpenses)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Net Profit</div>
                <div class="metric-value ${profitData.netProfit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(profitData.netProfit)}</div>
                <div style="font-size: 10px; color: #666;">Margin: ${formatPercentage(profitData.profitMargin)}</div>
            </div>
        </div>

        ${dailyBreakdown.length > 0 ? `
        <!-- Daily Breakdown -->
        <div class="section-title">Daily Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Gross Profit</th>
                    <th>Expenses</th>
                    <th>Net Profit</th>
                </tr>
            </thead>
            <tbody>
                ${dailyBreakdown.map(day => `
                <tr>
                    <td>${new Date(day.date).toLocaleDateString()}</td>
                    <td>${formatCurrency(day.revenue)}</td>
                    <td class="text-red">${formatCurrency(day.cost)}</td>
                    <td class="${day.grossProfit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(day.grossProfit)}</td>
                    <td class="text-red">${formatCurrency(day.expenses)}</td>
                    <td class="${day.netProfit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(day.netProfit)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${productProfitability.length > 0 ? `
        <!-- Product Profitability -->
        <div class="section-title">Product Profitability</div>
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Gross Profit</th>
                    <th>Profit Margin</th>
                </tr>
            </thead>
            <tbody>
                ${productProfitability.map(product => `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.quantitySold}</td>
                    <td>${formatCurrency(product.totalRevenue)}</td>
                    <td class="text-red">${formatCurrency(product.totalCost)}</td>
                    <td class="${product.grossProfit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(product.grossProfit)}</td>
                    <td class="${product.profitMargin >= 0 ? 'text-green' : 'text-red'}">${formatPercentage(product.profitMargin)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="mt-4 text-center">
            <div>${receiptSettings.footerText}</div>
            <div style="margin-top: 1rem; font-size: 10px; color: #666;">Report generated by ${businessInfo.name}</div>
        </div>
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
          font-family: 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.2;
          color: #000;
          background: white;
          width: 70mm;
          margin: 0 auto;
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