import * as React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { TSale } from "@/types/database";
import { useAppStore } from "@/lib/store";

interface SalesReportPDFProps {
  sales: TSale[];
  title?: string;
  businessName?: string;
  totals?: { cash: number; pos: number; transfer: number; total: number };
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111",
  },
  header: { marginBottom: 12 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, color: "#555", marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 6,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  colDate: { width: "16%" },
  colRef: { width: "16%" },
  colCustomer: { width: "22%" },
  colCashier: { width: "16%" },
  colAmount: { width: "15%", textAlign: "right" },
  colMethods: { width: "15%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  bold: { fontFamily: "Helvetica-Bold" },
});

export default function SalesReportPDF({ sales, title, businessName, totals }: SalesReportPDFProps) {
  const { currencySymbol } = useAppStore((state) => state.systemSettings);
  const totalAmount = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const paymentTotals = {
    cash: 0,
    pos: 0,
    transfer: 0,
    total: 0,
    ...(totals || {}),
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title || "Sales Report"}</Text>
          <Text style={styles.subtitle}>
            {businessName ? `${businessName} • ` : ""}{format(new Date(), "PPP")}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colDate, styles.bold]}>Date</Text>
          <Text style={[styles.colRef, styles.bold]}>Ref</Text>
          <Text style={[styles.colCustomer, styles.bold]}>Customer</Text>
          <Text style={[styles.colCashier, styles.bold]}>Cashier</Text>
          <Text style={[styles.colAmount, styles.bold]}>Amount</Text>
          <Text style={[styles.colMethods, styles.bold]}>Methods</Text>
        </View>

        {sales.map((sale) => {
          const payments = sale.payments || [];
          const methods = payments.map((p) => p.payment_method).join(", ");
          return (
            <View key={sale.id} style={styles.row}>
              <Text style={styles.colDate}>{format(new Date(sale.created_at), "yyyy-MM-dd")}</Text>
              <Text style={styles.colRef}>{sale.id.slice(-8).toUpperCase()}</Text>
              <Text style={styles.colCustomer}>{sale.customer_name || "Guest"}</Text>
              <Text style={styles.colCashier}>{sale.employee_name || "-"}</Text>
              <Text style={styles.colAmount}>{currencySymbol}{sale.total_amount.toLocaleString()}</Text>
              <Text style={styles.colMethods}>{methods || "-"}</Text>
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={[styles.colDate, styles.bold]}>Total</Text>
          <Text style={styles.colRef}></Text>
          <Text style={styles.colCustomer}></Text>
          <Text style={styles.colCashier}></Text>
          <Text style={[styles.colAmount, styles.bold]}>₦{totalAmount.toLocaleString()}</Text>
          <Text style={styles.colMethods}></Text>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={[styles.bold, { marginBottom: 4 }]}>Payment Totals</Text>
          <View style={styles.row}>
            <Text>Cash</Text>
            <Text>₦{paymentTotals.cash.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text>POS</Text>
            <Text>₦{paymentTotals.pos.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text>Transfer</Text>
            <Text>₦{paymentTotals.transfer.toLocaleString()}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: "#111", paddingTop: 4 }]}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>₦{paymentTotals.total.toLocaleString()}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
