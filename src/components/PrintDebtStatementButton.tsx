import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { customerDebtStatementHtml } from '@/lib/utils';
import { toast } from "@/hooks/use-toast";
import { useAppStore } from '@/lib/store';

interface PrintDebtStatementButtonProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  debtHistory: any[];
  className?: string;
}

export function PrintDebtStatementButton({
  customer,
  debtHistory,
  className
}: PrintDebtStatementButtonProps) {
  const { businessInfo, receiptSettings, systemSettings } = useAppStore()
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = async () => {
    if (!customer || !debtHistory) {
      toast({
        variant: "destructive",
        title: 'Customer or debt history data is missing'
      });
      return;
    }

    if (debtHistory.length === 0) {
      toast({
        variant: "destructive",
        title: 'No debt history found for this customer'
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

      // Generate the debt statement HTML
      const htmlContent = customerDebtStatementHtml(customer, debtHistory, settings);

      // Create a new webview window for printing
      const printWindow = new WebviewWindow('print', {
        url: '/print.html',
        title: `Debt Statement - ${customer.name}`,
        width: 800,
        height: 600,
        resizable: true,
        visible: true,
      });

      // Wait for the window to load
      await new Promise((resolve) => {
        printWindow.once('tauri://created', resolve);
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
      toast({
        title: 'Debt statement sent to printer'
      });
    })
      
    } catch (error) {
      console.error('Error printing debt statement:', error);
      toast({
        variant: "destructive",
        title: 'Failed to print debt statement'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      disabled={isLoading || !customer || debtHistory.length === 0}
      className={className}
      variant="outline"
      size="sm"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Printer className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Printing...' : 'Print Statement'}
    </Button>
  );
}