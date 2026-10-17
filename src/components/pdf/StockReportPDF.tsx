import * as React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { TProduct } from "@/types/database";
import { useAppStore } from "@/lib/store";

interface StockReportPDFProps {
  products: TProduct[];
  businessName?: string;
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
  colName: { width: "34%" },
  colCategory: { width: "20%" },
  colQty: { width: "12%", textAlign: "right" },
  colCost: { width: "17%", textAlign: "right" },
  colPrice: { width: "17%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
});

export default function StockReportPDF({ products, businessName }: StockReportPDFProps) {
  const { currencySymbol } = useAppStore((state) => state.systemSettings);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Stock Inventory Report</Text>
          <Text style={styles.subtitle}>
            {businessName ? `${businessName} • ` : ""}{format(new Date(), "PPP")}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colName, styles.bold]}>Product</Text>
          <Text style={[styles.colCategory, styles.bold]}>Category</Text>
          <Text style={[styles.colQty, styles.bold]}>Qty</Text>
          <Text style={[styles.colCost, styles.bold]}>Cost</Text>
          <Text style={[styles.colPrice, styles.bold]}>Price</Text>
        </View>

        {products.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.colName}>{p.name}</Text>
            <Text style={styles.colCategory}>{p.category || "-"}</Text>
            <Text style={styles.colQty}>{p.quantity_on_hand}</Text>
            <Text style={styles.colCost}>{currencySymbol}{p.cost_price.toLocaleString()}</Text>
            <Text style={styles.colPrice}>{currencySymbol}{p.selling_price.toLocaleString()}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
