import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import { 
  ProfitData, 
  ProfitByPeriod, 
  ProductProfitability,
  getTodayProfit,
  getYesterdayProfit,
  getWeekProfit,
  getMonthProfit,
  getProfitByDateRange,
  getDailyProfitBreakdown,
  getProductProfitability
} from '@/database/profit';
import { useToast } from '@/hooks/use-toast';
import { PrintProfitReportButton } from '@/components/PrintProfitReportButton';
import { getAdminSettings } from '@/database/settings';

type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const ProfitPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [dailyBreakdown, setDailyBreakdown] = useState<ProfitByPeriod[]>([]);
  const [productProfitability, setProductProfitability] = useState<ProductProfitability[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { toast } = useToast();

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      let data: ProfitData;
      let startDate: string;
      let endDate: string;

      switch (selectedPeriod) {
        case 'today':
          data = await getTodayProfit();
          startDate = endDate = new Date().toISOString().split('T')[0];
          break;
        case 'yesterday':
          data = await getYesterdayProfit();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = endDate = yesterday.toISOString().split('T')[0];
          break;
        case 'week':
          data = await getWeekProfit();
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startDate = startOfWeek.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          break;
        case 'month':
          data = await getMonthProfit();
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startDate = startOfMonth.toISOString().split('T')[0];
          endDate = new Date().toISOString().split('T')[0];
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            toast({
              title: "Error",
              description: "Please select both start and end dates for custom period.",
              variant: "destructive"
            });
            return;
          }
          data = await getProfitByDateRange(customStartDate, customEndDate);
          startDate = customStartDate;
          endDate = customEndDate;
          break;
        default:
          return;
      }

      setProfitData(data);
      
      // Fetch additional data for detailed view
      const breakdown = await getDailyProfitBreakdown(startDate, endDate);
      const productData = await getProductProfitability(startDate, endDate);
      
      setDailyBreakdown(breakdown);
      setProductProfitability(productData);
    } catch (error) {
      console.error('Error fetching profit data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profit data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await getAdminSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
    
    if (selectedPeriod !== 'custom') {
      fetchProfitData();
    } else {
      // Clear data when switching to custom period
      setProfitData(null);
      setDailyBreakdown([]);
      setProductProfitability([]);
    }
  }, [selectedPeriod]);



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'custom': return `${customStartDate} to ${customEndDate}`;
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Profit Analysis</h1>
        <PrintProfitReportButton 
          profitData={profitData}
          dailyBreakdown={dailyBreakdown}
          productProfitability={productProfitability}
          periodLabel={getPeriodLabel()}
          settings={settings}
          disabled={!profitData || !settings}
        />
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Period</CardTitle>
          <CardDescription>Choose the time period for profit analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={(value: PeriodType) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <Button onClick={fetchProfitData} disabled={loading}>
                  {loading ? 'Loading...' : 'Generate Report'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profit Report */}
      {(profitData || selectedPeriod !== 'custom') && (
        <div id="profit-report">
          <div className="header">
            <h2 className="text-2xl font-bold">Profit Report - {getPeriodLabel()}</h2>
            <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          {profitData && (
          <>
            {/* Key Metrics */}
            <div className="metrics grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(profitData.totalRevenue)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(profitData.totalCost)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${profitData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitData.grossProfit)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(profitData.totalExpenses)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${profitData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitData.netProfit)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Margin: {formatPercentage(profitData.profitMargin)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Breakdown */}
            {dailyBreakdown.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Daily Breakdown</CardTitle>
                  <CardDescription>Daily profit and loss breakdown for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Gross Profit</TableHead>
                        <TableHead>Expenses</TableHead>
                        <TableHead>Net Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyBreakdown.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                          <TableCell>{formatCurrency(day.revenue)}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(day.cost)}</TableCell>
                          <TableCell className={day.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(day.grossProfit)}
                          </TableCell>
                          <TableCell className="text-red-600">{formatCurrency(day.expenses)}</TableCell>
                          <TableCell className={day.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(day.netProfit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Product Profitability */}
            {productProfitability.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Profitability</CardTitle>
                  <CardDescription>Profit analysis by product for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Gross Profit</TableHead>
                        <TableHead>Profit Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productProfitability.map((product) => (
                        <TableRow key={product.productName}>
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell>{product.quantitySold}</TableCell>
                          <TableCell>{formatCurrency(product.totalRevenue)}</TableCell>
                          <TableCell className="text-red-600">{formatCurrency(product.totalCost)}</TableCell>
                          <TableCell className={product.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(product.grossProfit)}
                          </TableCell>
                          <TableCell className={product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercentage(product.profitMargin)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="text-lg">Loading profit data...</div>
            </div>
          )}
        </div>
      )}

      {selectedPeriod === 'custom' && !profitData && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-lg text-gray-600 mb-4">Select a date range and click "Generate Report" to view profit analysis.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfitPage;