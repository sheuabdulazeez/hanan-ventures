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
import { Edit, Save, X, User, Phone, Mail, MapPin, Calendar, Clock, DollarSign, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <SheetContent className="bg-slate-50 border-l border-slate-200 sm:max-w-2xl p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-black text-slate-900">Customer Details</SheetTitle>
                <SheetDescription className="text-slate-500 font-medium">Manage and view profile information</SheetDescription>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 border-slate-200"
                    onClick={() => setIsEditing(true)}
                    data-edit-button
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3.5 w-3.5 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white"
                      onClick={handleSaveEdit}
                    >
                      <Save className="h-3.5 w-3.5 mr-2" />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <div className="bg-white px-6 pb-0 border-b border-slate-100">
              <TabsList className="bg-transparent h-12 p-0 gap-6">
                <TabsTrigger
                  value="info"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 px-0 h-10"
                >
                  Information
                </TabsTrigger>
                <TabsTrigger
                  value="debt"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-slate-900 px-0 h-10"
                >
                  Debt History
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <AnimatePresence mode="wait">
                  <TabsContent value="info" className="mt-0 space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <Card className="border border-slate-200 bg-white shadow-sm">
                        <CardHeader className="p-6 border-b border-slate-50">
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                            <User className="w-3.5 h-3.5 mr-2" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white font-bold text-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</Label>
                                <Input
                                  value={editForm.phone}
                                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white font-bold text-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                                <Input
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white font-bold text-slate-700"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</Label>
                                <Input
                                  value={editForm.address}
                                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                  className="h-11 bg-slate-50 border-slate-200 focus:bg-white font-bold text-slate-700"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                  <User className="w-3 w-3 mr-1.5" /> Name
                                </p>
                                <p className="text-sm font-black text-slate-900">{customer.name}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                  <Phone className="w-3 w-3 mr-1.5" /> Phone
                                </p>
                                <p className="text-sm font-black text-slate-900">{customer.phone || "N/A"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                  <Mail className="w-3 w-3 mr-1.5" /> Email
                                </p>
                                <p className="text-sm font-black text-slate-900">{customer.email || "N/A"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                  <MapPin className="w-3 w-3 mr-1.5" /> Address
                                </p>
                                <p className="text-sm font-black text-slate-900">{customer.address || "N/A"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                                  <Calendar className="w-3 w-3 mr-1.5" /> Created At
                                </p>
                                <p className="text-sm font-black text-slate-900">{format(new Date(customer.created_at), "MMM dd, yyyy")}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="debt" className="mt-0">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-900 rounded-lg text-white">
                            <History className="h-4 w-4" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Debt Records</h3>
                        </div>
                        <PrintDebtStatementButton
                          customer={customer}
                          debtHistory={debtHistory}
                        />
                      </div>

                      <div className="space-y-4">
                        {debtHistory.length > 0 ? (
                          debtHistory.map((debt, index) => (
                            <motion.div
                              key={debt.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center m-0">
                                    <Clock className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                    Record #{debt.id.substring(0, 8)}
                                  </CardTitle>
                                  <Badge
                                    className={`text-[9px] font-black uppercase h-5 px-2 ${debt.is_paid
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : "bg-red-50 text-red-600 border-red-100"
                                      }`}
                                    variant="outline"
                                  >
                                    {debt.is_paid ? "Paid" : "Outstanding"}
                                  </Badge>
                                </CardHeader>
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-slate-50">
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black uppercase text-slate-400 flex items-center tracking-tighter">
                                        <DollarSign className="w-3 h-3 mr-1" /> Original Amount
                                      </p>
                                      <p className="text-xl font-black text-slate-900">
                                        ₦{debt.amount_owed.toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black uppercase text-slate-400 flex items-center tracking-tighter">
                                        <Calendar className="w-3 h-3 mr-1" /> Due Date
                                      </p>
                                      <p className="text-sm font-bold text-slate-700">
                                        {format(new Date(debt.due_date), "MMM dd, yyyy")}
                                      </p>
                                    </div>
                                  </div>

                                  {debt.payments && debt.payments.length > 0 && (
                                    <div className="space-y-3">
                                      <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900">
                                        Payment Logs
                                      </h4>
                                      <div className="rounded-lg border border-slate-100 overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-slate-50/50 h-8 border-slate-100">
                                              <TableHead className="text-[8px] font-black uppercase px-3">Date</TableHead>
                                              <TableHead className="text-[8px] font-black uppercase">Amount</TableHead>
                                              <TableHead className="text-[8px] font-black uppercase text-right px-3">Method</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {debt.payments
                                              ?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                                              .map((payment: any) => (
                                                <TableRow key={payment.id} className="h-10 hover:bg-slate-50/50 border-slate-50">
                                                  <TableCell className="text-[10px] font-bold text-slate-600 px-3">
                                                    {format(new Date(payment.payment_date), "MMM dd, yy")}
                                                  </TableCell>
                                                  <TableCell className="text-[10px] font-black text-emerald-600">
                                                    ₦{payment.amount_paid.toFixed(2)}
                                                  </TableCell>
                                                  <TableCell className="text-right px-3">
                                                    <Badge variant="secondary" className="text-[8px] font-black uppercase h-4 px-1 bg-slate-100 text-slate-500">
                                                      {payment.payment_method}
                                                    </Badge>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-200">
                            <History className="w-12 h-12 text-slate-100 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-300">No debt history records</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </TabsContent>
                </AnimatePresence>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
