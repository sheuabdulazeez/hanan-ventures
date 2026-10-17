import { TSale, TSaleItem, TSaleReturn } from "@/types/database";
import { Database, initDatabase, round2, toSqlUtc } from ".";
import { handleSaleDebt } from "./debtors";

export async function getSales(cashierId?: string) {
  const db = new Database();
  const params: any[] = [];
  let whereClause = "";
  if (cashierId) {
    whereClause = "WHERE s.employee_id = $1";
    params.push(cashierId);
  }

  const sales = await db.select<TSale[]>(`
    SELECT s.*, c.name as customer_name, u.name as employee_name 
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.employee_id = u.id
    ${whereClause}
    ORDER BY s.created_at DESC
  `, params);

  if (sales.length === 0) {
    return [];
  }

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
        SELECT si.*, 
               p.name as product_name,
               cu.name as unit_name,
               cu.abbrev as unit_abbrev
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        LEFT JOIN common_units cu ON si.unit_used = cu.id
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

  // Money is rounded to 2dp up front so float drift (0.1 + 0.2) can't create
  // phantom debts or mismatched totals.
  const totalAmount = round2(sale.total_amount);
  const discount = round2(sale.discount || 0);
  const amountDue = round2(totalAmount - discount);

  if (items.length === 0) {
    throw new Error("Cannot complete a sale with no items.");
  }
  if (amountDue < 0) {
    throw new Error("Discount cannot exceed the sale total.");
  }

  // Cap recorded payments at what is due: anything tendered beyond that is
  // change handed back, not revenue. Trim from the last payment backwards.
  let excess = round2(
    (sale.payments ?? []).reduce((sum, p) => sum + round2(p.amount), 0) - amountDue
  );
  const payments = (sale.payments ?? [])
    .map((p) => ({ ...p, amount: round2(p.amount) }))
    .reverse()
    .map((p) => {
      if (excess > 0) {
        const trim = Math.min(p.amount, excess);
        excess = round2(excess - trim);
        return { ...p, amount: round2(p.amount - trim) };
      }
      return p;
    })
    .reverse()
    .filter((p) => p.amount > 0);

  const totalPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const amountOwed = round2(amountDue - totalPaid);

  if (amountOwed > 0 && sale.customer_id === "WALK-IN") {
    throw new Error("Walk-in customer must pay the full amount");
  }

  try {
    const { saleId } = await db.selectOne<{ saleId: string }>(
      `SELECT lower(hex(randomblob(16))) as saleId`
    );

    await db.beginTransaction();
    // Add sale record (without payment fields)
    await db.executeQuery(
      `INSERT INTO sales (id, customer_id, employee_id, total_amount, discount, total_cost, gross_profit) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        saleId,
        sale.customer_id,
        sale.employee_id,
        totalAmount,
        discount,
        round2(sale.total_cost),
        round2(sale.gross_profit),
      ]
    );

    // Add sale items and update stock
    for (const item of items as any[]) {
      if (!(item.quantity > 0) || item.unit_price < 0) {
        throw new Error("Each sale item needs a positive quantity and a non-negative price.");
      }
      await db.executeQuery(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, profit, cost_price_at_sale, unit_used, base_quantity) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          saleId,
          item.product_id,
          item.quantity,
          item.unit_price,
          round2(item.total_price),
          round2(item.profit),
          item.cost_price_at_sale,
          item.unit_used || null,
          item.base_quantity || item.quantity
        ]
      );

      const deduction = item.base_quantity || item.quantity;
      const stockUpdate = await db.executeQuery(
        `UPDATE products
                 SET quantity_on_hand = quantity_on_hand - $1
                 WHERE id = $2 AND quantity_on_hand >= $1`,
        [deduction, item.product_id]
      );

      if (!stockUpdate.rowsAffected) {
        throw new Error("Insufficient stock to complete this sale. Refresh and try again.");
      }
    }

    // Add payment records
    for (const payment of payments) {
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

    // Record any unpaid balance as debt inside the same transaction, so a
    // failure can't leave a committed sale with no matching debt.
    if (amountOwed > 0) {
      await handleSaleDebt(
        saleId,
        sale.customer_id,
        amountDue,
        totalPaid,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        db
      );
    }

    await db.commit();
    return saleId;
  } catch (error) {
    try { await db.rollback(); } catch { }
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
    "SELECT COALESCE(SUM(total_amount - returned_amount), 0) as total FROM sales WHERE created_at BETWEEN $1 AND $2",
    [toSqlUtc(startOfDay), toSqlUtc(endOfDay)]
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
    [toSqlUtc(startDate), toSqlUtc(endDate)]
  );

  return result;
}

export async function getSalesByCashier(startDate: Date, endDate: Date) {
  const db = new Database();
  const result = await db.select<{ employee_name: string; total: number }[]>(
    `
        SELECT u.name as employee_name, COALESCE(SUM(s.total_amount - s.returned_amount), 0) as total
        FROM users u
        LEFT JOIN sales s ON u.id = s.employee_id 
            AND s.created_at BETWEEN $1 AND $2
        WHERE u.role = 'sales'
        GROUP BY u.id, u.name
        ORDER BY total DESC
    `,
    [toSqlUtc(startDate), toSqlUtc(endDate)]
  );

  return result;
}

export type ReturnLineInput = {
  sale_item_id: string;
  /** In the unit the line was sold in. */
  quantity: number;
  /** false = goods are damaged/expired and do not go back on the shelf. */
  restock?: boolean;
};

export type ReturnSaleInput = {
  sale_id: string;
  lines: ReturnLineInput[];
  reason: string;
  employee_id: string;
  /** How the customer is paid back when more than the unpaid debt is returned. */
  refund_method?: "cash" | "pos" | "transfer";
  kind?: "return" | "void";
};

/**
 * Take goods back from a sale (or the whole sale, see voidSale). Nothing is deleted:
 * stock goes back, any debt still owed on this sale is cancelled first, and only the
 * remainder is refunded. Reports use total_amount - returned_amount, so history stays.
 */
export async function returnSaleItems(input: ReturnSaleInput) {
  const reason = input.reason.trim();
  if (!reason) throw new Error("A reason is required.");
  const lines = input.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0) throw new Error("Choose at least one item to return.");

  const db = await initDatabase();
  try {
    await db.beginTransaction();

    const sale = await db.selectOne<{
      id: string; status: string; total_amount: number; discount: number | null;
      returned_amount: number; returned_cost: number;
    }>("SELECT id, status, total_amount, discount, returned_amount, returned_cost FROM sales WHERE id = ?", [input.sale_id]);
    if (!sale) throw new Error("Sale not found.");
    if (sale.status === "voided") throw new Error("This sale has already been voided.");

    // The debt this sale put on credit, and how much of it is still unpaid.
    const paid = await db.selectOne<{ paid: number }>(
      "SELECT COALESCE(SUM(amount), 0) as paid FROM sale_payments WHERE sale_id = ?", [input.sale_id]);
    const expectedDebt = round2(sale.total_amount - (sale.discount || 0) - Number(paid?.paid || 0));
    const debtor = await db.selectOne<{ id: string; amount_owed: number; original_amount: number | null } | null>(
      "SELECT id, amount_owed, original_amount FROM debtors WHERE sale_id = ?", [input.sale_id]);
    if (debtor) {
      const original = round2(debtor.original_amount ?? debtor.amount_owed);
      if (Math.abs(original - expectedDebt) > 0.005 && sale.returned_amount === 0) {
        // Older merged debt rows can't be split per sale, so reducing one would hit other sales' debt.
        throw new Error("This sale's debt was combined with other sales, so it can't be returned here. Settle the debt first.");
      }
    }

    let returnValue = 0;
    let restockedCost = 0;
    const itemRows: { sale_item_id: string; product_id: string; quantity: number; base_quantity: number; amount: number; restocked: number }[] = [];

    for (const line of lines) {
      const item = await db.selectOne<{
        id: string; product_id: string; quantity: number; base_quantity: number | null;
        total_price: number; cost_price_at_sale: number | null; returned_quantity: number;
      } | null>("SELECT id, product_id, quantity, base_quantity, total_price, cost_price_at_sale, returned_quantity FROM sale_items WHERE id = ? AND sale_id = ?",
        [line.sale_item_id, input.sale_id]);
      if (!item) throw new Error("A selected item is not part of this sale.");

      const remaining = Number(item.quantity) - Number(item.returned_quantity || 0);
      if (line.quantity > remaining + 1e-9) {
        throw new Error("You can't return more than was sold and not yet returned.");
      }

      const fraction = line.quantity / Number(item.quantity);
      const amount = round2(Number(item.total_price) * fraction);
      const baseQty = Number(item.base_quantity ?? item.quantity) * fraction;
      const restock = line.restock !== false;

      await db.executeQuery(
        "UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?",
        [line.quantity, item.id]);
      if (restock) {
        await db.executeQuery(
          "UPDATE products SET quantity_on_hand = quantity_on_hand + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [baseQty, item.product_id]);
        restockedCost += baseQty * Number(item.cost_price_at_sale || 0);
      }
      returnValue += amount;
      itemRows.push({ sale_item_id: item.id, product_id: item.product_id, quantity: line.quantity, base_quantity: baseQty, amount, restocked: restock ? 1 : 0 });
    }

    returnValue = round2(returnValue);

    // 1) cancel unpaid debt on this sale first, 2) refund the rest.
    let debtReduced = 0;
    if (debtor && Number(debtor.amount_owed) > 0) {
      debtReduced = round2(Math.min(Number(debtor.amount_owed), returnValue));
      if (debtReduced > 0) {
        const newOwed = round2(Number(debtor.amount_owed) - debtReduced);
        await db.executeQuery(
          "UPDATE debtors SET amount_owed = ?, original_amount = original_amount - ?, is_paid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [newOwed, debtReduced, newOwed <= 0 ? 1 : 0, debtor.id]);
      }
    }
    const refundAmount = round2(returnValue - debtReduced);
    if (refundAmount > 0 && !input.refund_method) {
      throw new Error("Choose how the refund is paid out.");
    }

    // Void when nothing is left to return on any line.
    const left = await db.selectOne<{ left: number }>(
      "SELECT COALESCE(SUM(quantity - returned_quantity), 0) as left FROM sale_items WHERE sale_id = ?", [input.sale_id]);
    const fullyReturned = Number(left?.left || 0) < 1e-9;

    await db.executeQuery(
      `UPDATE sales SET returned_amount = ?, returned_cost = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [round2(sale.returned_amount + returnValue), round2(sale.returned_cost + restockedCost),
       fullyReturned ? "voided" : "completed", input.sale_id]);

    const { id: returnId } = await db.selectOne<{ id: string }>("SELECT lower(hex(randomblob(16))) as id");
    await db.executeQuery(
      `INSERT INTO sale_returns (id, sale_id, kind, reason, total_amount, debt_reduced, refund_amount, refund_method, employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [returnId, input.sale_id, input.kind ?? (fullyReturned ? "void" : "return"), reason, returnValue,
       debtReduced, refundAmount, refundAmount > 0 ? input.refund_method : null, input.employee_id]);
    for (const row of itemRows) {
      await db.executeQuery(
        `INSERT INTO sale_return_items (sale_return_id, sale_item_id, product_id, quantity, base_quantity, amount, restocked)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [returnId, row.sale_item_id, row.product_id, row.quantity, row.base_quantity, row.amount, row.restocked]);
    }

    await db.commit();
    return { returnId, totalAmount: returnValue, debtReduced, refundAmount };
  } catch (error) {
    try { await db.rollback(); } catch { }
    throw error;
  }
}

/** Reverse a whole sale: every remaining item goes back, debt is cancelled, the rest refunded. */
export async function voidSale(
  saleId: string,
  reason: string,
  employeeId: string,
  refundMethod?: "cash" | "pos" | "transfer"
) {
  const items = await getSaleItems(saleId);
  const lines = items
    .map((item) => ({
      sale_item_id: item.id,
      quantity: Number(item.quantity) - Number(item.returned_quantity || 0),
    }))
    .filter((l) => l.quantity > 0);
  if (lines.length === 0) {
    throw new Error("This sale has already been voided.");
  }
  return returnSaleItems({
    sale_id: saleId,
    lines,
    reason,
    employee_id: employeeId,
    refund_method: refundMethod,
    kind: "void",
  });
}

export async function getSaleReturns(saleId: string) {
  const db = await initDatabase();
  return await db.select<TSaleReturn[]>(
    `SELECT r.*, u.name as employee_name
     FROM sale_returns r
     LEFT JOIN users u ON u.id = r.employee_id
     WHERE r.sale_id = $1
     ORDER BY r.created_at DESC`,
    [saleId]
  );
}
