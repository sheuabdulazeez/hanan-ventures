const TerminalModePage = () => {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Top Control Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Terminal Mode</h1>
        <div className="flex space-x-2">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Search</button>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Transfer</button>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Discount</button>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">New Sale</button>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Refund</button>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Cash Drawer</button>
        </div>
      </div>

      {/* Cart Panel (Left Sidebar) */}
      <div className="w-1/4 bg-gray-800 p-4 mt-16 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Cart</h2>
        {/* Cart items will go here */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
          <span className="text-xl font-bold">Total:</span>
          <span className="text-xl font-bold">$0.00</span>
        </div>
      </div>

      {/* Product Grid (Main Content) */}
      <div className="flex-1 p-4 mt-16 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Products</h2>
        {/* Product grid with pagination will go here */}
        <div className="grid grid-cols-3 gap-4">
          {/* Example Product Tile */}
          <div className="bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600">
            <h3 className="font-semibold">Product Name</h3>
            <p className="text-sm text-gray-400">Category</p>
            <p className="text-lg font-bold mt-2">$10.00</p>
          </div>
          {/* More product tiles */}
        </div>
        {/* Pagination controls */}
        <div className="flex justify-center mt-4">
          <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mx-1">Previous</button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mx-1">1</button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mx-1">2</button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded mx-1">Next</button>
        </div>
      </div>
    </div>
  );
};

export default TerminalModePage;