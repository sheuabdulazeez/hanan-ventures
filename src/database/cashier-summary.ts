import { initDatabase } from ".";

export interface PaymentSummaryRow {
  payment_method: string;
  total: number;
}

export interface ProductSummaryRow {
  product_name: string;
  unit_abbrev: string | null;
  quantity: number;
}

export async function getPaymentSummaryByDate(cashierId: string, date: string): Promise<PaymentSummaryRow[]> {
  const db = await initDatabase();
  // Money taken in by this cashier's sales, less refunds this user paid out that day.
  return await db.select<PaymentSummaryRow[]>(`
    SELECT payment_method, COALESCE(SUM(total), 0) as total
    FROM (
      SELECT sp.payment_method as payment_method, SUM(sp.amount) as total
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id
      WHERE s.employee_id = $1
        AND date(s.created_at, 'localtime') = $2
      GROUP BY sp.payment_method
      UNION ALL
      SELECT r.refund_method as payment_method, -SUM(r.refund_amount) as total
      FROM sale_returns r
      WHERE r.employee_id = $1
        AND r.refund_amount > 0
        AND date(r.created_at, 'localtime') = $2
      GROUP BY r.refund_method
    )
    GROUP BY payment_method
  `, [cashierId, date]);
}

export async function getProductSummaryByDate(cashierId: string, date: string): Promise<ProductSummaryRow[]> {
  const db = await initDatabase();
  return await db.select<ProductSummaryRow[]>(`
    SELECT 
      p.name as product_name,
      COALESCE(cu.abbrev, cu_base.abbrev, '') as unit_abbrev,
      COALESCE(SUM(si.quantity - si.returned_quantity), 0) as quantity
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN products p ON p.id = si.product_id
    LEFT JOIN common_units cu ON si.unit_used = cu.id
    LEFT JOIN common_units cu_base ON p.base_unit = cu_base.id
    WHERE s.employee_id = $1
      AND date(s.created_at, 'localtime') = $2
    GROUP BY si.product_id, unit_abbrev
    ORDER BY product_name ASC
  `, [cashierId, date]);
}
