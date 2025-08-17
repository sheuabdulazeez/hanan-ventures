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
import { Search, Edit } from 'lucide-react'
import { Link } from 'react-router'
import { CustomerDetails } from "@/components/CustomerDetails"

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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Link to="/dashboard/customers/create">
          <Button>Add New Customer</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            Loading customers...
          </div>
        ) : (
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.email || "N/A"}</TableCell>
                  <TableCell>{customer.phone || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setIsDetailsOpen(true)
                        }}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setIsDetailsOpen(true)
                          // We'll set edit mode after the sheet opens
                          setTimeout(() => {
                            const editButton = document.querySelector('[data-edit-button]') as HTMLButtonElement
                            editButton?.click()
                          }, 100)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* ... empty state row remains the same ... */}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onCustomerUpdate={handleCustomerUpdate}
        />
      )}
      </Card>
    </div>
  )
}