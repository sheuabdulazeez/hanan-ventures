import { TSale, TSaleItem } from "@/types/database";
import { initDatabase } from ".";

export async function getSales() {
    const db = await initDatabase();
    const result = await db.select<TSale[]>(`
        SELECT s.*, c.name as customer_name, u.name as employee_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.employee_id = u.id
        ORDER BY s.created_at DESC
    `);
    return result;
}

export async function getSaleById(id: string) {
    const db = await initDatabase();
    const [sale] = await db.select<TSale[]>(`
        SELECT s.*, c.name as customer_name, u.name as employee_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.employee_id = u.id
        WHERE s.id = $1
    `, [id]);
    return sale;
}

export async function getSaleItems(saleId: string) {
    const db = await initDatabase();
    const items = await db.select<TSaleItem[]>(`
        SELECT si.*, p.name as product_name
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = $1
    `, [saleId]);
    return items;
}

export async function createSale(sale: Omit<TSale, "id" | "created_at" | "updated_at">, items: Omit<TSaleItem, "id" | "created_at" | "updated_at"|'sale_id'>[]) {
    const db = await initDatabase();
    
    try {
        // Build all queries as a single transaction
        let queries = ['BEGIN TRANSACTION;'];
        
        // Generate sale ID
        const [{ id: saleId }] = await db.select<[{ id: string }]>('SELECT lower(hex(randomblob(16))) as id');
        
        // Add sale record query
        queries.push(`
            INSERT INTO sales (id, customer_id, employee_id, total_amount, discount, payment_method, bank_name) 
            VALUES ('${saleId}', '${sale.customer_id}', '${sale.employee_id}', ${sale.total_amount}, ${sale.discount}, '${sale.payment_method}', '${sale.bank_name ?? "Opay"}');
        `);

        // Add sale items and update stock queries
        for (const item of items) {
            queries.push(`
                INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) 
                VALUES ('${saleId}', '${item.product_id}', ${item.quantity}, ${item.unit_price}, ${item.total_price});
            `);
            
            queries.push(`
                UPDATE products 
                SET quantity_on_hand = quantity_on_hand - ${item.quantity} 
                WHERE id = '${item.product_id}';
            `);
        }

        queries.push('COMMIT;');

        // Execute all queries in one go
        await db.execute(queries.join('\n'));
        
        return saleId;
    } catch (error) {
        console.error('Sale creation error:', error);
        await db.execute('ROLLBACK;');
        throw error;
    }
}

export async function getDailySales(date: Date) {
    const db = await initDatabase();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db.select<{ total: number }[]>(
        'SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE created_at BETWEEN $1 AND $2',
        [startOfDay.toISOString(), endOfDay.toISOString()]
    );
    
    return result[0].total;
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
    const db = await initDatabase();
    const result = await db.select<TSale[]>(`
        SELECT s.*, c.name as customer_name, u.name as employee_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.employee_id = u.id
        WHERE s.created_at BETWEEN $1 AND $2
        ORDER BY s.created_at DESC
    `, [startDate.toISOString(), endDate.toISOString()]);
    
    return result;
}

export async function getSalesByCashier(startDate: Date, endDate: Date) {
    const db = await initDatabase();
    const result = await db.select<{ employee_name: string, total: number }[]>(`
        SELECT u.name as employee_name, COALESCE(SUM(s.total_amount), 0) as total
        FROM users u
        LEFT JOIN sales s ON u.id = s.employee_id 
            AND s.created_at BETWEEN $1 AND $2
        WHERE u.role = 'sales'
        GROUP BY u.id, u.name
        ORDER BY total DESC
    `, [startDate.toISOString(), endDate.toISOString()]);
    
    return result;
}