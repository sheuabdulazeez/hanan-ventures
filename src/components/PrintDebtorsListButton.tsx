import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaPrint } from "react-icons/fa";
import { debtorsListHtml } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { toast } from "@/hooks/use-toast";

import { TDebtor } from "@/types/database";

interface PrintDebtorsListButtonProps {
  debtors: TDebtor[];
}

export const PrintDebtorsListButton = ({
  debtors,
}: PrintDebtorsListButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { businessInfo, receiptSettings, systemSettings } = useAppStore();

  const handlePrint = async () => {
    if (!debtors || debtors.length === 0) {
      toast({
        title: "No Data",
        description: "No debtors data available to print.",
        variant: "destructive",
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

      // Filter and transform debtors data for printing
      const printableDebtors = debtors.map((debtor) => ({
        id: debtor.id,
        customer_name: debtor.customer_name || "Unknown Customer",
        amount_owed: debtor.amount_owed,
        due_date: debtor.due_date,
        is_paid: debtor.is_paid,
        created_at: debtor.created_at,
      }));

      const htmlContent = debtorsListHtml(printableDebtors, settings);

      // Create a new webview window for printing
      const printWindow = new WebviewWindow("print", {
        url: "/print.html",
        title: "Debtors List - Print Preview",
        width: 400,
        height: 600,
        resizable: true,
        center: true,
        visible: true,
      });

      // Wait for the window to load
      await new Promise((resolve) => {
        printWindow.once("tauri://created", resolve);
      });

      printWindow.listen("close", () => {
        printWindow.close();
      });

      printWindow.listen("loaded", async () => {
        await printWindow.emit("print-content", {
          html: htmlContent,
        });
        await printWindow.show();
        await printWindow.setFocus();
        toast({
          title: "Print Preview",
          description: "Debtors list opened in print preview window.",
        });
      });
    } catch (error) {
      console.error("Error printing debtors list:", error);
      toast({
        title: "Print Error",
        description: "Failed to open print preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      disabled={isLoading || !debtors || debtors.length === 0}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition duration-300"
    >
      <FaPrint className="mr-2" />
      {isLoading ? "Preparing..." : "Print Debtors List"}
    </Button>
  );
};
