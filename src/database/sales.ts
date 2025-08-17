import { TSale, TSaleItem } from "@/types/database";
import { Database, initDatabase } from ".";
import { handleSaleDebt } from "./debtors";

export async function getSales() {
  const db = new Database();
  const sales = await db.select<TSale[]>(`
    SELECT s.*, c.name as customer_name, u.name as employee_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.employee_id = u.id
    ORDER BY s.created_at DESC
  `);

  const payments = await db.select(`
    SELECT sp.* 
    FROM sale_payments sp
    WHERE sp.sale_id IN (${sales.map(() => '?').join(',')})
  `, sales.map(sale => sale.id));
  
  // Group payments by sale_id
  const paymentsBySaleId = payments.reduce((acc, payment) => {
    if (!acc[payment.sale_id]) {
      acc[payment.sale_id] = [];
    }
    acc[payment.sale_id].push(payment);
    return acc;
  }, {});
  
  // Attach payments to each sale
  for (const sale of sales) {
    sale.payments = paymentsBySaleId[sale.id] || [];
  }
  
  return sales;
}

export async function getSaleById(id: string) {
  const db = new Database();
  const sale = await db.selectOne<TSale>(
    `
        SELECT s.*, c.name as customer_name, u.name as employee_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.employee_id = u.id
        WHERE s.id = $1
    `,
    [id]
  );
  
  if (sale) {
    // Get payment information
    sale.payments = await db.select(`
      SELECT * FROM sale_payments
      WHERE sale_id = $1
    `, [id]);
  }
  
  return sale;
}

export async function getSaleItems(saleId: string) {
  const db = new Database();
  const items = await db.select<TSaleItem[]>(
    `
        SELECT si.*, p.name as product_name
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = $1
    `,
    [saleId]
  );
  return items;
}

export async function createSale(
  sale: Omit<TSale, "id" | "created_at" | "updated_at">,
  items: Omit<TSaleItem, "id" | "created_at" | "updated_at" | "sale_id">[],
) {
  const db = new Database();
  try {
    const { saleId } = await db.selectOne<{ saleId: string }>(
      `SELECT lower(hex(randomblob(16))) as saleId`
    );
    

    // Generate sale ID
    await db.beginTransaction();
    // Add sale record (without payment fields)
    await db.executeQuery(
      `INSERT INTO sales (id, customer_id, employee_id, total_amount, discount) 
             VALUES ($1, $2, $3, $4, $5)`,
      [
        saleId,
        sale.customer_id,
        sale.employee_id,
        sale.total_amount,
        sale.discount,
      ]
    );

    // Add sale items and update stock
    for (const item of items) {
      await db.executeQuery(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) 
                 VALUES ($1, $2, $3, $4, $5)`,
        [
          saleId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total_price,
        ]
      );

      await db.executeQuery(
        `UPDATE products 
                 SET quantity_on_hand = quantity_on_hand - $1 
                 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
    
    // Add payment records
    const totalPaid = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    for (const payment of sale.payments) {
      await db.executeQuery(
        `INSERT INTO sale_payments (sale_id, payment_method, amount, bank_name, reference_number) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          saleId,
          payment.payment_method,
          payment.amount,
          payment.bank_name || null,
          payment.reference_number || null
        ]
      );
    }

    if(totalPaid < sale.total_amount - (sale.discount || 0) && sale.customer_id === "WALK-IN"){
      throw new Error("Walk-in customer must pay the full amount");
    }
    // Commit the transaction
    await db.commit();

    // Handle debt if partial payment
    if (totalPaid < sale.total_amount - (sale.discount || 0)) {
      await handleSaleDebt(
        saleId,
        sale.customer_id,
        sale.total_amount - (sale.discount || 0),
        totalPaid,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    }

    return saleId;
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

export async function getDailySales(date: Date) {
  const db = new Database();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db.select<{ total: number }[]>(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE created_at BETWEEN $1 AND $2",
    [startOfDay.toISOString(), endOfDay.toISOString()]
  );

  return result[0].total;
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  const db = new Database();
  const result = await db.select<TSale[]>(
    `
        SELECT s.*, c.name as customer_name, u.name as employee_name 
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.employee_id = u.id
        WHERE s.created_at BETWEEN $1 AND $2
        ORDER BY s.created_at DESC
    `,
    [startDate.toISOString(), endDate.toISOString()]
  );

  return result;
}

export async function getSalesByCashier(startDate: Date, endDate: Date) {
  const db = new Database();
  const result = await db.select<{ employee_name: string; total: number }[]>(
    `
        SELECT u.name as employee_name, COALESCE(SUM(s.total_amount), 0) as total
        FROM users u
        LEFT JOIN sales s ON u.id = s.employee_id 
            AND s.created_at BETWEEN $1 AND $2
        WHERE u.role = 'sales'
        GROUP BY u.id, u.name
        ORDER BY total DESC
    `,
    [startDate.toISOString(), endDate.toISOString()]
  );

  return result;
}

export async function deleteSale(saleId: string) {
  const db = await initDatabase();

  // Start a transaction to delete both sale items and the sale
  await db.beginTransaction();

  try {
    const saleItems = await db.select<
      { product_id: string; quantity: number }[]
    >("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?", [
      saleId,
    ]);

    // Restore product quantities
    for (const item of saleItems) {
      await db.executeQuery(
        "UPDATE products SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }
    // Delete sale items first
    await db.executeQuery("DELETE FROM sale_items WHERE sale_id = ?", [saleId]);

    // Delete the sale
    await db.executeQuery("DELETE FROM sales WHERE id = ?", [saleId]);

    await db.commit();
    return true;
  } catch (error) {
    await db.rollback();
    throw error;
  }
}
