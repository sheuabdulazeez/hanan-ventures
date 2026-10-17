import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { TProduct } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import StockReportPDF from "@/components/pdf/StockReportPDF";

interface PrintStockReportButtonProps {
  products: TProduct[];
}

export function PrintStockReportButton({ products }: PrintStockReportButtonProps) {
  const { businessInfo, receiptSettings } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = async () => {
    if (!products || products.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No products available to print.",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!receiptSettings.printerPort) {
        toast({ title: "No printer selected", variant: "destructive" });
        return;
      }

      const doc = (
        <StockReportPDF
          products={products}
          businessName={businessInfo.name}
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

      toast({
        title: "Stock report sent to printer",
      });
    } catch (error) {
      console.error("Error printing stock report:", error);
      toast({
        variant: "destructive",
        title: "Print Error",
        description: "Failed to generate stock report.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      disabled={isLoading || !products || products.length === 0}
      variant="outline"
      size="sm"
      className="border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] h-12 px-6 flex items-center gap-2"
    >
      <Printer className="h-4 w-4" />
      {isLoading ? "Generating..." : "Print Stock Report"}
    </Button>
  );
}

export default PrintStockReportButton;
