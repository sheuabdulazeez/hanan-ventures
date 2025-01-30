import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@components/ui/table"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@components/ui/sheet"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card"
import { mockSales } from '@/lib/mock-data'
import { SALE_Sale } from '@/types/sales'
import { Printer, Search, ArrowUpDown } from 'lucide-react'

export default function SalesPage() {
  const [selectedSale, setSelectedSale] = useState<SALE_Sale | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSales, setFilteredSales] = useState(mockSales)
  const [sortConfig, setSortConfig] = useState<{ key: keyof SALE_Sale; direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    const filtered = mockSales.filter(sale => 
      sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredSales(filtered)
  }, [searchTerm])

  const handleRowClick = (sale: SALE_Sale) => {
    setSelectedSale(sale)
    setIsDrawerOpen(true)
  }

  const handlePrintReceipt = () => {
    // Implement print functionality here
    console.log('Printing receipt for sale:', selectedSale?.id)
  }

  const handleSort = (key: keyof SALE_Sale) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })

    const sorted = [...filteredSales].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
      return 0
    })
    setFilteredSales(sorted)
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <CardDescription>Manage and view all sales transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline">Export</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button variant="ghost" onClick={() => handleSort('id')}>
                      ID
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('date')}>
                      Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('customer')}>
                      Customer
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('total')}>
                      Total
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow 
                    key={sale.id} 
                    onClick={() => handleRowClick(sale)}
                    className="cursor-pointer hover:bg-muted"
                  >
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>{format(sale.date, 'PPpp')}</TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell>₦{sale.total.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>Sale Details</SheetTitle>
            <SheetDescription>
              Sale ID: {selectedSale?.id}
            </SheetDescription>
          </SheetHeader>
          {selectedSale && (
            <div className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Name:</strong> {selectedSale.customer.name}</p>
                  <p><strong>Email:</strong> {selectedSale.customer.email}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₦{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>₦{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">Total: ₦{selectedSale.total.toFixed(2)}</p>
                      <p>Payment Method: <span className="capitalize">{selectedSale.paymentMethod}</span></p>
                      <p>Date: {format(selectedSale.date, 'PPpp')}</p>
                    </div>
                    <Button onClick={handlePrintReceipt}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Receipt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

