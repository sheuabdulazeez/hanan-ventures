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
import { useState } from 'react'
import { createProduct } from '@/database/products'
import { useNavigate } from 'react-router'

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
  stock: z.number().int().min(0, {
    message: "Stock quantity must be a non-negative integer.",
  }),
  stockAlert: z.number().int().optional(),
})

export default function CreateStock() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      costPrice: 0,
      salesPrice: 0,
      stock: 0,
      stockAlert: 5,
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await createProduct({
        name: values.name,
        cost_price: values.costPrice,
        selling_price: values.salesPrice,
        category: values.category,
        quantity_on_hand: values.stock,
      })

      toast({
        title: "Product Cataloged",
        description: `${values.name} is now active in global inventory.`,
      })
      navigate("/dashboard/stocks")
    } catch (error) {
      toast({
        title: "Catalog Fault",
        description: "Failed to synchronize product data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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

                  {/* Financial Section */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" /> Economic Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="costPrice"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acquisition Cost (₦)</FormLabel>
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
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Marketplace Price (₦)</FormLabel>
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

                  {/* Stock Management Section */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Box className="w-3.5 h-3.5" /> Logistics Control
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Unit Inventory</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value, 10))}
                                className="h-12 bg-slate-50 border-slate-200 font-black text-slate-900 focus:bg-white transition-colors"
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
