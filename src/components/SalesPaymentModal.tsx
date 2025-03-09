import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"
import { Textarea } from "../components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { SALE_Sale } from '@/types/sales'
import { PaymentMethod } from '@/types/database'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  sale: SALE_Sale
  onSubmit: (paymentDetails: PaymentDetails) => void
}

export interface PaymentDetails {
  saleId: string
  receivedAmount: number
  payingAmount: number
  changeReturn: number
  paymentMethod: PaymentMethod
  account: string
  paymentNotes: string
  saleNotes: string
}

export function PaymentModal({ isOpen, onClose, sale, onSubmit }: PaymentModalProps) {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    saleId: sale.id,
    receivedAmount: sale.total,
    payingAmount: sale.total,
    changeReturn: 0,
    paymentMethod: 'cash',
    account: 'main',
    paymentNotes: '',
    saleNotes: ''
  })

  const handleReceivedAmountChange = (value: number) => {
    setPaymentDetails(prev => ({
      ...prev,
      receivedAmount: value,
      changeReturn: value - prev.payingAmount
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(paymentDetails)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="receivedAmount">Received Amount *</Label>
                <Input
                  id="receivedAmount"
                  type="number"
                  step="0.01"
                  value={paymentDetails.receivedAmount}
                  onChange={(e) => handleReceivedAmountChange(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="payingAmount">Paying Amount *</Label>
                <Input
                  id="payingAmount"
                  type="number"
                  step="0.01"
                  value={paymentDetails.payingAmount}
                  readOnly
                />
              </div>
              <div>
                <Label>Change Return</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentDetails.changeReturn.toFixed(2)}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={paymentDetails.paymentMethod}
                  onValueChange={(value) => setPaymentDetails(prev => ({ ...prev, paymentMethod: value as PaymentMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="account">Account</Label>
                <Select
                  value={paymentDetails.account}
                  onValueChange={(value) => setPaymentDetails(prev => ({ ...prev, account: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Account</SelectItem>
                    <SelectItem value="sales">Sales Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Total Products</span>
                  <span>{sale.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>₦0.00</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total Payable</span>
                  <span>₦{sale.total.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="paymentNotes">Payment Notes</Label>
                <Textarea
                  id="paymentNotes"
                  value={paymentDetails.paymentNotes}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, paymentNotes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="saleNotes">Sale Notes</Label>
                <Textarea
                  id="saleNotes"
                  value={paymentDetails.saleNotes}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, saleNotes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Submit Payment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

