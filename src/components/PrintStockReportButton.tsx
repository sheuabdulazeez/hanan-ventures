import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaPrint } from "react-icons/fa";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { stockInventoryHtml } from "@/lib/utils";
import { TProduct } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";

interface PrintStockReportButtonProps {
  products: TProduct[];
}

export function PrintStockReportButton({ products }: PrintStockReportButtonProps) {
  const { businessInfo, receiptSettings, systemSettings } = useAppStore();
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
      const settings = {
        businessInfo,
        receiptSettings,
        systemSettings,
      };

      // Generate HTML content
      const htmlContent = stockInventoryHtml(products, settings);

      // Create a new webview window for printing
      const printWindow = new WebviewWindow('print', {
        url: '/print.html',
        title: 'Stock Inventory Report',
        width: 800,
        height: 600,
        resizable: true,
        visible: false,
      });

      // Wait for the webview to load
      await printWindow.once('tauri://created', () => {
        console.log('Print window created');
      });
      printWindow.listen("loaded", async () => {
      await printWindow.emit("print-content", {
        html: htmlContent,
      });
      await printWindow.show();
      await printWindow.setFocus();
      toast({
        title: 'Stock report sent to printer',
      });
    })

    } catch (error) {
      console.error('Error printing stock report:', error);
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
      className="flex items-center gap-2"
    >
      <FaPrint className="h-4 w-4" />
      {isLoading ? 'Generating...' : 'Print Stock Report'}
    </Button>
  );
}

export default PrintStockReportButton;