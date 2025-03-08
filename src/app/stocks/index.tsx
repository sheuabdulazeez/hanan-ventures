import { getProducts } from '@/database/products';
import { TProduct } from '@/types/database';
import { useEffect, useState } from 'react';
import { FaTrash, FaFileExport, FaFileImport, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router';

export default function Stocks() {
  const [products, setProducts] = useState<TProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemPerPage = 10;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const handleDelete = (id: string) => {
    // TODO: handle delete
  };

  useEffect(() => {
    getProducts().then(res => {
      setProducts(res);
    })
  }, [])
  
  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(filteredProducts.length / itemPerPage);
  const maxPageButtons = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Stocks / Inventory</h1>
        <div className="space-x-2 flex">
          {/* Add Product Button Link */}
          <Link to="/dashboard/stocks/create" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition duration-300">
          <FaPlus className="mr-2" /> Add Product
        </Link>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 w-full"
        />
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity on Hand</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentProducts.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₦{p.cost_price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₦{p.selling_price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.quantity_on_hand}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
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
