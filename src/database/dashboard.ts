import { initDatabase } from ".";

export interface DashboardMetrics {
    totalSales: number;
    totalCustomers: number;
    totalProducts: number;
    totalDebt: number;
    averageOrderValue: number;
    totalExpenses: number;  // Add this line
}
export interface DailySales {
    date: string;
    amount: number;
}

export interface WeeklySales {
    week: string;
    amount: number;
}

export interface TopProduct {
    name: string;
    total_sales: number;
    total_quantity: number;
    total_revenue: number;
}

export interface TopCustomer {
    name: string;
    email: string;
    total_orders: number;
    total_purchases: number;
}

export interface RecentSale {
    id: string;
    amount: number;
    date: string;
    customer: string;
    cashier: string;
}

export interface SalesByCashier {
    name: string;
    amount: number;
}

export async function getDashboardMetrics() {
    const db = await initDatabase();
    
    try {
        const [metrics] = await db.select<[DashboardMetrics]>(`
            SELECT 
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales) as totalSales,
                (SELECT COUNT(*) FROM customers WHERE id != 'WALK-IN') as totalCustomers,
                (SELECT COUNT(*) FROM products) as totalProducts,
                (SELECT COALESCE(SUM(amount_owed), 0) FROM debtors WHERE is_paid = 0) as totalDebt,
                (SELECT COALESCE(AVG(total_amount), 0) FROM sales) as averageOrderValue,
                (SELECT COALESCE(SUM(amount), 0) FROM business_expenses) as totalExpenses
        `);
        
        return metrics;
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw error;
    }
}

export async function getDailySales(): Promise<DailySales[]> {
    const db = await initDatabase();
    
    try {
        return await db.select<DailySales[]>(`
            WITH RECURSIVE days AS (
                SELECT date('now', 'start of month') as date
                UNION ALL
                SELECT date(date, '+1 day')
                FROM days
                WHERE date < date('now')
            )
            SELECT 
                days.date,
                COALESCE(SUM(s.total_amount), 0) as amount
            FROM days
            LEFT JOIN sales s ON date(s.created_at) = days.date
                AND strftime('%m', s.created_at) = strftime('%m', 'now')
                AND strftime('%Y', s.created_at) = strftime('%Y', 'now')
            GROUP BY days.date
            ORDER BY days.date
        `);
    } catch (error) {
        console.error('Error fetching daily sales:', error);
        throw error;
    }
}

export async function getWeeklySales(): Promise<WeeklySales[]> {
    const db = await initDatabase();
    
    try {
        return await db.select<WeeklySales[]>(`
            WITH RECURSIVE weeks AS (
                -- Get first day of current month
                SELECT 
                    date('now', 'start of month') as start_date,
                    date('now', 'start of month', '+6 days') as end_date,
                    1 as week_number
                UNION ALL
                SELECT 
                    date(start_date, '+7 days'),
                    date(end_date, '+7 days'),
                    week_number + 1
                FROM weeks 
                WHERE week_number < 4
            )
            SELECT 
                'Week ' || weeks.week_number as week,
                COALESCE(SUM(s.total_amount), 0) as amount
            FROM weeks
            LEFT JOIN sales s ON date(s.created_at) >= weeks.start_date 
                AND date(s.created_at) <= weeks.end_date
                AND strftime('%m', s.created_at) = strftime('%m', 'now')
                AND strftime('%Y', s.created_at) = strftime('%Y', 'now')
            GROUP BY weeks.week_number
            ORDER BY weeks.week_number
        `);
    } catch (error) {
        console.error('Error fetching weekly sales:', error);
        throw error;
    }
}

export async function getMonthlySalesByCashier(): Promise<SalesByCashier[]> {
    const db = await initDatabase();
    
    try {
        return await db.select<SalesByCashier[]>(`
            SELECT 
                u.name,
                COALESCE(SUM(s.total_amount), 0) as amount
            FROM users u
            LEFT JOIN sales s ON u.id = s.employee_id 
                AND strftime('%m', s.created_at) = strftime('%m', 'now')
                AND strftime('%Y', s.created_at) = strftime('%Y', 'now')
            -- WHERE u.role != 'admin'
            GROUP BY u.id, u.name
            ORDER BY amount DESC
        `);
    } catch (error) {
        console.error('Error fetching monthly sales by cashier:', error);
        throw error;
    }
}

export async function getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    const db = await initDatabase();
    
    try {
        return await db.select<TopProduct[]>(`
            SELECT 
                p.name,
                COUNT(si.id) as total_sales,
                SUM(si.quantity) as total_quantity,
                SUM(si.total_price) as total_revenue
            FROM products p
            LEFT JOIN sale_items si ON p.id = si.product_id
            GROUP BY p.id, p.name
            ORDER BY total_revenue DESC
            LIMIT $1
        `, [limit]);
    } catch (error) {
        console.error('Error fetching top products:', error);
        throw error;
    }
}

export async function getTopCustomers(limit: number = 5): Promise<TopCustomer[]> {
    const db = await initDatabase();
    
    try {
        return await db.select<TopCustomer[]>(`
            SELECT 
                c.name,
                c.email,
                COUNT(s.id) as total_orders,
                SUM(s.total_amount) as total_purchases
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE c.id != 'WALK-IN'
            GROUP BY c.id, c.name, c.email
            ORDER BY total_purchases DESC
            LIMIT $1
        `, [limit]);
    } catch (error) {
        console.error('Error fetching top customers:', error);
        throw error;
    }
}

export async function getRecentSales(limit: number = 5): Promise<RecentSale[]> {
    const db = await initDatabase();
    
    try {
        return await db.select<RecentSale[]>(`
            SELECT 
                s.id,
                s.total_amount as amount,
                s.created_at as date,
                c.name as customer,
                u.name as cashier
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.employee_id = u.id
            ORDER BY s.created_at DESC
            LIMIT $1
        `, [limit]);
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        throw error;
    }
}

