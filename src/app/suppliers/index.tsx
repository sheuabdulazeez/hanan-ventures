import { useEffect, useState } from 'react';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router';
import { getSuppliers, deleteSupplier, type Supplier } from '@/database/suppliers';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
      setIsLoading(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load suppliers"
      });
      setIsLoading(false);
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteSupplier(id);
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
    }
  };

  const indexOfLastSupplier = currentPage * suppliersPerPage;
  const indexOfFirstSupplier = indexOfLastSupplier - suppliersPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstSupplier, indexOfLastSupplier);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(filteredSuppliers.length / suppliersPerPage);
  const maxPageButtons = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Suppliers</h1>
        <div className="space-x-2 flex">
          {/* Add Product Button Link */}
          <Link to="/dashboard/suppliers/create" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition duration-300">
          <FaPlus className="mr-2" /> Add Supplier
        </Link>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 w-full"
        />
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : currentSuppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">No suppliers found</td>
              </tr>
            ) : (
              currentSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.contact_person}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(supplier.created_at), 'PPpp')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-red-600 hover:text-red-900">
                          <FaTrash />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this supplier? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center mt-4">
        <nav>
          <ul className="inline-flex items-center -space-x-px">
            {Array.from({ length: endPage - startPage + 1 }, (_, index) => (
              <li key={index}>
                <button
                  onClick={() => paginate(startPage + index)}
                  className={`px-3 py-2 leading-tight ${currentPage === startPage + index ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'} border border-gray-300 hover:bg-gray-100 hover:text-gray-700`}
                >
                  {startPage + index}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
