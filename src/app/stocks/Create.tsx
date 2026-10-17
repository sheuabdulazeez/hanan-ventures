import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import {
  Loader2,
  PackagePlus,
  ArrowLeft,
  Package,
  Tag,
  DollarSign,
  TrendingUp,
  Box,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createProduct, getCommonUnits } from '@/database/products'
import { useNavigate } from 'react-router'
import { TCommonUnit, TProductUnit } from '@/types/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Minus, Info, LayoutGrid, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  costPrice: z.number().min(0.01, {
    message: "Cost price must be at least 0.01.",
  }),
  salesPrice: z.number().min(0.01, {
    message: "Sales price must be at least 0.01.",
  }),
  category: z.string({
    required_error: "Please enter a product category.",
  }),
  stock: z.number().min(0, {
    message: "Stock quantity must be a non-negative integer.",
  }),
  stockAlert: z.number().int().optional(),
  unitId: z.string({
    required_error: "Please select a primary unit.",
  }).min(1, {
    message: "Primary unit is required.",
  }),
})

export default function CreateStock() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [commonUnits, setCommonUnits] = useState<TCommonUnit[]>([])
  const [enableUnitPricing, setEnableUnitPricing] = useState(false)
  const [bulkEntryEnabled, setBulkEntryEnabled] = useState(false)
  const [purchaseUnitId, setPurchaseUnitId] = useState("")
  const [unitsPerPurchase, setUnitsPerPurchase] = useState<number>(1)
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(0)
  const [purchaseCost, setPurchaseCost] = useState<number>(0)

  // Advanced units state (Additional marketable units)
  const [productUnits, setProductUnits] = useState<Omit<TProductUnit, "id" | "product_id" | "created_at" | "updated_at">[]>([])

  useEffect(() => {
    getCommonUnits().then(setCommonUnits)
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      costPrice: 0,
      salesPrice: 0,
      stock: 0,
      stockAlert: 5,
      unitId: "", // Main Primary Unit
    }
  })

  // Add a secondary unit (e.g. Cartoon, Pack)
  const addUnitRow = () => {
    setProductUnits([...productUnits, {
      unit_id: "",
      conversion_to_base: 1,
      selling_price: 0,
      is_primary: false // Secondary units are never primary in this simplified flow
    }])
  }

  const removeUnitRow = (index: number) => {
    const updated = [...productUnits]
    updated.splice(index, 1)
    setProductUnits(updated)
  }

  const updateUnitRow = (index: number, field: keyof typeof productUnits[0], value: any) => {
    const updated = [...productUnits]
    updated[index] = { ...updated[index], [field]: value }
    setProductUnits(updated)
  }

  const applyAutoPricing = (index: number) => {
    const updated = [...productUnits]
    const basePrice = form.getValues('salesPrice') // Use the main Selling Price

    if (basePrice > 0) {
      // Logic: If 1 SecondaryUnit = X PrimaryUnits
      // Then Price of SecondaryUnit = Price of PrimaryUnit * X
      updated[index].selling_price = basePrice * updated[index].conversion_to_base
      setProductUnits(updated)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      // Prepare unit data
      // The "Primary Unit" is the one selected in the main form.
      // We construct the product_units array to include:
      // 1. The Main Unit (as Primary)
      // 2. Any additional units from the Matrix (if enabled)

      let finalUnits: Omit<TProductUnit, "id" | "product_id" | "created_at" | "updated_at">[] | undefined = undefined;

      if (values.unitId) {
        finalUnits = [{
          unit_id: values.unitId,
          conversion_to_base: 1,
          selling_price: values.salesPrice,
          is_primary: true
        }];

        if (enableUnitPricing && productUnits.length > 0) {
          finalUnits = [...finalUnits, ...productUnits];
        }
      }

      await createProduct({
        name: values.name,
        cost_price: values.costPrice,
        selling_price: values.salesPrice,
        category: values.category,
        quantity_on_hand: values.stock,
        reorder_level: values.stockAlert,
        base_unit: values.unitId || null, // The main unit is the base unit
        product_units: finalUnits
      })

      toast({
        title: "Product Cataloged",
        description: `${values.name} is now active in global inventory.`,
      })
      navigate("/dashboard/stocks")
    } catch (error) {
      console.error('Product Creation Error:', error)
      toast({
        title: "Catalog Fault",
        description: "Failed to synchronize product data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const baseUnitId = form.watch('unitId');
  const salesPrice = form.watch('salesPrice');
  const selectedUnitName = commonUnits.find(u => u.id === baseUnitId)?.abbrev || 'Units';
  const purchaseUnitName = commonUnits.find(u => u.id === purchaseUnitId)?.abbrev || selectedUnitName;
  const isBulkComplete = !bulkEntryEnabled
    || (purchaseUnitId && unitsPerPurchase > 0 && purchaseQuantity > 0 && purchaseCost > 0);

  useEffect(() => {
    if (!bulkEntryEnabled) return;
    if (!purchaseUnitId && baseUnitId) {
      setPurchaseUnitId(baseUnitId);
    }
  }, [bulkEntryEnabled, baseUnitId, purchaseUnitId]);

  useEffect(() => {
    if (!bulkEntryEnabled) return;
    if (!purchaseUnitId) return;
    if (!unitsPerPurchase || unitsPerPurchase <= 0) return;

    const baseQty = Math.max(0, purchaseQuantity) * unitsPerPurchase;
    const baseCost = purchaseCost > 0 ? purchaseCost / unitsPerPurchase : 0;

    form.setValue("stock", Math.floor(baseQty), { shouldValidate: true });
    if (baseCost > 0) {
      form.setValue("costPrice", Number(baseCost.toFixed(2)), { shouldValidate: true });
    }
  }, [bulkEntryEnabled, purchaseUnitId, unitsPerPurchase, purchaseQuantity, purchaseCost, form]);

  useEffect(() => {
    if (!bulkEntryEnabled) return;
    if (!purchaseUnitId || !baseUnitId) return;
    if (purchaseUnitId === baseUnitId) return;
    if (!unitsPerPurchase || unitsPerPurchase <= 0) return;

    setProductUnits((prev) => {
      const existingIndex = prev.findIndex(u => u.unit_id === purchaseUnitId);
      const autoPrice = salesPrice > 0 ? salesPrice * unitsPerPurchase : 0;

      if (existingIndex >= 0) {
        const updated = [...prev];
        const current = updated[existingIndex];
        updated[existingIndex] = {
          ...current,
          conversion_to_base: unitsPerPurchase,
          selling_price: current.selling_price || autoPrice,
          is_primary: current.is_primary || false
        };
        return updated;
      }

      return [
        ...prev,
        {
          unit_id: purchaseUnitId,
          conversion_to_base: unitsPerPurchase,
          selling_price: autoPrice,
          is_primary: false
        }
      ];
    });
  }, [bulkEntryEnabled, purchaseUnitId, baseUnitId, unitsPerPurchase, salesPrice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-50/50 pb-12"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 mb-8">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/stocks')}
              className="text-slate-400 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </Button>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">New Product</h1>
              <p className="text-slate-500 font-medium tracking-tight">Onboard a new item to your commercial catalog</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200">
              <Package className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Inventory Sync</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                  <PackagePlus className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Product Specification</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Global inventory parameters</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                  {/* General Info Section */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" /> Core Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Merchant Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Premium Wireless Speaker"
                                {...field}
                                className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Tag className="w-3 h-3" /> Category Label</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Electronics"
                                {...field}
                                className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700 focus:bg-white transition-colors"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Purchase Section */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Box className="w-3.5 h-3.5" /> How You Buy
                    </h3>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchased In Bulk</Label>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Enter stock in packs/cartons, we&apos;ll convert to base units</p>
                        </div>
                        <Switch checked={bulkEntryEnabled} onCheckedChange={setBulkEntryEnabled} />
                      </div>
                      {bulkEntryEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchase Unit</Label>
                            <Select value={purchaseUnitId} onValueChange={setPurchaseUnitId}>
                              <SelectTrigger className="h-11 bg-white border-slate-200 font-bold">
                                <SelectValue placeholder="Select Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {commonUnits.map(unit => (
                                  <SelectItem key={unit.id} value={unit.id} className="font-bold text-xs">
                                    {unit.name} ({unit.abbrev})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {selectedUnitName} per {purchaseUnitName}
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={unitsPerPurchase}
                              onChange={(e) => setUnitsPerPurchase(parseFloat(e.target.value) || 1)}
                              className="h-11 bg-white border-slate-200 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity Bought</Label>
                            <Input
                              type="number"
                              min="0"
                              value={purchaseQuantity}
                              onChange={(e) => setPurchaseQuantity(parseFloat(e.target.value) || 0)}
                              className="h-11 bg-white border-slate-200 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost per {purchaseUnitName} (₦)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={purchaseCost}
                              onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                              className="h-11 bg-white border-slate-200 font-bold"
                            />
                          </div>
                        </div>
                      )}
                      {bulkEntryEnabled && (
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          1 {purchaseUnitName} = {unitsPerPurchase} {selectedUnitName} • {purchaseQuantity} {purchaseUnitName} = {Math.floor(purchaseQuantity * unitsPerPurchase)} {selectedUnitName}
                        </p>
                      )}
                      {bulkEntryEnabled && !isBulkComplete && (
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
                          Complete bulk details to set selling unit and prices.
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Current Inventory ({selectedUnitName}s)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                readOnly={bulkEntryEnabled}
                                className={cn(
                                  "h-12 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors",
                                  bulkEntryEnabled ? "bg-slate-100" : "bg-slate-50"
                                )}
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stockAlert"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Critical Threshold Alert</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="5"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value, 10))}
                                className="h-12 bg-slate-50 border-slate-200 font-bold text-amber-600 focus:bg-white transition-colors"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Financial Section */}
                  {isBulkComplete && (
                    <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" /> How You Sell
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Choose the smallest selling unit and set prices.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <FormField
                        control={form.control}
                        name="unitId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Smallest Unit Sold</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors">
                                  <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white">
                                {commonUnits.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id} className="font-bold text-xs">
                                    {unit.name} ({unit.abbrev})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="costPrice"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Cost Price (per {selectedUnitName})
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value))}
                                  className="h-12 pl-10 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salesPrice"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <TrendingUp className="w-3 h-3" />
                              Selling Price (per {selectedUnitName})
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value))}
                                  className="h-12 pl-10 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </div>
                    </div>
                  )}

                  {/* Variations Section */}
                  {isBulkComplete && (
                    <div className="space-y-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                          <LayoutGrid className="w-3.5 h-3.5" /> Variations
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Only if you sell in packs/cartons too</p>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Has Variations</span>
                        <Switch
                          checked={enableUnitPricing}
                          onCheckedChange={setEnableUnitPricing}
                        />
                      </div>
                    </div>

                    {enableUnitPricing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-8"
                      >
                        <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-200/50 space-y-6">
                          <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Alternative Selling Units</h4>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addUnitRow}
                                className="h-8 rounded-xl border-slate-200 text-[9px] font-black uppercase tracking-widest hover:border-slate-900"
                              >
                                <Plus className="w-3 h-3 mr-2" /> Add Protocol
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {productUnits.map((unitRow, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-end">
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Unit Type</label>
                                    <Select value={unitRow.unit_id} onValueChange={(v) => updateUnitRow(idx, 'unit_id', v)}>
                                      <SelectTrigger className="h-10 bg-slate-50 border-slate-100 font-bold text-xs rounded-xl">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        {commonUnits.filter(u => u.id !== form.watch('unitId')).map(unit => (
                                          <SelectItem key={unit.id} value={unit.id} className="text-xs font-bold uppercase tracking-widest">{unit.abbrev}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">
                                      Conversion
                                    </label>
                                    <Input
                                      type="number"
                                      value={unitRow.conversion_to_base}
                                      onChange={(e) => updateUnitRow(idx, 'conversion_to_base', parseFloat(e.target.value))}
                                      className="h-10 bg-slate-50 border-slate-100 font-bold text-xs rounded-xl"
                                    />
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1 italic">
                                      {selectedUnitName}s per Unit
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Selling Price (₦)</label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        value={unitRow.selling_price}
                                        onChange={(e) => updateUnitRow(idx, 'selling_price', parseFloat(e.target.value))}
                                        className="h-10 bg-slate-50 border-slate-100 font-bold text-xs rounded-xl text-emerald-600"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyAutoPricing(idx)}
                                        className="h-10 px-3 rounded-xl border-slate-100 text-slate-400 hover:text-slate-900"
                                        title="Calculate based on Primary Unit Price"
                                      >
                                        <TrendingUp className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeUnitRow(idx)}
                                      className="h-10 w-10 p-0 text-slate-200 hover:text-red-500 rounded-xl"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {productUnits.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No additional units defined</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    </div>
                  )}


                  <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Verify Catalog Accuracy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/dashboard/stocks')}
                        className="h-12 px-8 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900"
                      >
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cataloging...
                          </>
                        ) : (
                          'Commit To Catalog'
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
