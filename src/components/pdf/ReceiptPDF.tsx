import * as React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { TSale, TSaleItem } from "@/types/database";

// Translation of your CSS to React PDF Styles
const styles = StyleSheet.create({
  page: {
    margin: 0,
    paddingTop: "1mm",
    paddingLeft: "1mm",
    paddingRight: "1mm",
    paddingBottom: "1mm",
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica", // Tahoma isn't built-in, Helvetica is the closest standard
    color: "#000",
  },
  // Header Styles
  headerSection: { alignItems: "center", marginBottom: 6, textAlign: "center" },
  logo: { width: 60, height: 60, marginBottom: 5, objectFit: "contain" },
  businessName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    flexWrap: "wrap",
    overflowWrap: "break-word"
  },
  businessInfo: { fontSize: 9, textAlign: "center", marginTop: 2 },

  // Dividers
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "dashed",
    marginVertical: 4,
  },
  separatorSolid: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    marginVertical: 4,
  },

  // Transaction Info
  transactionInfo: { fontSize: 8, marginVertical: 4 },
  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  // Table Simulation
  table: { marginTop: 5, borderTopWidth: 1,  borderColor: '#000' },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
  },
  tableRow: {
    flexDirection: "row",
  },

  // Column Widths (matching your HTML %)
  qtyCol: { 
    width: "17%", 
    textAlign: "center", 
    fontSize: 8, 
    borderRightWidth: 1, 
    borderBottomWidth: 1, 
    borderColor: '#000', 
    padding: 1,
    paddingVertical:2
  },
  itemCol: { 
    width: "40%", 
    textAlign: "left", 
    fontSize: 8, 
    borderRightWidth: 1, 
    borderBottomWidth: 1, 
    borderColor: '#000', 
    padding: 1,
    paddingVertical:2
  },
  priceCol: { 
    width: "20%", 
    textAlign: "right", 
    fontSize: 8, 
    borderRightWidth: 1, 
    borderBottomWidth: 1, 
    borderColor: '#000', 
    padding: 1,
    paddingVertical:2
  },
  totalCol: {
    width: "23%",
    textAlign: "right",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1, 
    borderColor: '#000', 
    padding: 1,
    paddingVertical:2
  },

  // Totals
  totalsSection: { marginTop: 6 },
  finalTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f0f0f0",
    padding: 5,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#000",
  },
  outstanding: {
    backgroundColor: "#e0e0e0",
    padding: 5,
    borderWeight: 1,
    marginTop: 4,
  },

  // Helpers
  bold: { fontFamily: "Helvetica-Bold" },
  extraBold: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  footer: {
    textAlign: "center",
    fontSize: 8,
    marginTop: 10,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopStyle: "dashed",
  },
  cutLine: { textAlign: "center", fontSize: 8, marginTop: 10, color: "#333" },
});

interface ReceiptPDFProps {
  sale: Omit<TSale, "updated_at" | "sale_date" | "customer_id">;
  items: Pick<
    TSaleItem,
    "product_name" | "quantity" | "unit_price" | "total_price" | "unit_abbrev"
  >[];
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
      paperSize?: "80mm" | "58mm";
      printerName?: string;
    };
    systemSettings: {
      currency: string;
      currencySymbol: string;
      dateFormat: string;
      timeFormat: string;
    };
  };
  customerDebt?: {
    previousBalance: number;
    currentBalance: number;
    totalBalance: number;
  };
}

const MOCK_SALE: ReceiptPDFProps["sale"] = {
  id: "SALE-12345678",
  created_at: new Date().toISOString(),
  total_amount: 15000,
  discount: 0,
  employee_id: "EMP001",
  employee_name: "John Doe",
  payments: [
    {
      amount: 15000,
      payment_method: "cash",
      reference_number: "PAY001",
      bank_name: "",
    },
  ],
};

const MOCK_ITEMS: ReceiptPDFProps["items"] = [
  {
    product_name: "Test Product A",
    quantity: 2,
    unit_price: 2500,
    total_price: 5000,
    unit_abbrev: "pk",
  },
  {
    product_name: "Test Product B",
    quantity: 1,
    unit_price: 10000,
    total_price: 10000,
    unit_abbrev: "pcs",
  },
];

const MOCK_SETTINGS: ReceiptPDFProps["settings"] = {
  businessInfo: {
    name: "Hanan Ventures",
    address: "123 Business St",
    city: "Lagos",
    state: "LA",
    zipCode: "100001",
    phone: "08012345678",
    email: "info@hananventures.com",
    website: "www.hananventures.com",
    logo: null,
  },
  receiptSettings: {
    footerText: "Thank you for your patronage!",
    paperSize: "80mm",
  },
  systemSettings: {
    currency: "NGN",
    currencySymbol: "N",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
  },
};

const ReceiptPDF = ({
  sale = MOCK_SALE,
  items = MOCK_ITEMS,
  settings = MOCK_SETTINGS,
  customerDebt,
}: Partial<ReceiptPDFProps>) => {
  const { businessInfo, receiptSettings, systemSettings } = settings;

  // Calculations
  const amountPaid =
    sale.payments?.reduce((acc, payment) => acc + payment.amount, 0) || 0;
  const shortInvoiceId = sale.id?.slice(-8).toUpperCase() || "XXXX";
  const totalAfterDiscount = (sale.total_amount || 0) - (sale.discount || 0);
  const change = Math.max(0, amountPaid - totalAfterDiscount);
  const outstanding = Math.max(0, totalAfterDiscount - amountPaid);

  const width = receiptSettings?.paperSize === "58mm" ? 164 : 227;

  // Dynamic height calculation (in points). Keep it tight but avoid multi-page receipts.
  const logoHeight = businessInfo?.logo ? 60 : 0;
  const outstandingHeight = outstanding > 0 ? 22 : 0;
  const changeHeight = change > 0 ? 18 : 0;
  const debtHeight = customerDebt ? 44 : 0;
  const footerHeight = 60; // footer text + cut line + contact line
  const baseHeight = 270 + logoHeight + outstandingHeight + changeHeight + debtHeight + footerHeight;

  const charsPerLine = receiptSettings?.paperSize === "58mm" ? 20 : 28;
  const itemHeights = (items || []).map((item) => {
    const nameLength = item.product_name ? item.product_name.length : 0;
    const lines = Math.max(1, Math.ceil(nameLength / charsPerLine));
    return 15 + (lines - 1) * 10;
  });
  const itemsHeight = itemHeights.reduce((sum, h) => sum + h, 0);

  const finalHeight = baseHeight + itemsHeight;

  return (
    <Document>
      <Page
        size={{ width: width as number, height: finalHeight }}
        style={styles.page}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          {businessInfo?.logo && (
            <Image src={businessInfo.logo} style={styles.logo} />
          )}
          <Text style={styles.businessName}>
            {businessInfo?.name || "Business Name"}
          </Text>
          <Text style={styles.businessInfo}>
            {businessInfo.address ? `${businessInfo.address}` : ""}
            {businessInfo.city || businessInfo.state
              ? `${[businessInfo.city, businessInfo.state].filter(Boolean).join(", ")}`
              : ""}
          </Text>
          {businessInfo?.phone? <Text style={styles.businessInfo}>
            {businessInfo?.phone}
          </Text>:""}
          {businessInfo?.email? <Text style={styles.businessInfo}>
            {businessInfo?.email}
          </Text>:""}
        </View>

        <View style={styles.separator} />

        {/* Transaction Info */}
        <View style={styles.transactionInfo}>
          <View style={styles.flexRow}>
            <Text>
              Invoice: <Text style={styles.bold}>{shortInvoiceId}</Text>
            </Text>
            <Text>Cashier: {sale.employee_name || "Admin"}</Text>
          </View>
          <View style={styles.flexRow}>
            <Text>
              Date:{" "}
              {sale.created_at
                ? new Date(sale.created_at).toLocaleDateString()
                : new Date().toLocaleDateString()}
            </Text>
            <Text>
              Time:{" "}
              {sale.created_at
                ? new Date(sale.created_at).toLocaleTimeString()
                : new Date().toLocaleTimeString()}
            </Text>
            
          </View>
          <Text>Customer: {sale.customer_name || "Walk-in"}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.qtyCol, styles.bold]}>Qty</Text>
            <Text style={[styles.itemCol, styles.bold]}>Item</Text>
            <Text style={[styles.priceCol, styles.bold]}>Price</Text>
            <Text style={[styles.totalCol, styles.bold]}>Total</Text>
          </View>
          {items?.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.qtyCol}>
                {item.quantity}
                {item.unit_abbrev ? `${item.unit_abbrev}` : ""}
              </Text>
              <Text style={styles.itemCol}>{item.product_name}</Text>
              <Text style={styles.priceCol}>{item.unit_price.toLocaleString()}</Text>
              <Text style={styles.totalCol}>
                {item.total_price.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.finalTotal}>
            <Text style={styles.extraBold}>TOTAL:</Text>
            <Text style={styles.extraBold}>
              {systemSettings?.currencySymbol}
              {totalAfterDiscount.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment Detail */}
        <View style={[styles.flexRow, { fontSize: 10 }]}>
          <Text style={styles.bold}>Amount Paid:</Text>
          <Text>
            {systemSettings?.currencySymbol}
            {amountPaid.toLocaleString()}
          </Text>
        </View>

        {change > 0 && (
          <View style={[styles.flexRow, styles.outstanding, { fontSize: 10 }]}>
            <Text style={styles.bold}>CHANGE:</Text>
            <Text>
              {systemSettings?.currencySymbol}
              {change.toLocaleString()}
            </Text>
          </View>
        )}

        {outstanding > 0 && (
          <View style={[styles.flexRow, styles.outstanding, { fontSize: 10 }]}>
            <Text style={styles.bold}>OUTSTANDING:</Text>
            <Text>
              {systemSettings?.currencySymbol}
              {outstanding.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Customer Debt Section */}
        {customerDebt && sale.customer_name && sale.customer_name !== 'Walk-in Customer' && (
          <>
            <View style={styles.separator} />
            <View style={styles.totalsSection}>
              <View style={[styles.flexRow, { fontSize: 10 }]}>
                <Text style={styles.bold}>Previous Balance:</Text>
                <Text>{systemSettings?.currencySymbol}{customerDebt.previousBalance.toLocaleString()}</Text>
              </View>
              <View style={[styles.flexRow, { fontSize: 10 }]}>
                <Text style={styles.bold}>Current Balance:</Text>
                <Text>{systemSettings?.currencySymbol}{customerDebt.currentBalance.toLocaleString()}</Text>
              </View>
              <View style={[styles.flexRow, styles.outstanding, { fontSize: 10 }]}>
                <Text style={styles.extraBold}>Total Balance:</Text>
                <Text style={styles.extraBold}>{systemSettings?.currencySymbol}{customerDebt.totalBalance.toLocaleString()}</Text>
              </View>
            </View>
          </>
        )}


        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {receiptSettings?.footerText || "Thank you for your business!"}
          </Text>
        </View>
        <Text style={styles.cutLine}>✂ ============================= ✂</Text>
        <Text style={{fontSize: 7, marginTop: 2, textAlign: "center"}}>Contact +2347040861356 if you need receipt like this.</Text>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
