'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Search, ArrowUpDown, FileText, Truck, XCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@components/ui/card"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Label } from "@components/ui/label"
import { ScrollArea } from "@components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"
import { mockPurchaseOrders, mockSuppliers, mockProducts, PurchaseOrder, Supplier } from '@/lib/mock-data'

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof PurchaseOrder>('orderDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)
  const [newPOItems, setNewPOItems] = useState<PurchaseOrder['items']>([])

  const filteredPOs = mockPurchaseOrders.filter(po =>
    po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.id.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1
    if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (column: keyof PurchaseOrder) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const statusIcon = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Pending': return <FileText className="h-4 w-4 text-yellow-500" />
      case 'Approved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'Disapproved': return <XCircle className="h-4 w-4 text-red-500" />
      case 'Delivered': return <Truck className="h-4 w-4 text-blue-500" />
      case 'Cancelled': return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const handleApprove = (id: string) => {
    const updatedPOs = mockPurchaseOrders.map(po =>
      po.id === id ? { ...po, status: 'Approved' as const } : po
    )
    // In a real app, you'd make an API call here
    console.log('Approved PO:', id)
    // Update the state (mock update)
    mockPurchaseOrders.splice(0, mockPurchaseOrders.length, ...updatedPOs)
  }

  const handleDisapprove = (id: string) => {
    const updatedPOs = mockPurchaseOrders.map(po =>
      po.id === id ? { ...po, status: 'Disapproved' as const } : po
    )
    // In a real app, you'd make an API call here
    console.log('Disapproved PO:', id)
    // Update the state (mock update)
    mockPurchaseOrders.splice(0, mockPurchaseOrders.length, ...updatedPOs)
  }

  const handleUpdatePO = (updatedPO: PurchaseOrder) => {
    const updatedPOs = mockPurchaseOrders.map(po =>
      po.id === updatedPO.id ? updatedPO : po
    )
    // In a real app, you'd make an API call here
    console.log('Updated PO:', updatedPO)
    // Update the state (mock update)
    mockPurchaseOrders.splice(0, mockPurchaseOrders.length, ...updatedPOs)
    setEditingPO(null)
  }

  return (
    <div className="container mx-auto py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6">Purchase Orders</h1>

        <Card>
          <CardHeader>
            <CardTitle>Manage Purchase Orders</CardTitle>
            <CardDescription>View and create purchase orders for your business.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchase orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingPO(null)
                    setNewPOItems([])
                  }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Purchase Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
                    <DialogDescription>
                      {editingPO ? 'Edit the details of the purchase order.' : 'Fill in the details to create a new purchase order.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="supplier" className="text-right">
                        Supplier
                      </Label>
                      <Select defaultValue={editingPO?.supplierName} onValueChange={(value) => {
                        if (editingPO) {
                          setEditingPO({ ...editingPO, supplierName: value })
                        }
                      }}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockSuppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.name}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="delivery-date" className="text-right">
                        Delivery Date
                      </Label>
                      <Input
                        id="delivery-date"
                        type="date"
                        className="col-span-3"
                        value={editingPO ? format(editingPO.expectedDeliveryDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          if (editingPO) {
                            setEditingPO({ ...editingPO, expectedDeliveryDate: new Date(e.target.value) })
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="items" className="text-right">
                        Items
                      </Label>
                      <div className="col-span-3 space-y-2">
                        {(editingPO ? editingPO.items : newPOItems).map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Select
                              value={item.product.id}
                              onValueChange={(value) => {
                                const product = mockProducts.find(p => p.id === value)
                                if (product) {
                                  const updatedItems = [...(editingPO ? editingPO.items : newPOItems)]
                                  updatedItems[index] = { ...item, product, unitPrice: product.price }
                                  if (editingPO) {
                                    setEditingPO({ ...editingPO, items: updatedItems })
                                  } else {
                                    setNewPOItems(updatedItems)
                                  }
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                              <SelectContent>
                                {mockProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="Quantity"
                              value={item.quantity}
                              onChange={(e) => {
                                const updatedItems = [...(editingPO ? editingPO.items : newPOItems)]
                                updatedItems[index] = { ...item, quantity: parseInt(e.target.value) }
                                if (editingPO) {
                                  setEditingPO({ ...editingPO, items: updatedItems })
                                } else {
                                  setNewPOItems(updatedItems)
                                }
                              }}
                              className="w-24"
                            />
                            <Button variant="outline" onClick={() => {
                              const updatedItems = (editingPO ? editingPO.items : newPOItems).filter((_, i) => i !== index)
                              if (editingPO) {
                                setEditingPO({ ...editingPO, items: updatedItems })
                              } else {
                                setNewPOItems(updatedItems)
                              }
                            }}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button onClick={() => {
                          const newItem = { product: mockProducts[0], quantity: 1, unitPrice: mockProducts[0].price }
                          if (editingPO) {
                            setEditingPO({ ...editingPO, items: [...editingPO.items, newItem] })
                          } else {
                            setNewPOItems([...newPOItems, newItem])
                          }
                        }}>
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={() => {
                      if (editingPO) {
                        handleUpdatePO(editingPO)
                      } else {
                        // Handle creating new PO
                        console.log('Create new PO', { supplier: editingPO?.supplierName, items: newPOItems })
                      }
                    }}>
                      {editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">
                      <Button variant="ghost" onClick={() => handleSort('id')}>
                        PO ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('supplierName')}>
                        Supplier
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('orderDate')}>
                        Order Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('expectedDeliveryDate')}>
                        Expected Delivery
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('totalAmount')}>
                        Total Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('status')}>
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredPOs.map((po) => (
                      <motion.tr
                        key={po.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TableCell className="font-medium">{po.id}</TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>{format(po.orderDate, 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(po.expectedDeliveryDate, 'MMM dd, yyyy')}</TableCell>
                        <TableCell>₦{po.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={po.status === 'Approved' ? 'default' : po.status === 'Pending' ? 'secondary' : 'destructive'} className="flex w-fit items-center gap-1">
                            {statusIcon(po.status)}
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" onClick={() => setSelectedPO(po)}>View</Button>
                          <Button variant="ghost" onClick={() => setEditingPO(po)}>Edit</Button>
                          {po.status === 'Pending' && (
                            <>
                              <Button variant="outline" onClick={() => handleApprove(po.id)}>Approve</Button>
                              <Button variant="outline" onClick={() => handleDisapprove(po.id)}>Disapprove</Button>
                            </>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected purchase order.
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PO ID</Label>
                    <div className="font-semibold">{selectedPO.id}</div>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <div className="font-semibold">{selectedPO.supplierName}</div>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <div>{format(selectedPO.orderDate, 'MMM dd, yyyy')}</div>
                  </div>
                  <div>
                    <Label>Expected Delivery</Label>
                    <div>{format(selectedPO.expectedDeliveryDate, 'MMM dd, yyyy')}</div>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <div className="font-semibold">₦{selectedPO.totalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={selectedPO.status === 'Delivered' ? 'default' : selectedPO.status === 'Pending' ? 'secondary' : 'destructive'} className="flex w-fit items-center gap-1 mt-1">
                      {statusIcon(selectedPO.status)}
                      {selectedPO.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₦{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>₦{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingPO} onOpenChange={(open) => !open && setEditingPO(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
            <DialogDescription>
              {editingPO ? 'Edit the details of the purchase order.' : 'Fill in the details to create a new purchase order.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier" className="text-right">
                Supplier
              </Label>
              <Select defaultValue={editingPO?.supplierName} onValueChange={(value) => {
                if (editingPO) {
                  setEditingPO({ ...editingPO, supplierName: value })
                }
              }}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {mockSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delivery-date" className="text-right">
                Delivery Date
              </Label>
              <Input
                id="delivery-date"
                type="date"
                className="col-span-3"
                value={editingPO ? format(editingPO.expectedDeliveryDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (editingPO) {
                    setEditingPO({ ...editingPO, expectedDeliveryDate: new Date(e.target.value) })
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="items" className="text-right">
                Items
              </Label>
              <div className="col-span-3 space-y-2">
                {(editingPO ? editingPO.items : newPOItems).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Select
                      value={item.product.id}
                      onValueChange={(value) => {
                        const product = mockProducts.find(p => p.id === value)
                        if (product) {
                          const updatedItems = [...(editingPO ? editingPO.items : newPOItems)]
                          updatedItems[index] = { ...item, product, unitPrice: product.price }
                          if (editingPO) {
                            setEditingPO({ ...editingPO, items: updatedItems })
                          } else {
                            setNewPOItems(updatedItems)
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => {
                        const updatedItems = [...(editingPO ? editingPO.items : newPOItems)]
                        updatedItems[index] = { ...item, quantity: parseInt(e.target.value) }
                        if (editingPO) {
                          setEditingPO({ ...editingPO, items: updatedItems })
                        } else {
                          setNewPOItems(updatedItems)
                        }
                      }}
                      className="w-24"
                    />
                    <Button variant="outline" onClick={() => {
                      const updatedItems = (editingPO ? editingPO.items : newPOItems).filter((_, i) => i !== index)
                      if (editingPO) {
                        setEditingPO({ ...editingPO, items: updatedItems })
                      } else {
                        setNewPOItems(updatedItems)
                      }
                    }}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button onClick={() => {
                  const newItem = { product: mockProducts[0], quantity: 1, unitPrice: mockProducts[0].price }
                  if (editingPO) {
                    setEditingPO({ ...editingPO, items: [...editingPO.items, newItem] })
                  } else {
                    setNewPOItems([...newPOItems, newItem])
                  }
                }}>
                  Add Item
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => {
              if (editingPO) {
                handleUpdatePO(editingPO)
              } else {
                // Handle creating new PO
                console.log('Create new PO', { supplier: editingPO?.supplierName, items: newPOItems })
              }
            }}>
              {editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

