import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  ChevronRight,
  EyeOff
} from "lucide-react"
import { BaseDirectory, open, remove } from "@tauri-apps/plugin-fs"
import { getAdminSettings, updateAdminSetting } from "@/database/settings";
import { useAppStore } from "@/lib/store"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface BusinessSettings {
  businessName: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  website: string
  logo: string | null
}

interface ReceiptSettings {
  footerText: string
}

interface SystemSettings {
  currency: string
  currencySymbol: string
  dateFormat: string
  timeFormat: string
}

interface PaymentSettings {
  cashEnabled: boolean
  cardEnabled: boolean
  transferEnabled: boolean
}

interface UISettings {
  theme: string
  fontSize: string
  gridColumns: number
  showProductImages: boolean
  compactMode: boolean
}

export default function SettingsPage() {
  const { reloadStore } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState("business")
  const [showPreview, setShowPreview] = useState(false)

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
  })

  // Receipt Settings State
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    footerText: "",
  })

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    currency: "",
    currencySymbol: "",
    dateFormat: "",
    timeFormat: "",
  })

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    cashEnabled: true,
    cardEnabled: true,
    transferEnabled: false,
  })

  // UI Settings State
  const [uiSettings, setUISettings] = useState<UISettings>({
    theme: "auto",
    fontSize: "medium",
    gridColumns: 4,
    showProductImages: true,
    compactMode: false,
  })

  // Load settings from localStorage on mount
  useEffect(() => {
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
        });
        setSystemSettings({
          currency: settings.currency,
          currencySymbol: settings.currency_symbol,
          dateFormat: settings.date_format,
          timeFormat: settings.time_format,
        })
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }
    loadSettings()
  }, [])

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const logoFile = await open("logo.png", { baseDir: BaseDirectory.AppData, write: true, create: true, truncate: true });
      await logoFile.write(new Uint8Array(await file.arrayBuffer()));
      await logoFile.close()

      const reader = new FileReader()
      reader.onload = async (e) => {
        setBusinessSettings((prev) => ({
          ...prev,
          logo: e.target?.result as string,
        }))
      }
      reader.readAsDataURL(file);
    }
  }

  const removeLogo = async () => {
    try {
      await remove("logo.png", { baseDir: BaseDirectory.AppData });
      setBusinessSettings((prev) => ({
        ...prev,
        logo: null,
      }))
    } catch (error) { }
  }

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
        currency: systemSettings.currency,
        currency_symbol: systemSettings.currencySymbol,
        date_format: systemSettings.dateFormat,
        time_format: systemSettings.timeFormat,
        logo: businessSettings.logo,
      });
      reloadStore()
      toast({ title: "Configuration Saved", description: "Operational parameters synchronized." })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({ title: "Sync Fault", description: "Failed to persist configuration changes.", variant: "destructive" })
    }
  }

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
              <h1 className="text-4xl font-black text-slate-900 mb-2">System Configuration</h1>
              <p className="text-slate-500 font-medium tracking-tight">Fine-tune your point of sale environment</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="h-12 px-6 rounded-2xl border-slate-200 bg-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-50"
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
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
          <div className={`${showPreview ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-300`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl h-14 w-full flex items-center justify-start overflow-x-auto gap-2 no-scrollbar">
                {[
                  { id: 'business', label: 'Business', icon: Building2 },
                  { id: 'receipt', label: 'Receipt', icon: Receipt },
                  { id: 'system', label: 'System', icon: Settings, disabled: true },
                  { id: 'payment', label: 'Payment', icon: CreditCard, disabled: true },
                  { id: 'interface', label: 'Interface', icon: Palette, disabled: true },
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
                  {activeTab === 'business' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-white border-slate-200 shadow-sm">
                          <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Primary Identity</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Main business details</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Name</Label>
                              <Input
                                value={businessSettings.businessName}
                                onChange={(e) => setBusinessSettings((prev) => ({ ...prev, businessName: e.target.value }))}
                                className="h-11 bg-slate-50 border-slate-200 font-bold focus:bg-white transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Street Address</Label>
                              <Input
                                value={businessSettings.address}
                                onChange={(e) => setBusinessSettings((prev) => ({ ...prev, address: e.target.value }))}
                                className="h-11 bg-slate-50 border-slate-200 font-medium focus:bg-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City</Label>
                                <Input
                                  value={businessSettings.city}
                                  onChange={(e) => setBusinessSettings((prev) => ({ ...prev, city: e.target.value }))}
                                  className="h-11 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">State / Province</Label>
                                <Input
                                  value={businessSettings.state}
                                  onChange={(e) => setBusinessSettings((prev) => ({ ...prev, state: e.target.value }))}
                                  className="h-11 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm">
                          <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Communications</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Contact and web presence</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support Email</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  type="email"
                                  value={businessSettings.email}
                                  onChange={(e) => setBusinessSettings((prev) => ({ ...prev, email: e.target.value }))}
                                  className="h-11 pl-10 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Phone</Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  value={businessSettings.phone}
                                  onChange={(e) => setBusinessSettings((prev) => ({ ...prev, phone: e.target.value }))}
                                  className="h-11 pl-10 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Web URL</Label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  value={businessSettings.website}
                                  onChange={(e) => setBusinessSettings((prev) => ({ ...prev, website: e.target.value }))}
                                  className="h-11 pl-10 bg-slate-50 border-slate-200 font-medium"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm md:col-span-2 overflow-hidden">
                          <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Brand Assets</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Business logo and iconography</CardDescription>
                          </CardHeader>
                          <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                              <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-slate-900">
                                  {businessSettings.logo ? (
                                    <img src={businessSettings.logo} alt="Logo" className="w-full h-full object-contain p-4" />
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
                                  <h4 className="text-sm font-black text-slate-900">Official Identity Mark</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PNG or JPG • Transparent background recommended</p>
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
                                    onClick={() => fileInputRef.current?.click()}
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

                  {activeTab === 'receipt' && (
                    <Card className="bg-white border-slate-200 shadow-sm">
                      <CardHeader className="p-6 border-b border-slate-50">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Transaction Output</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Customize physical and digital receipts</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receipt Footer Message</Label>
                          <Textarea
                            value={receiptSettings.footerText}
                            onChange={(e) => setReceiptSettings((prev) => ({ ...prev, footerText: e.target.value }))}
                            placeholder="e.g. Thanks for your patronage! Visit again soon."
                            className="min-h-[120px] bg-slate-50 border-slate-200 font-medium p-4 focus:bg-white transition-colors"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </div>

          {/* Preview Panel (Receipt) */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-4"
              >
                <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl border-4 border-slate-800 sticky top-[10rem]">
                  <div className="bg-white rounded-[1.8rem] min-h-[500px] p-8 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-50" />

                    {/* Simulated Receipt */}
                    <div className="space-y-8 font-mono text-[11px] text-slate-600 uppercase tracking-tighter">
                      <div className="text-center space-y-3 pt-4">
                        {businessSettings.logo ? (
                          <img src={businessSettings.logo} alt="Logo" className="w-16 h-16 mx-auto object-contain mb-4 grayscale" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-50 rounded-full mx-auto flex items-center justify-center mb-2">
                            <Receipt className="w-6 h-6 text-slate-200" />
                          </div>
                        )}
                        <h2 className="text-sm font-black text-slate-900 leading-tight">{businessSettings.businessName || "Your Business"}</h2>
                        <div className="flex flex-col gap-0.5 text-slate-400">
                          <span className="flex items-center justify-center gap-1.5"><MapPin className="w-3 h-3" /> {businessSettings.address || "Address"}</span>
                          <span className="flex items-center justify-center gap-1.5"><Phone className="w-3 h-3" /> {businessSettings.phone || "Phone"}</span>
                        </div>
                      </div>

                      <div className="border-y border-dashed border-slate-200 py-3 flex justify-between px-2">
                        <span>#INV-008241</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>

                      <div className="space-y-4 px-2">
                        <div className="flex justify-between font-bold">
                          <span>Item Description</span>
                          <span>Sum</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sample Product x 2</span>
                          <span>₦50,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Premium Add-on x 1</span>
                          <span>₦15,500</span>
                        </div>
                      </div>

                      <div className="pt-4 px-2 space-y-2">
                        <div className="flex justify-between border-t border-dashed border-slate-200 pt-4">
                          <span>Subtotal</span>
                          <span>₦65,500</span>
                        </div>
                        <div className="flex justify-between font-black text-slate-900 text-sm">
                          <span>Total Amount</span>
                          <span>₦65,500</span>
                        </div>
                      </div>

                      <div className="text-center pt-8 pb-4">
                        <div className="border-t border-dashed border-slate-200 pt-8 mb-4 opacity-50" />
                        <p className="px-4 text-[10px] leading-relaxed italic text-slate-400">
                          {receiptSettings.footerText || "Thank you for your business!"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
