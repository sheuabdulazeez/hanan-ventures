'use client'

import { Dialog, DialogContent } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { PaymentDetails } from './SalesPaymentModal'
import { Printer } from 'lucide-react'
import { SALE_Sale } from "@/types/sales"

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  sale: SALE_Sale
  paymentDetails: PaymentDetails
}

export function InvoiceModal({ isOpen, onClose, sale, paymentDetails }: InvoiceModalProps) {
  const handlePrint = () => {
    window.print()
  }

  const receiptNumber = `SA${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="p-6 space-y-4 print:p-0 text-sm" id="invoice-content">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold uppercase">Hanan Ventures</h2>
            <p className="text-xs">
              Goshen Shopping Plaza Beside. Joyland Hospital,
              <br />
              Arogunmosa Osogbo, Osun State
            </p>
            <p className="text-xs">
              Tel: 09069410657, 07040861356,
              <br />
              WhatsApp: 08171431872
            </p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-y border-black">
                <th className="text-left py-1">QTY</th>
                <th className="text-left py-1">DETAILS</th>
                <th className="text-right py-1">EXTEND</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-1">{item.quantity}</td>
                  <td className="py-1">{item.product.name}</td>
                  <td className="text-right py-1">
                    {(item.quantity * item.unit_price).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-black">
                <td colSpan={2} className="py-1">SUB TOTAL</td>
                <td className="text-right py-1">{sale.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-1 uppercase">{paymentDetails.paymentMethod} PAYMENT</td>
                <td className="text-right py-1">₦{paymentDetails.receivedAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="space-y-1">
            <p>RECEIPT# {receiptNumber}</p>
            <p>DATE {new Date().toLocaleString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
            })}</p>
            <p>CUSTOMER: {sale.customer.name || 'DEFAULT CUSTOMER'}</p>
            <p>OUTSTANDING: ₦{paymentDetails.payingAmount - paymentDetails.receivedAmount}</p>
            <p>CHANGE: ₦{paymentDetails.changeReturn}</p>
            <p>LOYALTY: 0</p>
            <p>CASHIER: Nuriyat</p>
          </div>

          <div className="text-center pt-2 border-t border-black">
            <p>.....Thanks for your patronage</p>
          </div>
        </div>
        <div className="flex justify-end print:hidden">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

