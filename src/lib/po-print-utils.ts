import { PurchaseOrder } from "@/database/orders";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface POSettings {
    businessInfo: {
        name: string;
        address: string;
        phone: string;
        email: string;
        logo: string | null;
    };
    systemSettings: {
        currencySymbol: string;
    };
}

export const generatePOHtml = (
    po: PurchaseOrder,
    settings: POSettings
) => {
    const { businessInfo, systemSettings } = settings;
    const poDate = new Date(po.order_date);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order #${po.id.slice(0, 8)}</title>
    <style>
        @page { size: A4; margin: 0; }
        @media print {
            body { -webkit-print-color-adjust: exact; }
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 14px;
            color: #333;
            line-height: 1.5;
            margin: 0;
            padding: 40px; /* A4 Padding */
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .logo-section img {
            max-width: 150px;
            max-height: 80px;
            margin-bottom: 10px;
        }
        .company-info h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1a1a1a;
        }
        .company-info p { margin: 2px 0; font-size: 12px; color: #666; }
        
        .po-title {
            text-align: right;
        }
        .po-title h2 {
            margin: 0;
            font-size: 32px;
            font-weight: 900;
            color: #e5e7eb; /* Light gray for "PURCHASE ORDER" text */
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .po-meta {
            margin-top: 10px;
            text-align: right;
        }
        .po-meta-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 4px;
        }
        .po-meta-label {
            font-weight: 700;
            margin-right: 10px;
            text-transform: uppercase;
            font-size: 11px;
            color: #666;
        }
        .po-meta-value {
            font-weight: 600;
        }

        .addresses {
            display: flex;
            gap: 40px;
            margin-bottom: 40px;
            border-top: 2px solid #f3f4f6;
            border-bottom: 2px solid #f3f4f6;
            padding: 20px 0;
        }
        .address-block { flex: 1; }
        .address-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #9ca3af;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .address-content p { margin: 2px 0; font-weight: 500; }
        .supplier-name { font-size: 16px; font-weight: 800; color: #111; margin-bottom: 4px; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            text-align: left;
            padding: 12px 8px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
        }
        td {
            padding: 12px 8px;
            vertical-align: top;
            border-bottom: 1px solid #f3f4f6;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        
        .totals-section {
            width: 300px;
            margin-left: auto;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .total-row.final {
            border-bottom: none;
            border-top: 2px solid #e5e7eb;
            font-size: 18px;
            font-weight: 800;
            margin-top: 10px;
            padding-top: 15px;
        }
        .label { color: #6b7280; font-weight: 600; font-size: 12px; }

        .footer {
            margin-top: 60px;
            display: flex;
            gap: 40px;
        }
        .signature-box {
            flex: 1;
            border-top: 1px solid #d1d5db;
            padding-top: 10px;
        }
        .signature-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <div class="logo-section">
                ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="Company Logo" />` : ''}
            </div>
            <h1>${businessInfo.name}</h1>
            <p>${businessInfo.address}</p>
            <p>${businessInfo.phone} | ${businessInfo.email}</p>
        </div>
        <div class="po-title">
            <h2>Purchase Order</h2>
            <div class="po-meta">
                <div class="po-meta-row">
                    <span class="po-meta-label">PO Number:</span>
                    <span class="po-meta-value">#${po.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div class="po-meta-row">
                    <span class="po-meta-label">Date:</span>
                    <span class="po-meta-value">${format(poDate, "MMM dd, yyyy")}</span>
                </div>
                <div class="po-meta-row">
                    <span class="po-meta-label">Status:</span>
                    <span class="po-meta-value" style="text-transform: capitalize;">${po.status.replace('_', ' ')}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="addresses">
        <div class="address-block">
            <div class="address-title">Vendor / Supplier</div>
            <div class="address-content">
                <div class="supplier-name">${po.supplier_name}</div>
                <!-- Add more supplier details if available in PO object or joined -->
            </div>
        </div>
        <div class="address-block">
            <div class="address-title">Ship To</div>
            <div class="address-content">
                <div class="supplier-name">${businessInfo.name}</div>
                <p>${businessInfo.address}</p>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 50%;">Item / Description</th>
                <th class="text-center">Quantity</th>
                <th class="text-center">Unit</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${po.items?.map(item => `
                <tr>
                    <td>
                        <div class="font-bold">${item.product_name || 'Unknown Product'}</div>
                    </td>
                    <td class="text-center font-bold">${item.quantity_ordered}</td>
                    <td class="text-center text-sm text-gray-500">${item.unit_name ? item.unit_name : 'Base Unit'}</td>
                    <td class="text-right">${formatCurrency(item.unit_price, systemSettings)}</td>
                    <td class="text-right font-bold">${formatCurrency(item.quantity_ordered * item.unit_price, systemSettings)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals-section">
        <div class="total-row final">
            <span>Total</span>
            <span>${formatCurrency(po.items?.reduce((acc, item) => acc + (item.quantity_ordered * item.unit_price), 0) || 0, systemSettings)}</span>
        </div>
    </div>

    <div class="footer">
        <div class="signature-box">
            <div class="signature-label">Authorized By</div>
        </div>
        <div class="signature-box">
            <div class="signature-label">Date</div>
        </div>
    </div>
</body>
</html>
    `;
};
