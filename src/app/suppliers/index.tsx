import { useEffect, useState } from 'react';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router';
import { getSuppliers, deleteSupplier, type Supplier } from '@/database/suppliers';
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
import { Search, Plus, Trash2, Package, User, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const suppliersPerPage = 10;

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load suppliers"
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastSupplier = currentPage * suppliersPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - suppliersPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);
  const totalPages = Math.ceil(filteredSuppliers.length / suppliersPerPage);

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
              <h1 className="text-4xl font-black text-slate-900 mb-2">Suppliers</h1>
              <p className="text-slate-500 font-medium tracking-tight">Manage your product sources and partners</p>
            </div>
            <Link to="/dashboard/suppliers/create">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs h-12 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Add New Supplier
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-sm font-medium"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Package className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">{filteredSuppliers.length} Total</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading suppliers...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 px-6">Supplier</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Contact Person</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Contact Details</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12">Address</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 text-right px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {currentSuppliers.map((supplier, index) => (
                      <motion.tr
                        key={supplier.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-slate-50/50 border-slate-50 transition-colors"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm leading-tight">{supplier.supplier_name}</p>
                              <p className="text-[10px] font-medium text-slate-400 tracking-tight flex items-center mt-1">
                                <Calendar className="w-3 h-3 mr-1" />
                                Since {format(new Date(supplier.created_at), 'MMM yyyy')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-300" />
                            <p className="text-xs font-bold text-slate-700">{supplier.contact_person || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 w-3 text-slate-300" />
                              <p className="text-[10px] font-bold text-slate-600">{supplier.phone || "N/A"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 w-3 text-slate-300" />
                              <p className="text-[10px] font-medium text-slate-400">{supplier.email || "N/A"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-start gap-2 max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{supplier.address || "No address listed"}</p>
                          </div>
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
                                  <AlertDialogTitle className="text-slate-900 font-black uppercase tracking-widest text-sm">Delete Supplier</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-500 text-xs font-medium">
                                    Are you sure you want to delete <span className="text-slate-900 font-bold">{supplier.supplier_name}</span>? This action is permanent and cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 border-none bg-transparent">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        await deleteSupplier(supplier.id);
                                        await loadSuppliers();
                                        toast({
                                          title: "Success",
                                          description: "Supplier deleted successfully"
                                        });
                                      } catch (error) {
                                        toast({
                                          variant: "destructive",
                                          title: "Error",
                                          description: "Failed to delete supplier"
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
                  {filteredSuppliers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Package className="w-12 h-12 text-slate-100" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No suppliers found</p>
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
