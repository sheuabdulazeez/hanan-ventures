import { initDatabase } from ".";

export interface ProfitData {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface ProfitByPeriod {
  date: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface ProductProfitability {
  productName: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  quantitySold: number;
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get profit data for a specific date range
export async function getProfitByDateRange(startDate: string, endDate: string): Promise<ProfitData> {
  const db = await initDatabase();

  try {
    // Get sales data with profit information
    const salesResult = await db.selectOne<{
      totalRevenue: number;
      totalCost: number;
      grossProfit: number;
    }>(`
      SELECT 
        COALESCE(SUM(total_amount - returned_amount), 0) as totalRevenue,
        COALESCE(SUM(total_cost - returned_cost), 0) as totalCost,
        COALESCE(SUM(gross_profit - returned_amount + returned_cost), 0) as grossProfit
      FROM sales 
      WHERE DATE(created_at, 'localtime') BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Get expenses for the same period
    const expensesResult = await db.selectOne<{ totalExpenses: number }>(`
      SELECT COALESCE(SUM(amount), 0) as totalExpenses
      FROM business_expenses 
      WHERE DATE(CASE WHEN length(expense_date) > 10 THEN datetime(expense_date, 'localtime') ELSE expense_date END) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    const salesData = salesResult || { totalRevenue: 0, totalCost: 0, grossProfit: 0 };
    const expensesData = expensesResult || { totalExpenses: 0 };

    const netProfit = salesData.grossProfit - expensesData.totalExpenses;
    const profitMargin = salesData.totalRevenue > 0 ? (netProfit / salesData.totalRevenue) * 100 : 0;

    return {
      totalRevenue: salesData.totalRevenue,
      totalCost: salesData.totalCost,
      grossProfit: salesData.grossProfit,
      totalExpenses: expensesData.totalExpenses,
      netProfit,
      profitMargin
    };
  } catch (error) {
    console.error('Error fetching profit data:', error);
    throw error;
  }
}

// Get today's profit
export async function getTodayProfit(): Promise<ProfitData> {
  const today = formatDateLocal(new Date());
  return getProfitByDateRange(today, today);
}

// Get yesterday's profit
export async function getYesterdayProfit(): Promise<ProfitData> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateLocal(yesterday);
  return getProfitByDateRange(yesterdayStr, yesterdayStr);
}

// Get this week's profit
export async function getWeekProfit(): Promise<ProfitData> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startDate = formatDateLocal(startOfWeek);
  const endDate = formatDateLocal(today);

  return getProfitByDateRange(startDate, endDate);
}

// Get this month's profit
export async function getMonthProfit(): Promise<ProfitData> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);


  const startDate = formatDateLocal(startOfMonth);
  const endDate = formatDateLocal(today);

  return getProfitByDateRange(startDate, endDate);
}

// Get daily profit breakdown for a date range
export async function getDailyProfitBreakdown(startDate: string, endDate: string): Promise<ProfitByPeriod[]> {
  const db = await initDatabase();

  try {
    // Driven by the union of sale days and expense days, so expenses on days with
    // no sales still reduce profit (otherwise daily rows don't add up to the period).
    return await db.select<ProfitByPeriod[]>(`
      WITH daily_sales AS (
        SELECT 
          DATE(created_at, 'localtime') as date,
          SUM(total_amount - returned_amount) as revenue,
          SUM(total_cost - returned_cost) as cost,
          SUM(gross_profit - returned_amount + returned_cost) as grossProfit
        FROM sales
        WHERE DATE(created_at, 'localtime') BETWEEN $1 AND $2
        GROUP BY DATE(created_at, 'localtime')
      ),
      daily_expenses AS (
        SELECT 
          DATE(CASE WHEN length(expense_date) > 10 THEN datetime(expense_date, 'localtime') ELSE expense_date END) as date,
          SUM(amount) as expenses
        FROM business_expenses
        WHERE DATE(CASE WHEN length(expense_date) > 10 THEN datetime(expense_date, 'localtime') ELSE expense_date END) BETWEEN $1 AND $2
        GROUP BY DATE(CASE WHEN length(expense_date) > 10 THEN datetime(expense_date, 'localtime') ELSE expense_date END)
      ),
      all_days AS (
        SELECT date FROM daily_sales
        UNION
        SELECT date FROM daily_expenses
      )
      SELECT 
        d.date,
        COALESCE(ds.revenue, 0) as revenue,
        COALESCE(ds.cost, 0) as cost,
        COALESCE(ds.grossProfit, 0) as grossProfit,
        COALESCE(de.expenses, 0) as expenses,
        COALESCE(ds.grossProfit, 0) - COALESCE(de.expenses, 0) as netProfit
      FROM all_days d
      LEFT JOIN daily_sales ds ON ds.date = d.date
      LEFT JOIN daily_expenses de ON de.date = d.date
      ORDER BY d.date
    `, [startDate, endDate]);
  } catch (error) {
    console.error('Error fetching daily profit breakdown:', error);
    throw error;
  }
}

// Get product profitability analysis
export async function getProductProfitability(startDate: string, endDate: string): Promise<ProductProfitability[]> {
  const db = await initDatabase();

  try {
    return await db.select<ProductProfitability[]>(`
      SELECT 
        p.name as productName,
        COALESCE(SUM(si.total_price * (si.quantity - si.returned_quantity) / si.quantity), 0) as totalRevenue,
        COALESCE(SUM(si.cost_price_at_sale * COALESCE(si.base_quantity, si.quantity) * (si.quantity - si.returned_quantity) / si.quantity), 0) as totalCost,
        COALESCE(SUM(si.profit * (si.quantity - si.returned_quantity) / si.quantity), 0) as grossProfit,
        CASE 
          WHEN SUM(si.total_price * (si.quantity - si.returned_quantity) / si.quantity) > 0 
          THEN (CAST(SUM(si.profit * (si.quantity - si.returned_quantity) / si.quantity) AS REAL) / SUM(si.total_price * (si.quantity - si.returned_quantity) / si.quantity)) * 100 
          ELSE 0 
        END as profitMargin,
        COALESCE(SUM(si.quantity - si.returned_quantity), 0) as quantitySold
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.created_at, 'localtime') BETWEEN $1 AND $2
      GROUP BY p.id, p.name
      HAVING SUM(si.quantity - si.returned_quantity) > 0
      ORDER BY grossProfit DESC
    `, [startDate, endDate]);
  } catch (error) {
    console.error('Error fetching product profitability:', error);
    throw error;
  }
}