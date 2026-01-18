import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getExpenses, deleteExpense, type Expense } from '@/database/expenses';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Trash2, Receipt, Calendar, Tag, CreditCard, Calculator, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const expensesPerPage = 10;

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load expenses"
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastExpense = currentPage * expensesPerPage;
  const indexOfFirstExpense = indexOfLastExpense - expensesPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
  const totalPages = Math.ceil(filteredExpenses.length / expensesPerPage);

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-50/50"
    >
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">Expenses</h1>
              <p className="text-slate-500 font-medium tracking-tight">Track and manage your business expenditures</p>
            </div>
            <Link to="/dashboard/expenses/create">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs h-12 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Record New Expense
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expenditure</p>
                  <p className="text-2xl font-black text-slate-900">₦{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Count</p>
                  <p className="text-2xl font-black text-slate-900">{filteredExpenses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Category</p>
                  <p className="text-2xl font-black text-slate-900">{expenses[0]?.category || 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by description or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading expenses...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Description</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Category</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {currentExpenses.map((expense, index) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-slate-50/50 border-slate-50 transition-colors"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            <p className="text-xs font-bold text-slate-700">{format(new Date(expense.created_at), 'MMM dd, yyyy')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="font-bold text-slate-900 text-sm leading-tight">{expense.description}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-slate-50 text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-600 px-2 h-5">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <p className="font-black text-slate-900 text-sm">₦{expense.amount.toLocaleString()}</p>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white border-slate-200">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-slate-900 font-black uppercase tracking-widest text-sm">Delete Expense Record</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-500 text-xs font-medium">
                                    Are you sure you want to delete this expense of <span className="text-slate-900 font-bold">₦{expense.amount.toLocaleString()}</span> for <span className="text-slate-900 font-bold">{expense.description}</span>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 border-none bg-transparent">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        await deleteExpense(expense.id);
                                        await loadExpenses();
                                        toast({
                                          title: "Success",
                                          description: "Expense deleted successfully"
                                        });
                                      } catch (error) {
                                        toast({
                                          variant: "destructive",
                                          title: "Error",
                                          description: "Failed to delete expense"
                                        });
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest h-10"
                                  >
                                    Confirm Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Receipt className="w-12 h-12 text-slate-100" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No expenses found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 p-0 text-[10px] font-black ${currentPage === i + 1
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-900"
                  }`}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
