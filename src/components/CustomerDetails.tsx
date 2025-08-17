import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TCustomer } from "@/types/database";
import { format } from "date-fns";
import { getCustomerDebtHistory } from "@/database/debtors";
import { updateCustomer } from "@/database/customers";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { PrintDebtStatementButton } from "./PrintDebtStatementButton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X } from "lucide-react";

interface CustomerDetailsProps {
  customer: TCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdate?: (updatedCustomer: TCustomer) => void;
}

export function CustomerDetails({
  customer,
  open,
  onOpenChange,
  onCustomerUpdate,
}: CustomerDetailsProps) {
  const [debtHistory, setDebtHistory] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: customer.name,
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open && customer) {
      loadDebtHistory();
    }
  }, [open, customer]);

  useEffect(() => {
    setEditForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setIsEditing(false);
  }, [customer]);

  async function loadDebtHistory() {
    try {
      const history = await getCustomerDebtHistory(customer.id);
      setDebtHistory(history);
    } catch (error) {
      console.error("Failed to load debt history:", error);
    }
  }

  async function handleSaveEdit() {
    try {
      await updateCustomer(customer.id, editForm);
      const updatedCustomer = { ...customer, ...editForm };
      onCustomerUpdate?.(updatedCustomer);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Customer information updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer information.",
        variant: "destructive",
      });
    }
  }

  function handleCancelEdit() {
    setEditForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setIsEditing(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <SheetTitle>Customer Details</SheetTitle>
            {!isEditing ? (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setIsEditing(true)}
                 data-edit-button
               >
                 <Edit className="h-4 w-4 mr-2" />
                 Edit
               </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
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
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            placeholder="Enter address"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="text-lg font-semibold">{customer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Phone Number
                        </p>
                        <p className="text-lg font-semibold">{customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-lg font-semibold">
                          {customer.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="text-lg font-semibold">
                          {customer.address || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Created At
                        </p>
                        <p className="text-lg font-semibold">
                          {format(new Date(customer.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="debt" className="h-screen">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Debt History</h3>
              <PrintDebtStatementButton 
                customer={customer} 
                debtHistory={debtHistory}
              />
            </div>
            <ScrollArea className="h-[98vh] pb-32">
              <div className="space-y-4">
                {debtHistory.length > 0 ? (
                  debtHistory.map((debt) => (
                    <Card key={debt.id}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-medium">
                            Debt Record
                          </CardTitle>
                          <Badge
                            variant={debt.is_paid ? "default" : "destructive"}
                          >
                            {debt.is_paid ? "Paid" : "Outstanding"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Original Amount
                              </p>
                              <p className="text-lg font-semibold">
                                ₦{debt.amount_owed.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Due Date
                              </p>
                              <p className="text-lg">
                                {format(new Date(debt.due_date), "MMM dd, yyyy")}
                              </p>
                            </div>
                          </div>

                          {debt.payments && debt.payments.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">
                                Payment History
                              </h4>
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
                                  {debt.payments
                                    ?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                                    .map((payment: any) => (
                                    <TableRow key={payment.id}>
                                      <TableCell>
                                        {format(
                                          new Date(payment.payment_date),
                                          "MMM dd, yyyy"
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        ₦{payment.amount_paid.toFixed(2)}
                                      </TableCell>
                                      <TableCell>
                                        {payment.payment_method}
                                      </TableCell>
                                      <TableCell>
                                        {payment.employee_name}
                                      </TableCell>
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
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
