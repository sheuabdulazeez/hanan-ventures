import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { getProductById, getProductPriceHistory, getProductAnalytics, getProductInventoryHistory } from '@/database/products';
import { ProductAnalytics, TProduct, TProductPriceHistory, TInventoryAdjustment, InventoryAdjustmentType } from '@/types/database';
import { formatAmount } from '@/lib/utils';

const ProductAnalysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<TProduct | null>(null);
  const [priceHistory, setPriceHistory] = useState<TProductPriceHistory[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<TInventoryAdjustment[]>([]);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPriceHistory, setShowPriceHistory] = useState(true);

  useEffect(() => {
    const loadProductData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [productData, priceHistoryData, inventoryHistoryData, analyticsData] = await Promise.all([
          getProductById(id),
          getProductPriceHistory(id),
          getProductInventoryHistory(id),
          getProductAnalytics(id)
        ]);

        
        setProduct(productData);
        setPriceHistory(priceHistoryData);
        setInventoryHistory(inventoryHistoryData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error loading product data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading product analysis...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Product not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/stocks')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stocks
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>
        </div>
      </div>

      {/* Product Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.quantity_on_hand}</div>
            <p className="text-xs text-muted-foreground">
              Stock Value: {formatAmount(analytics?.salesData?.stockValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(product.cost_price)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selling Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(product.selling_price)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.salesData.totalProfit / analytics.salesData.totalRevenue * 100).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Sales Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.salesData?.totalSales}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.salesData?.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(analytics.salesData?.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(analytics.salesData?.totalProfit)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Profit/Sale</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(analytics?.salesData?.avgProfitPerSale||0)}</div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{showPriceHistory ? 'Price History' : 'Quantity History'}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${showPriceHistory ? 'font-medium' : 'text-gray-500'}`}>Price</span>
              <button
                onClick={() => setShowPriceHistory(!showPriceHistory)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {showPriceHistory ? (
                  <ToggleRight className="h-6 w-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                )}
              </button>
              <span className={`text-sm ${!showPriceHistory ? 'font-medium' : 'text-gray-500'}`}>Quantity</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showPriceHistory ? (
            priceHistory.length > 0 ? (
              <div className="space-y-4">
                {priceHistory.map((history) => (
                  <div key={history.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-600">
                        {new Date(history.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {history.change_reason}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(history.old_cost_price !== history.new_cost_price) && (
                        <div>
                          <div className="text-sm font-medium mb-1">Cost Price Change</div>
                          <div className="flex items-center space-x-2">
                            <span className="text-red-600">{formatAmount(history.old_cost_price)}</span>
                            <span>→</span>
                            <span className="text-green-600">{formatAmount(history.new_cost_price)}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              history.new_cost_price > history.old_cost_price 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {history.new_cost_price > history.old_cost_price ? (
                                <TrendingUp className="h-3 w-3 inline mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 inline mr-1" />
                              )}
                              {formatAmount(Math.abs(history.new_cost_price - history.old_cost_price))}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {(history.old_selling_price !== history.new_selling_price) && (
                        <div>
                          <div className="text-sm font-medium mb-1">Selling Price Change</div>
                          <div className="flex items-center space-x-2">
                            <span className="text-red-600">{formatAmount(history.old_selling_price)}</span>
                            <span>→</span>
                            <span className="text-green-600">{formatAmount(history.new_selling_price)}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              history.new_selling_price > history.old_selling_price 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {history.new_selling_price > history.old_selling_price ? (
                                <TrendingUp className="h-3 w-3 inline mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 inline mr-1" />
                              )}
                              {formatAmount(Math.abs(history.new_selling_price - history.old_selling_price))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {history.changed_by && (
                      <div className="text-xs text-gray-500 mt-2">
                        Changed by: {history.changed_by_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No price history available for this product.
              </div>
            )
          ) : (
            inventoryHistory.length > 0 ? (
              <div className="space-y-4">
                {inventoryHistory.map((adjustment) => (
                  <div key={adjustment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-600">
                        {new Date(adjustment.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium text-purple-600">
                        {adjustment.reason}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Quantity Adjustment:</span>
                      <span className={`text-lg font-bold ${
                        adjustment.adjustment_type === InventoryAdjustmentType.INCREASE
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {adjustment.adjustment_type === InventoryAdjustmentType.INCREASE ? '+' : ''}{adjustment.quantity}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        adjustment.adjustment_type === InventoryAdjustmentType.INCREASE
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {adjustment.adjustment_type === InventoryAdjustmentType.INCREASE ? (
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 inline mr-1" />
                        )}
                        {adjustment.adjustment_type === InventoryAdjustmentType.INCREASE ? 'Stock In' : 'Stock Out'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No quantity history available for this product.
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductAnalysis;