"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Input } from "@components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet";
import { ScrollArea } from "@components/ui/scroll-area";
import { ChevronDown, Search, ArrowUpDown, AlertTriangle, Users, DollarSign, Clock, TrendingUp, Filter, Calendar, Eye, CreditCard, Plus, CheckCircle2 } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { getDebtors, getDebtorPayments, getCustomerOpenDebts } from "@/database/debtors";
import { TDebtor, TDebtorPayment, TDebtorSale } from "@/types/database";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@components/ui/dialog";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { recordDebtPayment } from "@/database/debtors";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { PrintDebtorsListButton } from "@/components/PrintDebtorsListButton";
import PrintPaymentReceiptButton from "@/components/PrintPaymentReceiptButton";

type SortKey = "name" | "amount" | "dueDate";

const riskLevels = ["Low", "Medium", "High"];

const BarChartAny = BarChart as any;
const BarAny = Bar as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const TooltipAny = Tooltip as any;
const ResponsiveContainerAny = ResponsiveContainer as any;

// Mock data for debtor details
const mockDebtorDetails = {
  salesHistory: [
    { id: "1", date: "2025-01-01", amount: 100 },
    { id: "2", date: "2025-01-15", amount: 150 },
    { id: "3", date: "2025-02-01", amount: 200 },
  ],
};

export default function DebtorsPage() {
  const { auth } = useAppStore()
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedDebtor, setSelectedDebtor] = useState<TDebtor | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [debtors, setDebtors] = useState<TDebtor[]>([]);
  const [debtorPayments, setDebtorPayments] = useState<TDebtorPayment[]>([]);
  const [debtorSales, setDebtorSales] = useState<TDebtorSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "pos"
  >("cash");
  const [bankName, setBankName] = useState("");
  const [lastPayment, setLastPayment] = useState<{
    debtor: TDebtor;
    amount: number;
    method: "cash" | "transfer" | "pos";
    bankName?: string;
    employeeName: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        const data = await getDebtors();
        setDebtors(data);
      } catch (error) {
        console.error("Error fetching debtors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebtors();
  }, []);

  const handleViewDetails = async (debtor: TDebtor) => {
    setSelectedDebtor(debtor);
    setIsDrawerOpen(true);

    setDebtorPayments([]);
    setDebtorSales([]);
    try {
      // debtor.id is the customer id: debt is aggregated per customer.
      const [payments, sales] = await Promise.all([
        getDebtorPayments(debtor.customer_id),
        getCustomerOpenDebts(debtor.customer_id),
      ]);
      setDebtorPayments(payments);
      setDebtorSales(sales);
    } catch (error) {
      console.error("Error fetching debtor payments:", error);
    }
  };
  // Add payment handling function
  const handlePayment = async () => {
    try {
      if (!selectedDebtor) return;

      // Store payment details for receipt printing
      const paymentDetails = {
        debtor: selectedDebtor,
        amount: Number(paymentAmount),
        method: paymentMethod,
        bankName: bankName || undefined,
        employeeName: auth?.user?.name || "Unknown",
      };

      await recordDebtPayment({
        customer_id: selectedDebtor.customer_id,
        amount_paid: Number(paymentAmount),
        payment_method: paymentMethod,
        bank_name: bankName,
        payment_date: new Date().toISOString(),
        employee_id: auth?.user?.id,
      });

      // Refresh debtors, payments and the customer's open sales
      const [updatedDebtors, updatedPayments, updatedSales] = await Promise.all([
        getDebtors(),
        getDebtorPayments(selectedDebtor.customer_id),
        getCustomerOpenDebts(selectedDebtor.customer_id),
      ]);

      setDebtors(updatedDebtors);
      setDebtorPayments(updatedPayments);
      setDebtorSales(updatedSales);

      // A customer who just cleared their debt drops out of the list, so fall
      // back to a zero balance instead of losing the receipt.
      const updatedDebtor =
        updatedDebtors.find(d => d.customer_id === selectedDebtor.customer_id) ||
        { ...selectedDebtor, amount_owed: 0 };
      setSelectedDebtor(updatedDebtor);
      setLastPayment({
        ...paymentDetails,
        debtor: updatedDebtor,
      });

      // Don't close dialog immediately - show success state with print option
      setPaymentAmount("");
      setPaymentMethod("cash");
      setBankName("");

      toast({
        title: "Payment Recorded",
        description: "The debt payment has been successfully recorded.",
      });
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalDebt = debtors.reduce(
    (sum, debtor) => sum + debtor.amount_owed,
    0
  );

  const sortedDebtors = [...debtors].sort((a, b) => {
    if (sortKey === "name") {
      return sortOrder === "asc"
        ? a.customer_name.localeCompare(b.customer_name)
        : b.customer_name.localeCompare(a.customer_name);
    } else if (sortKey === "amount") {
      return sortOrder === "asc"
        ? a.amount_owed - b.amount_owed
        : b.amount_owed - a.amount_owed;
    } else {
      return sortOrder === "asc"
        ? new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        : new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
    }
  });

  const filteredDebtors = sortedDebtors.filter((debtor) =>
    debtor.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    debtor.customer_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const getRiskLevel = (amount: number) => {
    if (amount < 10000) return "Low";
    if (amount < 50000) return "Medium";
    return "High";
  };

  const getDebtorsChartData = () => {
    return riskLevels.map((level) => ({
      risk: level,
      count: filteredDebtors.filter(
        (d) => getRiskLevel(d.amount_owed) === level
      ).length,
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-50/50"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">
                Debtors Management
              </h1>
              <p className="text-slate-500 font-medium tracking-tight">
                Track, manage, and analyze your outstanding debts
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PrintDebtorsListButton debtors={debtors} />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">

        {/* Enhanced Statistics Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8"
        >
          <Card className="bg-white border-slate-200 hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Total Outstanding Debt
              </CardTitle>
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">₦{totalDebt.toLocaleString()}</div>
              <p className="text-xs text-red-600 font-bold mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-50">
                {debtors.length} active debtors
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Low Risk Debtors
              </CardTitle>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Low").length}
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50">
                {((filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Low").length / (filteredDebtors.length || 1)) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Medium Risk Debtors
              </CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Medium").length}
              </div>
              <p className="text-xs text-amber-600 font-bold mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50">
                {((filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Medium").length / (filteredDebtors.length || 1)) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                High Risk Debtors
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">
                {filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "High").length}
              </div>
              <p className="text-xs text-purple-600 font-bold mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50">
                {((filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "High").length / (filteredDebtors.length || 1)) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="list" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Debtors List</TabsTrigger>
            <TabsTrigger value="chart" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Risk Analysis</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-sm border border-slate-200 bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-900 rounded-lg text-white">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-slate-900">Debtors List</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Manage and track all customer debts</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {filteredDebtors.length} Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search debtors by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white text-slate-900"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 px-6 border-gray-200 hover:bg-gray-50">
                          <Filter className="mr-2 h-4 w-4" />
                          Sort by {sortKey}
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuCheckboxItem
                          checked={sortKey === "name"}
                          onCheckedChange={() => handleSort("name")}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Name
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={sortKey === "amount"}
                          onCheckedChange={() => handleSort("amount")}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Amount
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={sortKey === "dueDate"}
                          onCheckedChange={() => handleSort("dueDate")}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Due Date
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-[280px] font-black text-[10px] uppercase tracking-wider text-slate-500 py-4">Debtor Information</TableHead>
                          <TableHead className="">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort("amount")}
                              className="hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500"
                            >
                              <DollarSign className="mr-2 h-3 w-3" />
                              Amount Owed
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="">
                            <Button
                              variant="ghost"
                              onClick={() => handleSort("dueDate")}
                              className="hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500"
                            >
                              <Calendar className="mr-2 h-3 w-3" />
                              Due Date
                              <ArrowUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-500">Risk Assessment</TableHead>
                          <TableHead className="text-right font-black text-[10px] uppercase tracking-wider text-slate-500 px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredDebtors.map((debtor, index) => (
                            <motion.tr
                              key={debtor.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="hover:bg-slate-50/80 transition-colors duration-200 border-b border-slate-100"
                            >
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-4">
                                  <Avatar className="h-10 w-10 border border-slate-200">
                                    <AvatarImage
                                      src={`https://api.dicebear.com/6.x/initials/svg?seed=${debtor.customer_name}`}
                                    />
                                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-xs">
                                      {debtor.customer_name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-slate-900">
                                      {debtor.customer_name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5">
                                      <CreditCard className="mr-1 h-3 w-3" />
                                      {debtor.customer_id.substring(0, 8)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-black text-slate-900">
                                  ₦{debtor.amount_owed.toLocaleString()}
                                </div>
                                <div className="text-[9px] font-black uppercase text-red-500 mt-0.5 tracking-wider">
                                  Outstanding
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="font-bold text-slate-700 text-sm">
                                  {format(new Date(debtor.due_date), "MMM dd, yyyy")}
                                </div>
                                <div className={`text-[10px] font-black uppercase mt-1 flex items-center ${new Date(debtor.due_date) < new Date() ? 'text-red-600' : 'text-slate-400'}`}>
                                  <Clock className="mr-1 h-3 w-3" />
                                  {new Date(debtor.due_date) < new Date() ? "Overdue" : "Pending"}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge
                                  variant="secondary"
                                  className={`font-black text-[9px] uppercase tracking-wider px-2.5 py-1 ${getRiskLevel(debtor.amount_owed) === "Low"
                                    ? "bg-emerald-50 text-emerald-700 border-none"
                                    : getRiskLevel(debtor.amount_owed) === "Medium"
                                      ? "bg-amber-50 text-amber-700 border-none"
                                      : "bg-red-50 text-red-700 border-none"
                                    }`}
                                >
                                  {getRiskLevel(debtor.amount_owed)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-4 px-6">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(debtor)}
                                  className="h-8 border-slate-200 hover:bg-slate-900 hover:text-white transition-all duration-200 text-[10px] font-black uppercase tracking-wider"
                                >
                                  <Eye className="mr-2 h-3.5 w-3.5" />
                                  Details
                                </Button>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                    {filteredDebtors.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No debtors found</h3>
                        <p className="text-gray-500">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
          <TabsContent value="chart">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-sm border border-slate-200 bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-900 rounded-lg text-white">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900">Risk Analysis</CardTitle>
                      <p className="text-xs text-slate-500 mt-1">Visual breakdown of debt risk levels</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Low Risk</p>
                            <p className="text-2xl font-black text-slate-900">
                              {getDebtorsChartData().find(d => d.risk === 'Low')?.count || 0}
                            </p>
                          </div>
                          <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-black">L</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Medium Risk</p>
                            <p className="text-2xl font-black text-slate-900">
                              {getDebtorsChartData().find(d => d.risk === 'Medium')?.count || 0}
                            </p>
                          </div>
                          <div className="h-8 w-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-black">M</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">High Risk</p>
                            <p className="text-2xl font-black text-slate-900">
                              {getDebtorsChartData().find(d => d.risk === 'High')?.count || 0}
                            </p>
                          </div>
                          <div className="h-8 w-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-black">H</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center uppercase tracking-widest">
                      <TrendingUp className="mr-2 h-4 w-4 text-slate-400" />
                      Risk Distribution
                    </h3>
                    <ResponsiveContainerAny width="100%" height={350}>
                      <BarChartAny data={getDebtorsChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxisAny
                          dataKey="risk"
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxisAny
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <TooltipAny
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <BarAny
                          dataKey="count"
                          fill="#0f172a"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChartAny>
                    </ResponsiveContainerAny>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="bg-slate-50 border-l border-slate-200 sm:max-w-md p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="p-6 bg-white border-b border-slate-100">
              <SheetTitle className="text-xl font-black text-slate-900">Debtor Details</SheetTitle>
              <SheetDescription className="text-slate-500">
                Detailed information and payment history.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {selectedDebtor && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Header Card */}
                    <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <Avatar className="w-16 h-16 border-2 border-slate-100">
                            <AvatarImage
                              src={`https://api.dicebear.com/6.x/initials/svg?seed=${selectedDebtor.customer_name}`}
                            />
                            <AvatarFallback className="bg-slate-100 text-slate-900 text-lg font-black">
                              {selectedDebtor.customer_name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="text-xl font-black text-slate-900">
                              {selectedDebtor.customer_name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <p className="text-[10px] text-slate-400 font-mono tracking-tighter">
                                ID: {selectedDebtor.customer_id.substring(0, 8)}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="mt-2 text-[10px] uppercase font-black tracking-wider bg-slate-100 text-slate-600"
                            >
                              {selectedDebtor.amount_owed > 50000 ? "High Risk" : selectedDebtor.amount_owed > 20000 ? "Medium Risk" : "Low Risk"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="border border-slate-200 bg-white">
                        <CardContent className="p-4">
                          <p className="text-[9px] font-black uppercase text-slate-400 flex items-center mb-1">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Total Debt
                          </p>
                          <p className="text-xl font-black text-red-600">
                            ₦{selectedDebtor.amount_owed.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-200 bg-white">
                        <CardContent className="p-4">
                          <p className="text-[9px] font-black uppercase text-slate-400 flex items-center mb-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            Due Date
                          </p>
                          <p className="text-xl font-black text-slate-900">
                            {format(new Date(selectedDebtor.due_date), "MMM dd")}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Record Payment Button */}
                    <Button
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-100"
                      onClick={() => setShowPaymentDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Record Payment
                    </Button>

                    {/* Open credit sales */}
                    <Card className="border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <CardHeader className="bg-slate-50 p-4 border-b border-slate-200">
                        <CardTitle className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-900">
                          <CreditCard className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          Credit Sales ({debtorSales.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {debtorSales.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10 px-4">Sale</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10">On credit</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10">Balance</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10 px-4 text-right">Due</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {debtorSales.map((sale) => (
                                <TableRow key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                  <TableCell className="text-xs font-bold text-slate-700 px-4">
                                    <div>#{sale.sale_id.substring(0, 8)}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{format(new Date(sale.sale_date.replace(" ", "T") + "Z"), "MMM dd, yyyy")}</div>
                                  </TableCell>
                                  <TableCell className="text-xs font-bold text-slate-500">₦{sale.original_amount.toLocaleString()}</TableCell>
                                  <TableCell className="text-xs font-black text-red-600">₦{sale.amount_owed.toLocaleString()}</TableCell>
                                  <TableCell className="text-xs font-bold text-slate-500 px-4 text-right">{sale.due_date ? format(new Date(sale.due_date.replace(" ", "T") + "Z"), "MMM dd") : "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-6 text-center text-xs font-black uppercase tracking-widest text-slate-300">No open credit sales</div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Payment History */}
                    <Card className="border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <CardHeader className="bg-slate-50 p-4 border-b border-slate-200">
                        <CardTitle className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-900">
                          <Clock className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          Payment History
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {debtorPayments.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/50 border-b border-slate-100">
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10 px-4">Date</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10">Amount</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400 h-10 px-4 text-right">Method</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {debtorPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((payment) => (
                                <TableRow key={payment.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                  <TableCell className="text-xs font-bold text-slate-700 px-4">
                                    {format(new Date(payment.payment_date), "MMM dd")}
                                  </TableCell>
                                  <TableCell className="text-xs font-black text-emerald-600">
                                    ₦{payment.amount_paid.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right px-4">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-slate-50 border-slate-200 h-5">
                                      {payment.payment_method}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-12 text-center text-slate-400">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-40">No records</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showPaymentDialog} onOpenChange={(status) => {
        setShowPaymentDialog(status);
        if (!status) {
          setPaymentAmount("");
          setPaymentMethod("cash");
          setBankName("");
          setLastPayment(null);
        }
      }}>
        <DialogContent className="bg-white border-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Record Payment</DialogTitle>
            <DialogDescription className="text-slate-500">
              Submit a payment record for this debtor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-12 bg-slate-50 border-slate-200 focus:bg-white text-lg font-black text-slate-900"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Method</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:bg-white font-bold text-slate-700">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="cash" className="font-bold">Cash</SelectItem>
                  <SelectItem value="transfer" className="font-bold">Transfer</SelectItem>
                  <SelectItem value="pos" className="font-bold">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod !== 'cash' && (
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Bank Name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Recipient bank"
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white font-bold"
                />
              </div>
            )}

            {lastPayment ? (
              <div className="space-y-4 pt-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-black text-sm uppercase tracking-tight">Confirmed</span>
                  </div>
                  <p className="text-xs text-emerald-600 font-bold mt-2">
                    ₦{lastPayment.amount.toLocaleString()} recorded successfully.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 font-black uppercase text-[10px]" onClick={() => setShowPaymentDialog(false)}>Close</Button>
                  <PrintPaymentReceiptButton debtor={lastPayment.debtor} payment={lastPayment} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-4">
                <Button
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs"
                  onClick={handlePayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                >
                  Record Payment
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-600 font-bold text-xs"
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}