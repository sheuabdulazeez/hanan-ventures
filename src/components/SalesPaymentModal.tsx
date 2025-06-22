import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { SALE_Sale } from "@/types/sales";
import { PaymentMethod, TSalePayment } from "@/types/database";
import { formatAmount } from "@/lib/utils";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SALE_Sale;
  onSubmit: (paymentDetails: PaymentDetails) => void;
}
// First, let's update the PaymentDetails interface
export type PaymentItem = Omit<TSalePayment, 'id'|'sale_id'> & {
  displayAmount?: string;
}

export interface PaymentDetails {
  saleId: string;
  receivedAmount: number;
  payingAmount: number;
  changeReturn: number;
  payments: PaymentItem[];
  paymentNotes: string;
  saleNotes: string;
}

// Now update the component
export function PaymentModal({
  isOpen,
  onClose,
  sale,
  onSubmit,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    saleId: sale.id,
    receivedAmount: 0,
    payingAmount: sale.total,
    changeReturn: -(sale.total - (sale.discount || 0)),
    payments: payments,
    paymentNotes: "",
    saleNotes: "",
  });

  // Add a function to handle payment changes
  const handlePaymentChange = (
    index: number,
    field: keyof PaymentItem,
    value: any
  ) => {
    const updatedPayments = [...payments];
    updatedPayments[index] = { ...updatedPayments[index], [field]: value };

    if (field === "amount") {
      const cleanValue = value.replace(/[^0-9]/g, "");
      // Remove all non-numeric characters
      value = cleanValue;
      updatedPayments[index][field] = parseFloat(value);

      const formattedValue = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      updatedPayments[index].displayAmount = formattedValue;
    }

    // Calculate total received amount
    const totalReceived = updatedPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    setPayments(updatedPayments);
    setPaymentDetails((prev) => ({
      ...prev,
      payments: updatedPayments,
      receivedAmount: totalReceived,
      changeReturn: totalReceived - (sale.total - (sale.discount || 0)),
    }));
  };

  // Add a function to add a new payment method
  const addPaymentMethod = () => {
    setPayments([
      ...payments,
      { payment_method: "cash", amount: 0, bank_name: "main", reference_number: '' },
    ]);
  };

  // Add a function to remove a payment method
  const removePaymentMethod = (index: number) => {
      const updatedPayments = payments.filter((_, i) => i !== index);

      // Calculate total received amount
      const totalReceived = updatedPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      );

      setPayments(updatedPayments);
      setPaymentDetails((prev) => ({
        ...prev,
        payments: updatedPayments,
        receivedAmount: totalReceived,
        changeReturn: totalReceived - (sale.total - (sale.discount || 0)),
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentDetails);
  };

  // Update the form to include multiple payment methods
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-md space-y-3">
                  {payments.map((payment, index) => (
                    <div key={index} className="border-b-2 pb-3">
                      <div className="flex justify-between items-center">
                        {/* {payments.length > 1 && ( */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePaymentMethod(index)}
                          >
                            Remove
                          </Button>
                        {/* )} */}
                      </div>
                      <div className="flex justify-between gap-1">
                        <div>
                          <Select
                            value={payment.payment_method}
                            onValueChange={(value) =>
                              handlePaymentChange(
                                index,
                                "payment_method",
                                value as PaymentMethod
                              )
                            }
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
                          <Input
                            type="text"
                            value={payment.displayAmount}
                            placeholder="Amount"
                            onChange={(e) => {
                              handlePaymentChange(
                                index,
                                "amount",
                                e.target.value
                              );
                            }}
                            className="text-right font-mono"
                          />
                        </div>
                      </div>

                      {/* {payment.payment_method !== "cash" && (
                        <>
                          <div>
                            <Label>Account</Label>
                            <Select
                              value={payment.bank_name || "main"}
                              onValueChange={(value) =>
                                handlePaymentChange(index, "bank_name", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose Account" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="main">
                                  Main Account
                                </SelectItem>
                                <SelectItem value="sales">
                                  Sales Account
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Reference Number</Label>
                            <Input
                              type="text"
                              value={payment.reference_number || ""}
                              onChange={(e) =>
                                handlePaymentChange(
                                  index,
                                  "reference_number",
                                  e.target.value
                                )
                              }
                              placeholder="Transaction reference"
                            />
                          </div>
                        </>
                      )} */}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addPaymentMethod}
                  className="w-full"
                >
                  Add Payment Method
                </Button>
              </div>

              <div>
                <Label>Total Received</Label>
                <Input
                  type="text"
                  value={formatAmount(paymentDetails.receivedAmount)}
                  readOnly
                  className="text-right font-mono font-bold"
                />
              </div>

              <div>
                <Label>Change Return</Label>
                <Input
                  type="text"
                  value={formatAmount(paymentDetails.changeReturn)}
                  readOnly
                  className="text-right font-mono"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Total Products</span>
                  <span>{sale.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{formatAmount(sale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>₦{formatAmount(sale.discount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total Payable</span>
                  <span>
                    ₦{formatAmount(sale.total - (sale.discount || 0))}
                  </span>
                </div>
              </div>

              {/* <div>
                <Label htmlFor="paymentNotes">Payment Notes</Label>
                <Textarea
                  id="paymentNotes"
                  value={paymentDetails.paymentNotes}
                  onChange={(e) =>
                    setPaymentDetails((prev) => ({
                      ...prev,
                      paymentNotes: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="saleNotes">Sale Notes</Label>
                <Textarea
                  id="saleNotes"
                  value={paymentDetails.saleNotes}
                  onChange={(e) =>
                    setPaymentDetails((prev) => ({
                      ...prev,
                      saleNotes: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div> */}
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              type="submit"
            >
              {payments.length === 0 ? "Add to Debtors" : "Submit Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
