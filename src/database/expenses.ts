import { TBusinessExpense, PaymentMethod } from '@/types/database';
import { initDatabase } from '.';

export interface CreateExpenseData {
  expense_type: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  bank_name?: string;
  employee_id: string;
  expense_date?: string;
}

export interface UpdateExpenseData {
  expense_type?: string;
  description?: string;
  amount?: number;
  payment_method?: PaymentMethod;
  bank_name?: string;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  expense_type?: string;
  payment_method?: PaymentMethod;
  employee_id?: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  expensesByCategory: { expense_type: string; total: number; count: number }[];
  expensesByPaymentMethod: { payment_method: string; total: number; count: number }[];
  monthlyExpenses: { month: string; total: number }[];
}

// Get all expenses with optional filtering
export async function getExpenses(filters?: ExpenseFilters): Promise<TBusinessExpense[]> {
  const db = await initDatabase();
  
  let query = `
    SELECT be.*, u.name as employee_name
    FROM business_expenses be
    LEFT JOIN users u ON be.employee_id = u.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (filters?.startDate) {
    query += ` AND DATE(be.expense_date) >= ?`;
    params.push(filters.startDate);
  }
  
  if (filters?.endDate) {
    query += ` AND DATE(be.expense_date) <= ?`;
    params.push(filters.endDate);
  }
  
  if (filters?.expense_type) {
    query += ` AND be.expense_type = ?`;
    params.push(filters.expense_type);
  }
  
  if (filters?.payment_method) {
    query += ` AND be.payment_method = ?`;
    params.push(filters.payment_method);
  }
  
  if (filters?.employee_id) {
    query += ` AND be.employee_id = ?`;
    params.push(filters.employee_id);
  }
  
  query += ` ORDER BY be.expense_date DESC, be.created_at DESC`;
  
  const expenses = await db.select<(TBusinessExpense & { employee_name?: string })[]>(query, params);
  return expenses;
}

// Get expense by ID
export async function getExpenseById(id: string): Promise<TBusinessExpense | null> {
  const db = await initDatabase();
  
  const expense = await db.selectOne<TBusinessExpense & { employee_name?: string }>(
    `
      SELECT be.*, u.name as employee_name
      FROM business_expenses be
      LEFT JOIN users u ON be.employee_id = u.id
      WHERE be.id = ?
    `,
    [id]
  );
  
  return expense || null;
}

// Create new expense
export async function createExpense(data: CreateExpenseData): Promise<string> {
  const db = await initDatabase();
  
  const { expenseId } = await db.selectOne<{ expenseId: string }>(
    `SELECT lower(hex(randomblob(16))) as expenseId`
  );
  console.log(data)
  await db.execute(
    `
      INSERT INTO business_expenses (
        id, expense_date, expense_type, description, amount, 
        payment_method, bank_name, employee_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      expenseId,
      data.expense_date || new Date().toISOString(),
      data.expense_type,
      data.description,
      data.amount,
      data.payment_method,
      data.bank_name || null,
      data.employee_id
    ]
  );
  
  return expenseId;
}

// Update expense
export async function updateExpense(id: string, data: UpdateExpenseData): Promise<boolean> {
  const db = await initDatabase();
  
  const updateFields: string[] = [];
  const params: any[] = [];
  
  if (data.expense_type !== undefined) {
    updateFields.push('expense_type = ?');
    params.push(data.expense_type);
  }
  
  if (data.description !== undefined) {
    updateFields.push('description = ?');
    params.push(data.description);
  }
  
  if (data.amount !== undefined) {
    updateFields.push('amount = ?');
    params.push(data.amount);
  }
  
  if (data.payment_method !== undefined) {
    updateFields.push('payment_method = ?');
    params.push(data.payment_method);
  }
  
  if (data.bank_name !== undefined) {
    updateFields.push('bank_name = ?');
    params.push(data.bank_name);
  }
  
  if (updateFields.length === 0) {
    return false;
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  
  await db.execute(
    `UPDATE business_expenses SET ${updateFields.join(', ')} WHERE id = ?`,
    params
  );
  
  return true;
}

// Delete expense
export async function deleteExpense(id: string): Promise<boolean> {
  const db = await initDatabase();
  
  await db.execute('DELETE FROM business_expenses WHERE id = ?', [id]);
  return true;
}

// Get expense statistics
export async function getExpenseStats(filters?: ExpenseFilters): Promise<ExpenseStats> {
  const db = await initDatabase();
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  
  if (filters?.startDate) {
    whereClause += ` AND DATE(expense_date) >= ?`;
    params.push(filters.startDate);
  }
  
  if (filters?.endDate) {
    whereClause += ` AND DATE(expense_date) <= ?`;
    params.push(filters.endDate);
  }
  
  if (filters?.employee_id) {
    whereClause += ` AND employee_id = ?`;
    params.push(filters.employee_id);
  }
  
  // Total expenses
  const totalResult = await db.selectOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM business_expenses ${whereClause}`,
    params
  );
  
  // Expenses by category
  const categoryResult = await db.select<{ expense_type: string; total: number; count: number }[]>(
    `
      SELECT 
        expense_type,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM business_expenses 
      ${whereClause}
      GROUP BY expense_type
      ORDER BY total DESC
    `,
    params
  );
  
  // Expenses by payment method
  const paymentMethodResult = await db.select<{ payment_method: string; total: number; count: number }[]>(
    `
      SELECT 
        payment_method,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM business_expenses 
      ${whereClause}
      GROUP BY payment_method
      ORDER BY total DESC
    `,
    params
  );
  
  // Monthly expenses (last 12 months)
  const monthlyResult = await db.select<{ month: string; total: number }[]>(
    `
      SELECT 
        strftime('%Y-%m', expense_date) as month,
        COALESCE(SUM(amount), 0) as total
      FROM business_expenses 
      ${whereClause}
      GROUP BY strftime('%Y-%m', expense_date)
      ORDER BY month DESC
      LIMIT 12
    `,
    params
  );
  
  return {
    totalExpenses: totalResult?.total || 0,
    expensesByCategory: categoryResult || [],
    expensesByPaymentMethod: paymentMethodResult || [],
    monthlyExpenses: monthlyResult || []
  };
}

// Get expense categories (distinct expense types)
export async function getExpenseCategories(): Promise<string[]> {
  const db = await initDatabase();
  
  const categories = await db.select<{ expense_type: string }[]>(
    `SELECT DISTINCT expense_type FROM business_expenses ORDER BY expense_type`
  );
  
  return categories.map(c => c.expense_type);
}

// Get expenses by date range
export async function getExpensesByDateRange(startDate: string, endDate: string): Promise<TBusinessExpense[]> {
  return getExpenses({ startDate, endDate });
}

// Get recent expenses
export async function getRecentExpenses(limit: number = 10): Promise<TBusinessExpense[]> {
  const db = await initDatabase();
  
  const expenses = await db.select<(TBusinessExpense & { employee_name?: string })[]>(
    `
      SELECT be.*, u.name as employee_name
      FROM business_expenses be
      LEFT JOIN users u ON be.employee_id = u.id
      ORDER BY be.created_at DESC
      LIMIT ?
    `,
    [limit]
  );
  
  return expenses;
}