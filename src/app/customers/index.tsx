import { useEffect, useState } from 'react'
import { getCustomers } from '@/database/customers'
import { TCustomer } from '@/types/database'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Edit, UserPlus, Users, Eye } from 'lucide-react'
import { Link } from 'react-router'
import { CustomerDetails } from "@/components/CustomerDetails"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"

export default function Customers() {
  const [customers, setCustomers] = useState<TCustomer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<TCustomer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleCustomerUpdate(updatedCustomer: TCustomer) {
    setCustomers(prev =>
      prev.map(customer =>
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      )
    )
    setSelectedCustomer(updatedCustomer)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Customers</h1>
              <p className="text-slate-500 font-medium tracking-tight">Manage and track your customer base</p>
            </div>
            <Link to="/dashboard/customers/create">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs h-12 px-6">
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Customer
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{filteredCustomers.length} Total</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading customers...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Customer</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Contact Info</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredCustomers.map((customer, index) => (
                      <motion.tr
                        key={customer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-slate-50/50 border-slate-50 transition-colors"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border border-slate-100 transition-transform group-hover:scale-110">
                              <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${customer.name}`} />
                              <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                {customer.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-black text-slate-900 text-sm leading-tight">{customer.name}</p>
                              <p className="text-[10px] font-medium text-slate-400 tracking-tight">Joined {format(new Date(customer.created_at), 'MMM yyyy')}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">{customer.phone || "No phone"}</p>
                            <p className="text-[10px] font-medium text-slate-400">{customer.email || "No email"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => {
                                setSelectedCustomer(customer)
                                setIsDetailsOpen(true)
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedCustomer(customer)
                                setIsDetailsOpen(true)
                                setTimeout(() => {
                                  const editButton = document.querySelector('[data-edit-button]') as HTMLButtonElement
                                  editButton?.click()
                                }, 100)
                              }}
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Users className="w-12 h-12 text-slate-100" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No customers found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onCustomerUpdate={handleCustomerUpdate}
        />
      )}
    </motion.div>
  )
}