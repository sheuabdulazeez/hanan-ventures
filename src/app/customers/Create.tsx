import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Loader2,
  ArrowLeft,
  UserPlus,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Users
} from 'lucide-react'
import { createCustomer } from '@/database/customers'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).or(z.literal("")),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export default function AddCustomerPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  })

  async function onSubmit(data: CustomerFormValues) {
    setIsLoading(true)
    try {
      await createCustomer({
        name: data.name!,
        email: data.email || null,
        phone: data.phone!,
        address: data.address!,
      })

      toast({
        title: "Registration Success",
        description: `${data.name} is now part of your network.`,
      })

      navigate('/dashboard/customers')
    } catch (error) {
      toast({
        title: "Registration Fault",
        description: "Failed to synchronize customer data.",
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
              onClick={() => navigate('/dashboard/customers')}
              className="text-slate-400 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Directory
            </Button>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">New Identity</h1>
              <p className="text-slate-500 font-medium tracking-tight">Onboard a new customer to your database</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200">
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">CRM Enrollment</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Profile Configuration</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Global CRM synchronization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <User className="w-3 h-3" /> Full Legal Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Johnathan Doe"
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
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> Communication Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                              className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700 focus:bg-white transition-colors"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Phone className="w-3 h-3" /> Secure Line
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+234 ..."
                              {...field}
                              className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700 focus:bg-white transition-colors"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="space-y-2 md:col-span-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Primary Residence
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Main St, City, Country"
                              {...field}
                              className="h-12 bg-slate-50 border-slate-200 font-bold text-slate-700 focus:bg-white transition-colors"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Verify Information Accuracy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/dashboard/customers')}
                        className="h-12 px-8 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Enroll Customer'
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
