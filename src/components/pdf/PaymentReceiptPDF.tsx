import * as React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { TDebtor } from "@/types/database";

interface PaymentReceiptPDFProps {
  debtor: TDebtor;
  payment: {
    amount: number;
    method: "cash" | "transfer" | "pos";
    bankName?: string;
    employeeName: string;
  };
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
      currencySymbol: string;
    };
  };
}

const styles = StyleSheet.create({
  page: {
    margin: 0,
    padding: "2mm",
    fontFamily: "Helvetica",
    fontSize: 9,
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
  amountBox: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    textAlign: "center",
    marginVertical: 8,
  },
  amountText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  footer: { textAlign: "center", fontSize: 8, marginTop: 8 },
  signature: { marginTop: 10, textAlign: "center", fontSize: 8 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#000", width: 160, alignSelf: "center", marginVertical: 8 },
});

export default function PaymentReceiptPDF({ debtor, payment, settings }: PaymentReceiptPDFProps) {
  const { businessInfo, receiptSettings, systemSettings } = settings;
  const width = receiptSettings?.paperSize === "58mm" ? 164 : 227;
  const baseHeight = 260 + (businessInfo?.logo ? 40 : 0);
  const finalHeight = baseHeight;

  const currentDate = new Date();
  const previousBalance = debtor.amount_owed + payment.amount;
  const newBalance = debtor.amount_owed;

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
        <Text style={styles.title}>PAYMENT RECEIPT</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text>{format(currentDate, "dd/MM/yyyy HH:mm")}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Customer:</Text>
          <Text>{debtor.customer_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Customer ID:</Text>
          <Text>{debtor.customer_id?.substring(0, 8)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Method:</Text>
          <Text>{payment.method.toUpperCase()}</Text>
        </View>
        {payment.bankName && payment.method !== "cash" ? (
          <View style={styles.row}>
            <Text style={styles.label}>Bank:</Text>
            <Text>{payment.bankName}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.label}>Cashier:</Text>
          <Text>{payment.employeeName}</Text>
        </View>

        <View style={styles.amountBox}>
          <Text>AMOUNT PAID</Text>
          <Text style={styles.amountText}>
            {systemSettings.currencySymbol} {payment.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Previous Balance:</Text>
          <Text>{systemSettings.currencySymbol} {previousBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment:</Text>
          <Text>{systemSettings.currencySymbol} {payment.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: "#000", paddingTop: 4 }]}>
          <Text style={styles.label}>New Balance:</Text>
          <Text>{systemSettings.currencySymbol} {newBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text>Customer Signature</Text>
        </View>

        <View style={styles.footer}>
          <Text>{receiptSettings?.footerText || "Thank you for your payment!"}</Text>
          <Text>Printed on: {format(currentDate, "dd/MM/yyyy HH:mm:ss")}</Text>
        </View>
      </Page>
    </Document>
  );
}
