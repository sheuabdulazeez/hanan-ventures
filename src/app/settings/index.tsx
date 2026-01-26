import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Upload,
  Receipt,
  Settings,
  Save,
  Eye,
  X,
  FileText,
  CreditCard,
  Palette,
  Globe,
  Mail,
  Phone,
  EyeOff,
  Database,
  Printer,
} from "lucide-react";
import { BaseDirectory, open, remove } from "@tauri-apps/plugin-fs";
import { getAdminSettings, updateAdminSetting } from "@/database/settings";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import DatabaseSettingsTab from "./DatabaseSettings";
import { PDFDownloadLink, PDFViewer, pdf } from "@react-pdf/renderer";
import ReceiptPDF from "@/components/pdf/ReceiptPDF";

interface BusinessSettings {
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  logo: string | null;
}

interface PrinterInfo {
  name: string;
  port: string;
  printer_type: string;
  description: string;
}

interface ReceiptSettings {
  footerText: string;
  paperSize: "80mm" | "58mm";
  printerPort: string;
  printerName?: string;
}

interface SystemSettings {
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeFormat: string;
}

export default function SettingsPage() {
  const { reloadStore } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("business");
  const [showPreview, setShowPreview] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  // Business Settings State
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    logo: null,
  });

  // Receipt Settings State
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    footerText: "",
    paperSize: "80mm",
    printerPort: "",
    printerName: "",
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    currency: "",
    currencySymbol: "",
    dateFormat: "",
    timeFormat: "",
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const { user } = useAppStore.getState().auth;
    if (user?.role !== ("super_admin" as any)) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only Super Admins can access system configuration.",
      });
      window.location.href = "/dashboard";
      return;
    }

    const loadSettings = async () => {
      try {
        const settings = await getAdminSettings();
        setBusinessSettings({
          businessName: settings.name,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          zipCode: settings.zip_code,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          logo: settings.logo,
        });
        setReceiptSettings({
          footerText: settings.receipt_footer,
          paperSize: (settings.printer_paper_size as "80mm" | "58mm") || "80mm",
          printerPort: settings.printer_port || "",
          printerName: settings.printer_name || "",
        });
        setSystemSettings({
          currency: settings.currency,
          currencySymbol: settings.currency_symbol,
          dateFormat: settings.date_format,
          timeFormat: settings.time_format,
        });
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    invoke<PrinterInfo[]>("get_printers")
      .then(setPrinters)
      .catch((err) => console.error("Failed to load printers:", err));
  }, []);

  const handleTestPrint = async () => {
    if (!receiptSettings.printerPort) {
      toast({ title: "No printer selected", variant: "destructive" });
      return;
    }
    setIsTestingPrint(true);
    try {
      await invoke("test_print", { printerPort: receiptSettings.printerPort });
      toast({ title: "Test print sent" });
    } catch (error) {
      toast({
        title: "Print failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsTestingPrint(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!receiptSettings.printerPort) {
      toast({ title: "No printer selected", variant: "destructive" });
      return;
    }

    setIsTestingPrint(true);
    try {
      const doc = (
        <ReceiptPDF
          settings={{
            businessInfo: {
              name: businessSettings.businessName,
              address: businessSettings.address,
              city: businessSettings.city,
              state: businessSettings.state,
              zipCode: businessSettings.zipCode,
              phone: businessSettings.phone,
              email: businessSettings.email,
              website: businessSettings.website,
              logo: businessSettings.logo,
            },
            receiptSettings: {
              footerText: receiptSettings.footerText,
              paperSize: receiptSettings.paperSize,
              printerName: receiptSettings.printerName,
            },
            systemSettings: {
              currency: systemSettings.currency,
              currencySymbol: systemSettings.currencySymbol,
              dateFormat: systemSettings.dateFormat,
              timeFormat: systemSettings.timeFormat,
            },
          }}
        />
      );

      const blob = await pdf(doc).toBlob();
      const buffer = await blob.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));

      await invoke("print_pdf", {
        printerPort: receiptSettings.printerPort,
        pdfBytes: bytes,
        paperWidth: receiptSettings.paperSize === "58mm" ? 58 : 80,
      });

      toast({ title: "PDF sent to printer" });
    } catch (error) {
      console.error(error);
      toast({
        title: "PDF Print failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsTestingPrint(false);
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const logoFile = await open("logo.png", {
        baseDir: BaseDirectory.AppData,
        write: true,
        create: true,
        truncate: true,
      });
      await logoFile.write(new Uint8Array(await file.arrayBuffer()));
      await logoFile.close();

      const reader = new FileReader();
      reader.onload = async (e) => {
        setBusinessSettings((prev) => ({
          ...prev,
          logo: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = async () => {
    try {
      await remove("logo.png", { baseDir: BaseDirectory.AppData });
      setBusinessSettings((prev) => ({
        ...prev,
        logo: null,
      }));
    } catch (error) {}
  };

  const saveSettings = async () => {
    try {
      await updateAdminSetting({
        name: businessSettings.businessName,
        address: businessSettings.address,
        city: businessSettings.city,
        state: businessSettings.state,
        zip_code: businessSettings.zipCode,
        phone: businessSettings.phone,
        email: businessSettings.email,
        website: businessSettings.website,
        receipt_footer: receiptSettings.footerText,
        printer_paper_size: receiptSettings.paperSize,
        printer_port: receiptSettings.printerPort,
        printer_name: receiptSettings.printerName || "",
        currency: systemSettings.currency,
        currency_symbol: systemSettings.currencySymbol,
        date_format: systemSettings.dateFormat,
        time_format: systemSettings.timeFormat,
        logo: businessSettings.logo || "",
      });
      reloadStore();
      toast({
        title: "Configuration Saved",
        description: "Operational parameters synchronized.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Sync Fault",
        description: "Failed to persist configuration changes.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50 pb-12"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">
                System Configuration
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">
                Fine-tune your point of sale environment
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="h-12 px-6 rounded-2xl border-slate-200 bg-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-50"
              >
                {showPreview ? (
                  <EyeOff className="w-4 h-4 mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
              <Button
                onClick={saveSettings}
                className="h-12 px-8 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 shadow-lg shadow-slate-200"
              >
                <Save className="w-4 h-4 mr-2" />
                Persist Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div
            className={`${showPreview ? "lg:col-span-8" : "lg:col-span-12"} transition-all duration-300`}
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl h-14 w-full flex items-center justify-start overflow-x-auto gap-2 no-scrollbar">
                {[
                  { id: "business", label: "Business", icon: Building2 },
                  { id: "receipt", label: "Receipt", icon: Receipt },
                  { id: "database", label: "Database", icon: Database },
                  {
                    id: "system",
                    label: "System",
                    icon: Settings,
                    disabled: true,
                  },
                  {
                    id: "payment",
                    label: "Payment",
                    icon: CreditCard,
                    disabled: true,
                  },
                  {
                    id: "interface",
                    label: "Interface",
                    icon: Palette,
                    disabled: true,
                  },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    disabled={tab.disabled}
                    className="flex-1 min-w-[120px] rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-slate-900 data-[state=active]:text-white h-11"
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "business" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-white border-slate-200 shadow-sm">
                          <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">
                              Primary Identity
                            </CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">
                              Main business details
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Business Name
                              </Label>
                              <Input
                                value={businessSettings.businessName}
                                onChange={(e) =>
                                  setBusinessSettings((prev) => ({
                                    ...prev,
                                    businessName: e.target.value,
                                  }))
                                }
                                className="h-11 bg-slate-50 border-slate-200 font-bold focus:bg-white transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Street Address
                              </Label>
                              <Input
                                value={businessSettings.address}
                                onChange={(e) =>
                                  setBusinessSettings((prev) => ({
                                    ...prev,
                                    address: e.target.value,
                                  }))
                                }
                                className="h-11 bg-slate-50 border-slate-200 font-medium focus:bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  City
                                </Label>
                                <Input
                                  value={businessSettings.city}
                                  onChange={(e) =>
                                    setBusinessSettings((prev) => ({
                                      ...prev,
                                      city: e.target.value,
                                    }))
                                  }
                                  className="h-11 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  State / Province
                                </Label>
                                <Input
                                  value={businessSettings.state}
                                  onChange={(e) =>
                                    setBusinessSettings((prev) => ({
                                      ...prev,
                                      state: e.target.value,
                                    }))
                                  }
                                  className="h-11 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  Postal Code
                                </Label>
                                <Input
                                  value={businessSettings.zipCode}
                                  onChange={(e) =>
                                    setBusinessSettings((prev) => ({
                                      ...prev,
                                      zipCode: e.target.value,
                                    }))
                                  }
                                  className="h-11 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm">
                          <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">
                              Communications
                            </CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">
                              Contact and web presence
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Support Email
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  type="email"
                                  value={businessSettings.email}
                                  onChange={(e) =>
                                    setBusinessSettings((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  className="h-11 pl-10 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Business Phone
                              </Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  value={businessSettings.phone}
                                  onChange={(e) =>
                                    setBusinessSettings((prev) => ({
                                      ...prev,
                                      phone: e.target.value,
                                    }))
                                  }
                                  className="h-11 pl-10 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Web URL
                              </Label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  value={businessSettings.website}
                                  onChange={(e) =>
                                    setBusinessSettings((prev) => ({
                                      ...prev,
                                      website: e.target.value,
                                    }))
                                  }
                                  className="h-11 pl-10 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm md:col-span-2 overflow-hidden">
                          <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">
                              Brand Assets
                            </CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">
                              Business logo and iconography
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                              <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-slate-900">
                                  {businessSettings.logo ? (
                                    <img
                                      src={businessSettings.logo}
                                      alt="Logo"
                                      className="w-full h-full object-contain p-4"
                                    />
                                  ) : (
                                    <Upload className="w-8 h-8 text-slate-300" />
                                  )}
                                </div>
                                {businessSettings.logo && (
                                  <button
                                    onClick={removeLogo}
                                    className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <div className="flex-1 space-y-4 text-center md:text-left">
                                <div>
                                  <h4 className="text-sm font-black text-slate-900">
                                    Official Identity Mark
                                  </h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    PNG or JPG • Transparent background
                                    recommended
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      fileInputRef.current?.click()
                                    }
                                    className="h-10 px-6 rounded-xl border-slate-200 font-black uppercase tracking-widest text-[9px]"
                                  >
                                    Upload New Asset
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {activeTab === "receipt" && (
                    <Card className="bg-white border-slate-200 shadow-sm">
                      <CardHeader className="p-6 border-b border-slate-50">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">
                          Transaction Output
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400">
                          Customize physical and digital receipts
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Default Printer
                          </Label>
                          <div className="flex gap-2">
                            <Select
                              value={receiptSettings.printerPort}
                              onValueChange={(val) => {
                                const selectedPrinter = printers.find(
                                  (p) => p.port === val,
                                );
                                setReceiptSettings((prev) => ({
                                  ...prev,
                                  printerPort: val,
                                  printerName: selectedPrinter?.name || "",
                                }));
                              }}
                            >
                              <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-medium focus:bg-white transition-colors flex-1">
                                <SelectValue placeholder="Select a printer" />
                              </SelectTrigger>
                              <SelectContent>
                                {printers.map((printer) => (
                                  <SelectItem
                                    key={printer.port}
                                    value={printer.port}
                                  >
                                    {printer.name} ({printer.description})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={handleTestPrint}
                              disabled={
                                !receiptSettings.printerPort || isTestingPrint
                              }
                              className="h-11 px-4 rounded-lg border-slate-200"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              {isTestingPrint ? "Testing..." : "Test"}
                            </Button>

                            <PDFDownloadLink
                              document={
                                <ReceiptPDF
                                  settings={{
                                    businessInfo: {
                                      name: businessSettings.businessName,
                                      address: businessSettings.address,
                                      city: businessSettings.city,
                                      state: businessSettings.state,
                                      zipCode: businessSettings.zipCode,
                                      phone: businessSettings.phone,
                                      email: businessSettings.email,
                                      website: businessSettings.website,
                                      logo: businessSettings.logo,
                                    },
                                    receiptSettings: {
                                      footerText: receiptSettings.footerText,
                                      paperSize: receiptSettings.paperSize,
                                      printerName: receiptSettings.printerName,
                                    },
                                    systemSettings: {
                                      currency: systemSettings.currency,
                                      currencySymbol:
                                        systemSettings.currencySymbol,
                                      dateFormat: systemSettings.dateFormat,
                                      timeFormat: systemSettings.timeFormat,
                                    },
                                  }}
                                />
                              }
                              fileName="receipt_test.pdf"
                            >
                              {({ loading }) => (
                                <Button
                                  variant="outline"
                                  disabled={loading}
                                  className="h-11 px-4 rounded-lg border-slate-200"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  {loading ? "Generating..." : "Download PDF"}
                                </Button>
                              )}
                            </PDFDownloadLink>

                            <Button
                              variant="outline"
                              onClick={handlePrintPDF}
                              disabled={
                                !receiptSettings.printerPort || isTestingPrint
                              }
                              className="h-11 px-4 rounded-lg border-slate-200"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              {isTestingPrint ? "Printing PDF..." : "Print PDF"}
                            </Button>
                          </div>
                          <p className="text-[10px] text-slate-400 pt-1">
                            Select the printer to use for receipts.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Paper Size
                          </Label>
                          <Select
                            value={receiptSettings.paperSize}
                            onValueChange={(val) =>
                              setReceiptSettings((prev) => ({
                                ...prev,
                                paperSize: val as "80mm" | "58mm",
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-medium focus:bg-white transition-colors">
                              <SelectValue placeholder="Select paper size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="80mm">
                                80mm (Standard Thermal)
                              </SelectItem>
                              <SelectItem value="58mm">
                                58mm (Narrow Thermal)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Currency Symbol
                          </Label>
                          <Input
                            value={systemSettings.currencySymbol}
                            onChange={(e) =>
                              setSystemSettings((prev) => ({
                                ...prev,
                                currencySymbol: e.target.value,
                              }))
                            }
                            className="h-11 bg-slate-50 border-slate-200 font-medium focus:bg-white transition-colors"
                            placeholder="e.g. ₦, $, £"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Footer Text
                          </Label>
                          <Textarea
                            value={receiptSettings.footerText}
                            onChange={(e) =>
                              setReceiptSettings((prev) => ({
                                ...prev,
                                footerText: e.target.value,
                              }))
                            }
                            className="bg-slate-50 border-slate-200 font-medium focus:bg-white min-h-[100px]"
                            placeholder="Thank you for your business!"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === "database" && <DatabaseSettingsTab />}
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </div>

          <div
            className={`${showPreview ? "lg:col-span-4" : "hidden"} transition-all duration-300 sticky top-32`}
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">
                Live Preview
              </h3>
              <div className="bg-slate-100 rounded-xl p-4 min-h-[500px] flex items-center justify-center border border-slate-200 border-dashed">
                  <PDFViewer height={550}>
                    <ReceiptPDF
                      settings={{
                        businessInfo: {
                          name: businessSettings.businessName,
                          address: businessSettings.address,
                          city: businessSettings.city,
                          state: businessSettings.state,
                          zipCode: businessSettings.zipCode,
                          phone: businessSettings.phone,
                          email: businessSettings.email,
                          website: businessSettings.website,
                          logo: businessSettings.logo,
                        },
                        receiptSettings: {
                          footerText: receiptSettings.footerText,
                          paperSize: receiptSettings.paperSize,
                          printerName: receiptSettings.printerName,
                        },
                        systemSettings: {
                          currency: systemSettings.currency,
                          currencySymbol: systemSettings.currencySymbol,
                          dateFormat: systemSettings.dateFormat,
                          timeFormat: systemSettings.timeFormat,
                        },
                      }}
                    />
                  </PDFViewer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
