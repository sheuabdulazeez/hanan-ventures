import { Button } from "@/components/ui/button";
import { TSale, TSaleItem } from "@/types/database";
import { Printer, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { getCustomerDebtSummary } from "@/database/debtors";
import { invoke } from "@tauri-apps/api/core";
import { pdf } from "@react-pdf/renderer";
import ReceiptPDF from "./pdf/ReceiptPDF";
import { toast } from "@/hooks/use-toast";

interface InvoiceModalProps {
  sale: TSale;
  items: TSaleItem[];
  debt?: Boolean
}

export default function PrintInvoiceButton(props: InvoiceModalProps) {
  const { sale, items } = props;
  const { businessInfo, receiptSettings, systemSettings } = useAppStore();
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!receiptSettings.printerPort) {
      toast({ title: "No printer selected", variant: "destructive" });
      return;
    }

    setIsPrinting(true);
    let customerDebt = undefined;

    // Fetch customer debt information if it's not a walk-in customer
    if (sale.customer_id && sale.customer_id !== 'WALK-IN' && props.debt) {
      try {
        customerDebt = await getCustomerDebtSummary(sale.customer_id, sale.id);
      } catch (error) {
        console.error('Failed to load customer debt:', error);
      }
    }

    try {
      const doc = (
        <ReceiptPDF
          sale={sale}
          items={items}
          settings={{
            businessInfo,
            receiptSettings,
            systemSettings,
          }}
          customerDebt={customerDebt || undefined}
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

      await invoke('print_pdf', {
        printerPort: receiptSettings.printerPort,
        pdfBytes: bytes,
        paperWidth: receiptSettings.paperSize === '58mm' ? 58 : 80,
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
  }

  return (
    <Button
      className="flex items-center justify-center gap-2"
      onClick={handlePrint}
      title="Print Receipt"
      disabled={isPrinting}
    >
      {isPrinting ? <Loader2 className="animate-spin" size={24} /> : <Printer size={24} />}
      Print Receipt
    </Button>
  )
}
