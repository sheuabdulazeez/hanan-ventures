import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { toast } from "sonner";
import { profitReportHtml } from "@/lib/utils";

interface PrintProfitReportButtonProps {
  profitData: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  dailyBreakdown: {
    date: string;
    revenue: number;
    cost: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  }[];
  productProfitability: {
    productName: string;
    quantitySold: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  }[];
  periodLabel: string;
  settings: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    email: string;
    website: string;
    logo: string | null;
    receipt_footer: string;
    currency: string;
    currency_symbol: string;
    date_format: string;
    time_format: string;
  };
  disabled?: boolean;
}

export function PrintProfitReportButton({
  profitData,
  dailyBreakdown,
  productProfitability,
  periodLabel,
  settings,
  disabled = false,
}: PrintProfitReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = async () => {
    if (!profitData) {
      toast.error("No profit data available to print");
      return;
    }

    try {
      setIsLoading(true);

      // Transform settings to match the expected format
      const transformedSettings = {
        businessInfo: {
          name: settings.name,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          zipCode: settings.zip_code,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          logo: settings.logo,
        },
        receiptSettings: {
          footerText: settings.receipt_footer,
        },
        systemSettings: {
          currency: settings.currency,
          currencySymbol: settings.currency_symbol,
          dateFormat: settings.date_format,
          timeFormat: settings.time_format,
        },
      };

      // Generate the HTML content
      const htmlContent = profitReportHtml(
        profitData,
        dailyBreakdown,
        productProfitability,
        periodLabel,
        transformedSettings
      );

      // Create a new webview window for printing
      const printWindow = new WebviewWindow("print", {
        url: "/print.html",
        title: "Print Profit Report",
        width: 800,
        height: 600,
        resizable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        visible: false,
      });

      // Wait for the window to be ready
      await printWindow.once("tauri://created", () => {
        console.log("Print window created");
      });
      printWindow.listen("close", () => {
      printWindow.close();
    })
      printWindow.listen("loaded", async () => {
        await printWindow.emit("print-content", {
          html: htmlContent,
        });
        await printWindow.show();
        await printWindow.setFocus();

      });
    } catch (error) {
      console.error("Error printing profit report:", error);
      toast.error("Failed to open print dialog");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      disabled={disabled || isLoading || !profitData}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Printer className="h-4 w-4" />
      {isLoading ? "Preparing..." : "Print Report"}
    </Button>
  );
}
