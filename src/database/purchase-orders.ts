import { initDatabase } from ".";

export interface PurchaseOrder {
    id: string;
    supplier_id: string;
    supplier_name: string;
    order_date: string;
    status: 'pending' | 'approved' | 'partially_received' | 'received' | 'cancelled';
    items?: PurchaseOrderItem[];
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrderItem {
    id: string;
    purchase_order_id: string;
    product_id: string;
    product_name: string;
    quantity_ordered: number;
    unit_price: number;
}

export async function getPurchaseOrders() {
    const db = await initDatabase()
    return await db.select<PurchaseOrder[]>(`
        SELECT po.*, s.supplier_name 
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        ORDER BY po.created_at DESC
    `);
}

export async function createPurchaseOrder(
    order: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'items'>,
    items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'product_name'>[]
) {
    const db = await initDatabase()
    try {
        await db.beginTransaction();

        const { orderId } = await db.selectOne<{ orderId: string }>(
            `SELECT lower(hex(randomblob(16))) as orderId`
        );

        await db.executeQuery(
            `INSERT INTO purchase_orders (id, supplier_id, order_date, status)
             VALUES ($1, $2, $3, $4)`,
            [orderId, order.supplier_id, order.order_date, order.status]
        );

        for (const item of items) {
            await db.executeQuery(
                `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.product_id, item.quantity_ordered, item.unit_price]
            );
        }

        await db.commit();
        return orderId;
    } catch (error) {
        console.log(error)
        await db.rollback();
        throw error;
    }
}

export async function getPurchaseOrderItems(orderId: string) {
    const db = await initDatabase()
    return await db.select<PurchaseOrderItem[]>(`
        SELECT poi.*, p.name as product_name
        FROM purchase_order_items poi
        JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = $1
    `, [orderId]);
}

export async function updatePurchaseOrderStatus(orderId: string, status: PurchaseOrder['status']) {
    const db = await initDatabase()
    await db.execute(
        'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, orderId]
    );
}

export async function deletePurchaseOrder(orderId: string) {
    const db = await initDatabase()
    try {
        await db.beginTransaction();
        
        await db.executeQuery(
            'DELETE FROM purchase_order_items WHERE purchase_order_id = $1',
            [orderId]
        );
        
        await db.executeQuery(
            'DELETE FROM purchase_orders WHERE id = $1',
            [orderId]
        );
        
        await db.commit();
    } catch (error) {
        await db.rollback();
        throw error;
    }
}

// Add these new functions
export async function createPurchaseReceipt(data: {
  purchase_order_id: string;
  employee_id: string;
  items: Array<{
    product_id: string;
    quantity_received: number;
  }>;
}) {
  const db = await initDatabase()
  try {
    await db.beginTransaction();

    const { receiptId } = await db.selectOne<{ receiptId: string }>(
      `SELECT lower(hex(randomblob(16))) as receiptId`
    );

    // Create purchase receipt
    await db.executeQuery(
      `INSERT INTO purchase_receipts (id, purchase_order_id, employee_id)
       VALUES ($1, $2, $3)`,
      [receiptId, data.purchase_order_id, data.employee_id]
    );

    // Insert receipt items
    for (const item of data.items) {
      await db.executeQuery(
        `INSERT INTO purchase_receipt_items (id, purchase_receipt_id, product_id, quantity_received)
         VALUES (lower(hex(randomblob(16))), $1, $2, $3)`,
        [receiptId, item.product_id, item.quantity_received]
      );
    }

    // Update product quantities
    for (const item of data.items) {
      await db.executeQuery(
        `UPDATE products 
         SET quantity_on_hand = quantity_on_hand + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [item.quantity_received, item.product_id]
      );
    }

    // Check if all items are received
    const [orderItems, receivedItems] = await Promise.all([
      db.select(
        `SELECT product_id, quantity_ordered FROM purchase_order_items WHERE purchase_order_id = $1`,
        [data.purchase_order_id]
      ),
      db.select(
        `SELECT pri.product_id, SUM(pri.quantity_received) as total_received
         FROM purchase_receipt_items pri
         JOIN purchase_receipts pr ON pr.id = pri.purchase_receipt_id
         WHERE pr.purchase_order_id = $1
         GROUP BY pri.product_id`,
        [data.purchase_order_id]
      )
    ]);

    const isFullyReceived = orderItems.every(orderItem => {
      const received = receivedItems.find(r => r.product_id === orderItem.product_id);
      return received && received.total_received >= orderItem.quantity_ordered;
    });

    // Update PO status
    await db.executeQuery(
      `UPDATE purchase_orders 
       SET status = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [isFullyReceived ? 'received' : 'partially_received', data.purchase_order_id]
    );

    await db.commit();
    return receiptId;
  } catch (error) {
    await db.rollback();
    throw error;
  }
}