import * as React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { PurchaseOrder } from "@/database/orders";

interface PurchaseOrderPDFProps {
  po: PurchaseOrder;
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
      paperSize?: "80mm" | "58mm";
      printerName?: string;
    };
  };
}

const styles = StyleSheet.create({
  page: {
    margin: 0,
    padding: "2mm",
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000",
  },
  header: { alignItems: "center", textAlign: "center", marginBottom: 6 },
  logo: { width: 50, height: 50, marginBottom: 4, objectFit: "contain" },
  businessName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  businessInfo: { fontSize: 8, marginTop: 2 },
  title: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 6, textAlign: "center" },
  separator: { borderBottomWidth: 1, borderBottomStyle: "dashed", borderBottomColor: "#000", marginVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 4, borderTopWidth: 1, borderColor: "#000" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f0f0" },
  colItem: { width: "46%", borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 2 },
  colQty: { width: "14%", borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 2, textAlign: "center" },
  colUnit: { width: "12%", borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 2, textAlign: "center" },
  colPrice: { width: "14%", borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 2, textAlign: "right" },
  colTotal: { width: "14%", borderBottomWidth: 1, borderColor: "#000", padding: 2, textAlign: "right" },
  footer: { textAlign: "center", fontSize: 8, marginTop: 8 },
});

export default function PurchaseOrderPDF({ po, settings }: PurchaseOrderPDFProps) {
  const { businessInfo, receiptSettings } = settings;
  const is58mm = receiptSettings?.paperSize === "58mm";
  const width = is58mm ? 164 : 227;
  const itemRowHeight = is58mm ? 26 : 14;
  const baseHeight = (is58mm ? 240 : 240) + (businessInfo?.logo ? 40 : 0);
  const bufferHeight = is58mm ? 20 : 40;
  const finalHeight = baseHeight + (po.items?.length || 0) * itemRowHeight + bufferHeight;
  const total = po.items?.reduce((sum, item) => sum + item.quantity_ordered * item.unit_price, 0) || 0;

  return (
    <Document>
      <Page size={{ width, height: finalHeight }} style={styles.page}>
        <View style={styles.header}>
          {businessInfo?.logo ? <Image src={businessInfo.logo} style={styles.logo} /> : null}
          <Text style={styles.businessName}>{businessInfo?.name || "Business Name"}</Text>
          <Text style={styles.businessInfo}>{businessInfo?.address || ""}</Text>
          {businessInfo?.phone ? <Text style={styles.businessInfo}>Tel: {businessInfo.phone}</Text> : null}
          {businessInfo?.email ? <Text style={styles.businessInfo}>Email: {businessInfo.email}</Text> : null}
        </View>

        <View style={styles.separator} />
        <Text style={styles.title}>PURCHASE ORDER</Text>

        <View style={styles.row}>
          <Text><Text style={styles.label}>PO #:</Text> {po.id?.slice(-8).toUpperCase()}</Text>
          <Text><Text style={styles.label}>Date:</Text> {po.order_date ? format(new Date(po.order_date), "dd/MM/yyyy") : ""}</Text>
        </View>
        <View style={styles.row}>
          <Text><Text style={styles.label}>Supplier:</Text> {po.supplier_name || "-"}</Text>
          <Text><Text style={styles.label}>Status:</Text> {po.status}</Text>
        </View>

        {is58mm ? (
          <View style={{ marginTop: 4 }}>
            {po.items?.map((item, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.product_name || "Item"}</Text>
                <View style={styles.row}>
                  <Text>Qty: {item.quantity_ordered}{item.unit_name ? ` ${item.unit_name}` : ""}</Text>
                  <Text>Total: ₦{(item.quantity_ordered * item.unit_price).toLocaleString()}</Text>
                </View>
                <View style={styles.row}>
                  <Text>Unit: ₦{item.unit_price.toLocaleString()}</Text>
                  <Text />
                </View>
                <View style={styles.separator} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colItem}>Item</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colUnit}>Unit</Text>
              <Text style={styles.colPrice}>Price</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {po.items?.map((item, idx) => (
              <View key={idx} style={{ flexDirection: "row" }}>
                <Text style={styles.colItem}>{item.product_name || "Item"}</Text>
                <Text style={styles.colQty}>{item.quantity_ordered}</Text>
                <Text style={styles.colUnit}>{item.unit_name || item.unit_id || "-"}</Text>
                <Text style={styles.colPrice}>₦{item.unit_price.toLocaleString()}</Text>
                <Text style={styles.colTotal}>₦{(item.quantity_ordered * item.unit_price).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.row, { marginTop: 6 }]}>
          <Text style={styles.label}>Total:</Text>
          <Text style={styles.label}>₦{total.toLocaleString()}</Text>
        </View>

        <View style={styles.footer}>
          <Text>Generated by {businessInfo?.name || "System"}</Text>
        </View>
      </Page>
    </Document>
  );
}
