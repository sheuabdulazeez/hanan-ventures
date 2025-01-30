import { addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'

export const recentSales = [
  { id: '1', customer: 'John Doe', amount: 50.00, date: subDays(new Date(), 1), cashier: 'Alice' },
  { id: '2', customer: 'Jane Smith', amount: 75.50, date: subDays(new Date(), 2), cashier: 'Bob' },
  { id: '3', customer: 'Bob Johnson', amount: 30.25, date: subDays(new Date(), 3), cashier: 'Charlie' },
  { id: '4', customer: 'Alice Brown', amount: 100.00, date: subDays(new Date(), 4), cashier: 'Alice' },
  { id: '5', customer: 'Charlie Davis', amount: 45.75, date: subDays(new Date(), 5), cashier: 'Bob' },
]

export const recentCustomers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', totalPurchases: 500.00 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', totalPurchases: 750.50 },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', totalPurchases: 300.25 },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', totalPurchases: 1000.00 },
  { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', totalPurchases: 457.75 },
]

export const dailySalesData = Array.from({ length: 7 }, (_, i) => ({
  date: subDays(new Date(), i),
  amount: Math.floor(Math.random() * 1000) + 500,
})).reverse()

export const weeklySalesData = Array.from({ length: 4 }, (_, i) => ({
  week: `Week ${i + 1}`,
  amount: Math.floor(Math.random() * 5000) + 3000,
}))

export const salesByCashier = [
  { name: 'Alice', amount: 2500 },
  { name: 'Bob', amount: 2200 },
  { name: 'Charlie', amount: 1800 },
  { name: 'David', amount: 2100 },
]

export const dailySalesByCashier = [
  { name: 'Alice', Mon: 500, Tue: 450, Wed: 550, Thu: 600, Fri: 400, Sat: 300, Sun: 200 },
  { name: 'Bob', Mon: 400, Tue: 500, Wed: 450, Thu: 550, Fri: 500, Sat: 350, Sun: 250 },
  { name: 'Charlie', Mon: 350, Tue: 400, Wed: 500, Thu: 450, Fri: 600, Sat: 400, Sun: 300 },
  { name: 'David', Mon: 450, Tue: 500, Wed: 400, Thu: 500, Fri: 550, Sat: 450, Sun: 350 },
]

export const expenseData = [
  { category: 'Inventory', amount: 5000 },
  { category: 'Rent', amount: 2000 },
  { category: 'Utilities', amount: 800 },
  { category: 'Salaries', amount: 4000 },
  { category: 'Marketing', amount: 1000 },
]

export const overviewData = {
  totalSales: 10000,
  totalExpenses: 7800,
  netIncome: 2200,
  customerCount: 150,
}

export const todaySalesByCashier = [
  { name: 'Alice', amount: 1200 },
  { name: 'Bob', amount: 950 },
  { name: 'Charlie', amount: 1100 },
  { name: 'David', amount: 800 },
]

export const debtors = [
  { id: '1', name: 'John Smith', amount: 500, dueDate: addDays(new Date(), 7) },
  { id: '2', name: 'Sarah Johnson', amount: 750, dueDate: addDays(new Date(), 14) },
  { id: '3', name: 'Michael Brown', amount: 300, dueDate: addDays(new Date(), 5) },
  { id: '4', name: 'Emily Davis', amount: 1000, dueDate: addDays(new Date(), 30) },
  { id: '5', name: 'David Wilson', amount: 250, dueDate: addDays(new Date(), 3) },
]

export const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.amount, 0)

