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
import { ChevronDown, Search, ArrowUpDown, AlertTriangle, Users, DollarSign, Clock, TrendingUp, Filter, Calendar, Eye, CreditCard } from "lucide-react";
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
import { getDebtors, getDebtorPayments } from "@/database/debtors";
import { TDebtor, TDebtorPayment } from "@/types/database";

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

    try {
      const payments = await getDebtorPayments(debtor.id);
      setDebtorPayments(payments);
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
        debtor_id: selectedDebtor.id,
        amount_paid: Number(paymentAmount),
        payment_method: paymentMethod,
        bank_name: bankName,
        payment_date: new Date().toDateString(),
        employee_id: auth?.user?.id, // Replace with actual logged-in user ID
      });

      // Refresh debtors and payments data
      const [updatedDebtors, updatedPayments] = await Promise.all([
        getDebtors(),
        getDebtorPayments(selectedDebtor.id),
      ]);

      setDebtors(updatedDebtors);
      setDebtorPayments(updatedPayments);
      
      // Update selected debtor with new amount
      const updatedDebtor = updatedDebtors.find(d => d.id === selectedDebtor.id);
      if (updatedDebtor) {
        setSelectedDebtor(updatedDebtor);
        setLastPayment({
          ...paymentDetails,
          debtor: updatedDebtor,
        });
      }

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
        description: "Failed to record payment. Please try again.",
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
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"
    >
      {/* Enhanced Header Section */}
      <div className="text-black">
        <div className="container mx-auto px-6 py-12">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-black to-blue-400 bg-clip-text text-transparent">
                Debtors Management
              </h1>
              <p className="text-blue-500 text-lg font-medium">
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
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">
                Total Outstanding Debt
              </CardTitle>
              <div className="p-2 bg-red-500 rounded-full">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">₦{totalDebt.toLocaleString()}</div>
              <p className="text-sm text-red-500 font-medium mt-1">
                {debtors.length} active debtors
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Low Risk Debtors
              </CardTitle>
              <div className="p-2 bg-green-500 rounded-full">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Low").length}
              </div>
              <p className="text-sm text-green-500 font-medium mt-1">
                {((filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Low").length / (filteredDebtors.length || 1)) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">
                Medium Risk Debtors
              </CardTitle>
              <div className="p-2 bg-yellow-500 rounded-full">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Medium").length}
              </div>
              <p className="text-sm text-yellow-500 font-medium mt-1">
                {((filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "Medium").length / (filteredDebtors.length || 1)) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                High Risk Debtors
              </CardTitle>
              <div className="p-2 bg-purple-500 rounded-full">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "High").length}
              </div>
              <p className="text-sm text-purple-500 font-medium mt-1">
                {((filteredDebtors.filter((d) => getRiskLevel(d.amount_owed) === "High").length / (filteredDebtors.length || 1)) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Debtors List</TabsTrigger>
          <TabsTrigger value="chart">Risk Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-blue-900">Debtors List</CardTitle>
                      <p className="text-sm text-blue-600 mt-1">Manage and track all customer debts</p>
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
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search debtors by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
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

                <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150">
                        <TableHead className="w-[280px] font-semibold text-gray-700">Debtor Information</TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("amount")}
                            className="hover:bg-white/50"
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Amount Owed
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("dueDate")}
                            className="hover:bg-white/50"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Due Date
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">Risk Assessment</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
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
                            className="hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-100"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12 ring-2 ring-blue-100">
                                  <AvatarImage
                                    src={`https://api.dicebear.com/6.x/initials/svg?seed=${debtor.customer_name}`}
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                                    {debtor.customer_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-gray-900 text-base">
                                    {debtor.customer_name}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center mt-1">
                                    <CreditCard className="mr-1 h-3 w-3" />
                                    ID: {debtor.customer_id.substring(0, 8)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="font-bold text-lg text-red-600">
                                ₦{debtor.amount_owed.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Outstanding debt
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="font-medium text-gray-900">
                                {format(new Date(debtor.due_date), "MMM dd, yyyy")}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                {new Date(debtor.due_date) < new Date() ? "Overdue" : "Pending"}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge
                                className={`font-medium px-3 py-1 ${
                                  getRiskLevel(debtor.amount_owed) === "Low"
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : getRiskLevel(debtor.amount_owed) === "Medium"
                                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                {getRiskLevel(debtor.amount_owed) === "Low" && "🟢"}
                                {getRiskLevel(debtor.amount_owed) === "Medium" && "🟡"}
                                {getRiskLevel(debtor.amount_owed) === "High" && "🔴"}
                                {getRiskLevel(debtor.amount_owed)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(debtor)}
                                className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
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
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-purple-900">Debtors Risk Analysis</CardTitle>
                    <p className="text-sm text-purple-600 mt-1">Visual breakdown of debt risk levels</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Low Risk</p>
                          <p className="text-2xl font-bold text-green-600">
                            {getDebtorsChartData().find(d => d.risk === 'Low')?.count || 0}
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">L</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-700">Medium Risk</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {getDebtorsChartData().find(d => d.risk === 'Medium')?.count || 0}
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">M</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700">High Risk</p>
                          <p className="text-2xl font-bold text-red-600">
                            {getDebtorsChartData().find(d => d.risk === 'High')?.count || 0}
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">H</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Risk Distribution Chart
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getDebtorsChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis 
                        dataKey="risk" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Debtor Details</SheetTitle>
            <SheetDescription>
              Detailed information about the selected debtor.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {selectedDebtor && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 mt-6"
              >
                {/* Header Section */}
                <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-20 h-20 ring-4 ring-blue-100 dark:ring-blue-900">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${selectedDebtor.customer_name}`}
                        />
                        <AvatarFallback className="bg-blue-500 text-white text-lg font-bold">
                          {selectedDebtor.customer_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedDebtor.customer_name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground font-mono">
                            ID: {selectedDebtor.customer_id.substring(0, 8)}
                          </p>
                        </div>
                        <Badge 
                          variant={selectedDebtor.amount_owed > 50000 ? "destructive" : selectedDebtor.amount_owed > 20000 ? "default" : "secondary"}
                          className="mt-2"
                        >
                          {selectedDebtor.amount_owed > 50000 ? "High Risk" : selectedDebtor.amount_owed > 20000 ? "Medium Risk" : "Low Risk"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Total Debt
                          </p>
                          <p className="font-bold text-red-600">
                            ₦{selectedDebtor.amount_owed.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Due Date
                          </p>
                          <p className="font-bold text-orange-600">
                            {format(selectedDebtor.due_date, "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Button */}
                <Card>
                  <CardContent className="p-6">
                    <Button
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      onClick={() => setShowPaymentDialog(true)}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Record Payment
                    </Button>
                  </CardContent>
                </Card>
                {/* Payment History */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    <CardTitle className="flex items-center text-lg font-semibold">
                      <Clock className="w-5 h-5 mr-2" />
                      Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {debtorPayments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-800">
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Method</TableHead>
                            <TableHead className="font-semibold">Cashier</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {debtorPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).map((payment, index) => (
                            <motion.tr 
                              key={payment.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <TableCell className="font-medium">
                                {format(
                                  new Date(payment.payment_date),
                                  "MMM dd, yyyy"
                                )}
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                ₦{payment.amount_paid.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {payment.payment_method}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {payment.employee_name}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No payment history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Debt Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedDebtor?.customer_name}'s debt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                max={selectedDebtor?.amount_owed}
              />
            </div>
            <div>
              <Label htmlFor="method">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value: "cash" | "transfer" | "pos") =>
                  setPaymentMethod(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod !== "cash" && (
              <div>
                <Label htmlFor="bank">Bank Name</Label>
                <Input
                  id="bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>
            )}
            {lastPayment ? (
              // Success state with print receipt option
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-semibold">Payment Recorded Successfully!</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    ₦{lastPayment.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} payment recorded for {lastPayment.debtor.customer_name}
                  </p>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPaymentDialog(false);
                      setLastPayment(null);
                    }}
                  >
                    Close
                  </Button>
                  <PrintPaymentReceiptButton
                    debtor={lastPayment.debtor}
                    payment={lastPayment}
                  />
                </div>
              </div>
            ) : (
              // Normal payment form
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setLastPayment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={
                    !paymentAmount ||
                    Number(paymentAmount) <= 0 ||
                    Number(paymentAmount) > (selectedDebtor?.amount_owed || 0)
                  }
                >
                  Record Payment
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}