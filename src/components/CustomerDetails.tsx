import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { TCustomer } from "@/types/database"
import { format } from "date-fns"
import { getCustomerDebtHistory } from '@/database/debtors'
import { Badge } from './ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardHeader, CardContent, CardTitle,  } from "./ui/card"

interface CustomerDetailsProps {
  customer: TCustomer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetails({ customer, open, onOpenChange }: CustomerDetailsProps) {
  const [debtHistory, setDebtHistory] = useState<any[]>([])
  
  useEffect(() => {
    if (open && customer) {
      loadDebtHistory()
    }
  }, [open, customer])

  async function loadDebtHistory() {
    try {
      const history = await getCustomerDebtHistory(customer.id)
      setDebtHistory(history)
    } catch (error) {
      console.error('Failed to load debt history:', error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Customer Details</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="info" className="mt-6">
          <TabsList>
            <TabsTrigger value="info">Information</TabsTrigger>
            <TabsTrigger value="debt">Debt History</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
<div className="space-y-4">
  <Card>
    <CardContent className="pt-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Full Name</p>
          <p className="text-lg font-semibold">{customer.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone Number</p>
          <p className="text-lg font-semibold">{customer.phone}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-lg font-semibold">{customer.email || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="text-lg font-semibold">{customer.address || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created At</p>
          <p className="text-lg font-semibold">
            {format(new Date(customer.created_at), "MMM dd, yyyy")}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
          </TabsContent>
          <TabsContent value="debt">
            <div className="space-y-4">
              {debtHistory.length > 0 ? (
                debtHistory.map((debt) => (
                  <Card key={debt.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">
                          Debt Record
                        </CardTitle>
                        <Badge variant={debt.is_paid ? "default" : "destructive"}>
                          {debt.is_paid ? "Paid" : "Outstanding"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Original Amount</p>
                            <p className="text-lg font-semibold">₦{debt.amount_owed.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="text-lg">{format(new Date(debt.due_date), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                        
                        {debt.payments && debt.payments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Method</TableHead>
                                  <TableHead>Cashier</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {debt.payments?.map((payment: any) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>
                                      {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell>₦{payment.amount_paid.toFixed(2)}</TableCell>
                                    <TableCell>{payment.payment_method}</TableCell>
                                    <TableCell>{payment.employee_name}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No debt history found for this customer.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}