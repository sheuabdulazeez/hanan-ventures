import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { BaseDirectory, open, remove} from "@tauri-apps/plugin-fs"

import { getAdminSettings, updateAdminSetting } from "@/database/settings";
import { useAppStore } from "@/lib/store"
import { toast } from "@/hooks/use-toast"

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
    } catch (error) {}
    
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
      toast({title: "Success", description: "Settings saved successfully!"})
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({title: "Error", description: "Error saving settings. Please try again."})
    }
  }


  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-gray-600">Configure your point of sale system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button onClick={saveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="business">
                <Building2 className="w-4 h-4 mr-1" />
                Business
              </TabsTrigger>
              <TabsTrigger value="receipt">
                <Receipt className="w-4 h-4 mr-1" />
                Receipt
              </TabsTrigger>
              <TabsTrigger value="system" disabled>
                <Settings className="w-4 h-4 mr-1" />
                System
              </TabsTrigger>
              <TabsTrigger value="payment" disabled>
                <CreditCard className="w-4 h-4 mr-1" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="interface" disabled>
                <Palette className="w-4 h-4 mr-1" />
                Interface
              </TabsTrigger>
            </TabsList>

            {/* Business Information Tab */}
            <TabsContent value="business" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={businessSettings.businessName}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter business name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter business address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={businessSettings.city}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={businessSettings.state}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={businessSettings.zipCode}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={businessSettings.phone}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+234 123 456 7890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={businessSettings.email}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="info@business.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={businessSettings.website}
                        onChange={(e) => setBusinessSettings((prev) => ({ ...prev, website: e.target.value }))}
                        placeholder="www.business.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Logo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {businessSettings.logo ? (
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={businessSettings.logo || "/placeholder.svg"}
                            alt="Business Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Current logo</p>
                          <Button variant="outline" size="sm" onClick={removeLogo} className="mt-2 bg-transparent">
                            <X className="w-4 h-4 mr-2" />
                            Remove Logo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600 mb-2">No logo uploaded</p>
                        <p className="text-sm text-gray-500 mb-4">Upload a logo to display on receipts</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      {businessSettings.logo ? "Change Logo" : "Upload Logo"}
                    </Button>
                    <p className="text-xs text-gray-500">Recommended: PNG or JPG, max 1MB, square format</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipt Settings Tab */}
            <TabsContent value="receipt" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Receipt Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Textarea
                      id="footerText"
                      value={receiptSettings.footerText}
                      onChange={(e) => setReceiptSettings((prev) => ({ ...prev, footerText: e.target.value }))}
                      placeholder="Visit us again soon!"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings Tab */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Currency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={systemSettings.currency}
                        onValueChange={(value) => setSystemSettings((prev) => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">Nigerian Naira (NGN)</SelectItem>
                          <SelectItem value="USD">US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">Euro (EUR)</SelectItem>
                          <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                          <SelectItem value="GHS">Ghanaian Cedi (GHS)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="currencySymbol">Currency Symbol</Label>
                      <Input
                        id="currencySymbol"
                        value={systemSettings.currencySymbol}
                        onChange={(e) => setSystemSettings((prev) => ({ ...prev, currencySymbol: e.target.value }))}
                        placeholder="₦"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Date & Time Format</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select
                        value={systemSettings.dateFormat}
                        onValueChange={(value) => setSystemSettings((prev) => ({ ...prev, dateFormat: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timeFormat">Time Format</Label>
                      <Select
                        value={systemSettings.timeFormat}
                        onValueChange={(value) => setSystemSettings((prev) => ({ ...prev, timeFormat: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                          <SelectItem value="24h">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings Tab */}
            <TabsContent value="payment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Accepted Payment Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label>Cash</Label>
                      <Switch
                        checked={paymentSettings.cashEnabled}
                        onCheckedChange={(checked) => setPaymentSettings((prev) => ({ ...prev, cashEnabled: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Credit/Debit Card</Label>
                      <Switch
                        checked={paymentSettings.cardEnabled}
                        onCheckedChange={(checked) => setPaymentSettings((prev) => ({ ...prev, cardEnabled: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Transfer</Label>
                      <Switch
                        checked={paymentSettings.transferEnabled}
                        onCheckedChange={(checked) =>
                          setPaymentSettings((prev) => ({ ...prev, transferEnabled: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interface Settings Tab */}
            <TabsContent value="interface" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={uiSettings.theme}
                        onValueChange={(value) => setUISettings((prev) => ({ ...prev, theme: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="auto">Auto (System)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Select
                        value={uiSettings.fontSize}
                        onValueChange={(value) => setUISettings((prev) => ({ ...prev, fontSize: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="gridColumns">Product Grid Columns</Label>
                    <Input
                      id="gridColumns"
                      type="number"
                      min="2"
                      max="8"
                      value={uiSettings.gridColumns}
                      onChange={(e) =>
                        setUISettings((prev) => ({ ...prev, gridColumns: Number.parseInt(e.target.value) || 4 }))
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Show Product Images</Label>
                      <Switch
                        checked={uiSettings.showProductImages}
                        onCheckedChange={(checked) =>
                          setUISettings((prev) => ({ ...prev, showProductImages: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Compact Mode</Label>
                      <Switch
                        checked={uiSettings.compactMode}
                        onCheckedChange={(checked) => setUISettings((prev) => ({ ...prev, compactMode: checked }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Receipt Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border-2 border-dashed border-gray-300 p-4 text-sm font-mono">
                  {/* Logo */}
                  {businessSettings.logo && (
                    <div className="text-center mb-3">
                      <img
                        src={businessSettings.logo || "/placeholder.svg"}
                        alt="Logo"
                        className="w-16 h-16 mx-auto object-contain"
                      />
                    </div>
                  )}

                  {/* Business Info */}
                  <div className="text-center mb-3">
                    <div className="font-bold text-lg">{businessSettings.businessName}</div>
                    <div>{businessSettings.address}</div>
                    <div>
                      {businessSettings.city}, {businessSettings.state} {businessSettings.zipCode}
                    </div>
                    <div>{businessSettings.phone}</div>
                    <div>{businessSettings.email}</div>
                    <div>{businessSettings.website}</div>
                  </div>

                  <Separator className="my-3" />

                  {/* Sample Items */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Sample Product 1</span>
                      <span>{systemSettings.currencySymbol}25.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sample Product 2</span>
                      <span>{systemSettings.currencySymbol}15.50</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Totals */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{systemSettings.currencySymbol}40.50</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{systemSettings.currencySymbol}44.55</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Footer */}
                  <div className="text-center text-xs space-y-1">
                    <div className="mt-2 text-gray-600">{receiptSettings.footerText}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
