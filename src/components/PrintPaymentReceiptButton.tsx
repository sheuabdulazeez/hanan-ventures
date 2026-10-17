import { Button } from "@/components/ui/button";
import { TDebtor } from "@/types/database";
import { Printer, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import PaymentReceiptPDF from "./pdf/PaymentReceiptPDF";
import { toast } from "@/hooks/use-toast";

interface PaymentReceiptProps {
  debtor: TDebtor;
  payment: {
    amount: number;
    method: "cash" | "transfer" | "pos";
    bankName?: string;
    employeeName: string;
  };
}

export default function PrintPaymentReceiptButton(props: PaymentReceiptProps) {
  const { debtor, payment } = props;
  const { businessInfo, receiptSettings, systemSettings } = useAppStore();
  const [isPrinting, setIsPrinting] = useState(false);

  const onClick = async () => {
    if (!receiptSettings.printerPort) {
      toast({ title: "No printer selected", variant: "destructive" });
      return;
    }

    setIsPrinting(true);
    try {
      const doc = (
        <PaymentReceiptPDF
          debtor={debtor}
          payment={payment}
          settings={{
            businessInfo,
            receiptSettings,
            systemSettings: { currencySymbol: systemSettings.currencySymbol || "₦" },
          }}
        />
      );

      const blob = await pdf(doc).toBlob();
      const buffer = await blob.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      const printOptions =
        receiptSettings.printTransport === "serial"
          ? {
              transport: "serial" as const,
              serialConfig: {
                baud_rate: receiptSettings.serialBaudRate,
                timeout_ms: receiptSettings.serialTimeoutMs,
                chunk_size: receiptSettings.serialChunkSize,
                chunk_delay_ms: receiptSettings.serialChunkDelayMs,
                parity: receiptSettings.serialParity,
                stop_bits: receiptSettings.serialStopBits,
                data_bits: receiptSettings.serialDataBits,
                flow_control: receiptSettings.serialFlowControl,
              },
            }
          : {
              transport: "spooler" as const,
              serialConfig: undefined,
            };

      await invoke("print_pdf", {
        printerPort: receiptSettings.printerPort,
        pdfBytes: bytes,
        paperWidth: receiptSettings.paperSize === "58mm" ? 58 : 80,
        transport: printOptions.transport,
        serialConfig: printOptions.serialConfig,
      });

      toast({ title: "Receipt sent to printer" });
    } catch (error) {
      console.error(error);
      toast({ title: "Print failed", description: String(error), variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      className="flex items-center justify-center bg-green-600 hover:bg-green-700"
      onClick={onClick}
      title="Print Payment Receipt"
      disabled={isPrinting}
    >
      {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
      Print Receipt
    </Button>
  );
}
