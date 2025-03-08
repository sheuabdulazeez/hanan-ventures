import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { TCustomer } from "@/types/database"
import { format } from "date-fns"

interface CustomerDetailsProps {
  customer: TCustomer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetails({ customer, open, onOpenChange }: CustomerDetailsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Customer Details</SheetTitle>
          <SheetDescription>
            View detailed information about {customer.name}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <h4 className="text-sm font-medium">Name</h4>
            <p className="text-sm text-gray-500">{customer.name}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Email</h4>
            <p className="text-sm text-gray-500">{customer.email || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Phone</h4>
            <p className="text-sm text-gray-500">{customer.phone || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Address</h4>
            <p className="text-sm text-gray-500">{customer.address || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium">Created At</h4>
            <p className="text-sm text-gray-500">
              {format(new Date(customer.created_at), 'PPpp')}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}