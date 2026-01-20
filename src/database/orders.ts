import { initDatabase } from "./index";

export type PurchaseOrderStatus = 'pending' | 'partially_received' | 'received' | 'cancelled';
export type PurchaseReceiptStatus = 'pending' | 'approved' | 'rejected';

export interface PurchaseOrder {
    id: string;
    order_date: string;
    supplier_id: string;
    employee_id: string;
    total_cost: number;
    status: PurchaseOrderStatus;
    created_at: string;
    updated_at: string;
    supplier_name?: string; // Joined field
    items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
    id: string;
    purchase_order_id: string;
    product_id: string;
    unit_id?: string;
    quantity_ordered: number;
    unit_price: number;
    total_price: number;
    product_name?: string; // Joined field
    unit_name?: string; // Joined field (from common_units via product_units or direct if possible)
    conversion_to_base?: number; // Joined field
    quantity_received_base?: number; // Calculated on fetch
}

export interface PurchaseReceipt {
    id: string;
    purchase_order_id: string;
    received_date: string;
    employee_id: string;
    status: PurchaseReceiptStatus;
    items?: PurchaseReceiptItem[];
}

export interface PurchaseReceiptItem {
    id: string;
    purchase_receipt_id: string;
    product_id: string;
    unit_id?: string;
    quantity_received: number;
    product_name?: string; // Joined
    unit_name?: string; // Joined
}

export const createPurchaseOrder = async (
    supplierId: string,
    employeeId: string,
    items: { productId: string; quantity: number; unitPrice: number; unitId?: string }[]
) => {
    const db = await initDatabase();

    // Generate distinct ID first
    const { id: poId } = await db.selectOne<{ id: string }>(`SELECT lower(hex(randomblob(16))) as id`);

    try {
        await db.beginTransaction();

        const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        await db.executeQuery(`
            INSERT INTO purchase_orders (id, supplier_id, employee_id, total_cost, status)
            VALUES ($1, $2, $3, $4, 'pending')
        `, [poId, supplierId, employeeId, totalCost]);

        for (const item of items) {
            await db.executeQuery(`
                INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price, total_price, unit_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [poId, item.productId, item.quantity, item.unitPrice, item.quantity * item.unitPrice, item.unitId || null]);
        }

        await db.commit();
        return poId;
    } catch (error) {
        try { await db.rollback(); } catch { }
        throw error;
    }
};

export const getPurchaseOrders = async (status?: PurchaseOrderStatus | PurchaseOrderStatus[]) => {
    const db = await initDatabase();
    let query = `
        SELECT po.*, s.supplier_name 
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
    `;
    const params: any[] = [];

    if (status) {
        if (Array.isArray(status)) {
            // Create placeholders like $1, $2 based on array length
            const placeholders = status.map((_, i) => `$${i + 1}`).join(', ');
            query += ` WHERE po.status IN (${placeholders})`;
            params.push(...status);
        } else {
            query += ` WHERE po.status = $1`;
            params.push(status);
        }
    }

    query += ` ORDER BY po.order_date DESC`;

    const result = await db.select<PurchaseOrder[]>(query, params);
    return result;
};

export const getPurchaseOrderById = async (id: string) => {
    const db = await initDatabase();

    // Fetch PO
    const po = await db.selectOne<PurchaseOrder>(`
        SELECT po.*, s.supplier_name 
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.id = $1
    `, [id]);

    if (!po) return null;

    // Fetch Items with Unit Names
    // We join product_units to link to common_units.
    // We also join purchase_receipt_items and purchase_receipts to calculate total received qty (in base units)
    const items = await db.select<(PurchaseOrderItem & { product_name: string, unit_name: string, quantity_received_base: number })[]>(`
        SELECT 
            poi.*, 
            p.name as product_name, 
            cu.name as unit_name,
            pu.conversion_to_base,
            COALESCE(SUM(
                CASE WHEN pr.status = 'approved' THEN 
                    pri.quantity_received * COALESCE(pu_rec.conversion_to_base, 1)
                ELSE 0 END
            ), 0) as quantity_received_base
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        LEFT JOIN product_units pu ON poi.unit_id = pu.id
        LEFT JOIN common_units cu ON pu.unit_id = cu.id
        -- Join Receipts to calculate progress
        LEFT JOIN purchase_receipt_items pri ON poi.product_id = pri.product_id 
        LEFT JOIN purchase_receipts pr ON pri.purchase_receipt_id = pr.id AND pr.purchase_order_id = poi.purchase_order_id
        LEFT JOIN product_units pu_rec ON pri.unit_id = pu_rec.id
        WHERE poi.purchase_order_id = $1
        GROUP BY poi.id
    `, [id]);

    return {
        ...po,
        items
    } as PurchaseOrder;
};

export const createPurchaseReceipt = async (
    purchaseOrderId: string,
    employeeId: string,
    items: { productId: string; quantityReceived: number; unitId?: string }[]
) => {
    const db = await initDatabase();

    // Generate distinct ID
    const { id: receiptId } = await db.selectOne<{ id: string }>(`SELECT lower(hex(randomblob(16))) as id`);

    try {
        await db.beginTransaction();

        await db.executeQuery(`
            INSERT INTO purchase_receipts (id, purchase_order_id, employee_id, status)
            VALUES ($1, $2, $3, 'pending')
        `, [receiptId, purchaseOrderId, employeeId]);

        for (const item of items) {
            if (item.quantityReceived > 0) {
                await db.executeQuery(`
                    INSERT INTO purchase_receipt_items (purchase_receipt_id, product_id, quantity_received, unit_id)
                    VALUES ($1, $2, $3, $4)
                `, [receiptId, item.productId, item.quantityReceived, item.unitId || null]);
            }
        }

        await db.commit();
        return receiptId;
    } catch (error) {
        try { await db.rollback(); } catch { }
        throw error;
    }
};

export const getPendingReceipts = async () => {
    const db = await initDatabase();
    const result = await db.select<(PurchaseReceipt & { po_ref: string, supplier_name: string, receiver_name: string })[]>(`
        SELECT pr.*, po.id as po_ref, s.supplier_name, u.name as receiver_name
        FROM purchase_receipts pr
        JOIN purchase_orders po ON pr.purchase_order_id = po.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON pr.employee_id = u.id
        WHERE pr.status = 'pending'
        ORDER BY pr.received_date DESC
    `);

    // For each receipt, fetch items
    for (const receipt of result) {
        const items = await db.select<PurchaseReceiptItem[]>(`
            SELECT pri.*, p.name as product_name, cu.name as unit_name
            FROM purchase_receipt_items pri
            LEFT JOIN products p ON pri.product_id = p.id
            LEFT JOIN product_units pu ON pri.unit_id = pu.id
            LEFT JOIN common_units cu ON pu.unit_id = cu.id
            WHERE pri.purchase_receipt_id = $1
         `, [receipt.id]);
        receipt.items = items;
    }

    return result;
}

export const approveReceipt = async (receiptId: string) => {
    const db = await initDatabase();
    try {
        await db.beginTransaction();

        // 0. Get Receipt Info to know PO ID
        const receipt = await db.selectOne<PurchaseReceipt>(`SELECT * FROM purchase_receipts WHERE id = $1`, [receiptId]);
        if (!receipt) throw new Error("Receipt not found");

        // 1. Get Receipt Items
        const items = await db.select<PurchaseReceiptItem[]>(`
            SELECT * FROM purchase_receipt_items WHERE purchase_receipt_id = $1
        `, [receiptId]);

        // 2. Update Inventory for each item (Handling Conversions)
        for (const item of items) {
            let quantityToAdd = item.quantity_received;

            // If unit_id is present, we need to convert to base unit
            if (item.unit_id) {
                const productUnit = await db.selectOne<{ conversion_to_base: number }>(`
                    SELECT conversion_to_base FROM product_units WHERE id = $1
                `, [item.unit_id]);

                if (productUnit) {
                    quantityToAdd = item.quantity_received * productUnit.conversion_to_base;
                }
            }

            await db.executeQuery(`
                UPDATE products 
                SET quantity_on_hand = quantity_on_hand + $1 
                WHERE id = $2
            `, [quantityToAdd, item.product_id]);
        }

        // 3. Mark Receipt as Approved
        await db.executeQuery(`
            UPDATE purchase_receipts SET status = 'approved' WHERE id = $1
        `, [receiptId]);

        // 4. Update PO Status
        // Calculate total ordered vs total approved received for this PO
        const poId = receipt.purchase_order_id;

        const poItems = await db.select<{ product_id: string, total_ordered: number }[]>(`
             SELECT poi.product_id, SUM(quantity_ordered * COALESCE(pu.conversion_to_base, 1)) as total_ordered
             FROM purchase_order_items poi
             LEFT JOIN product_units pu ON poi.unit_id = pu.id
             WHERE purchase_order_id = $1
             GROUP BY poi.product_id
        `, [poId]);

        const receivedItems = await db.select<{ product_id: string, total_received: number }[]>(`
            SELECT pri.product_id, SUM(pri.quantity_received * COALESCE(pu.conversion_to_base, 1)) as total_received
            FROM purchase_receipt_items pri
            JOIN purchase_receipts pr ON pri.purchase_receipt_id = pr.id
            LEFT JOIN product_units pu ON pri.unit_id = pu.id
            WHERE pr.purchase_order_id = $1 AND pr.status = 'approved'
            GROUP BY pri.product_id
        `, [poId]);

        let allReceived = true;
        let anyReceived = receivedItems.length > 0;

        // Map received quantities for easy lookup
        const receivedMap = new Map<string, number>();
        receivedItems.forEach(r => receivedMap.set(r.product_id, r.total_received));

        for (const poItem of poItems) {
            const received = receivedMap.get(poItem.product_id) || 0;
            if (received < poItem.total_ordered) {
                allReceived = false;
                break;
            }
        }

        let newStatus: PurchaseOrderStatus = 'pending';
        if (allReceived) {
            newStatus = 'received';
        } else if (anyReceived) {
            newStatus = 'partially_received';
        } else {
            newStatus = 'pending'; // Should strictly not happen if we just approved a receipt, but for safety
        }

        await db.executeQuery(`UPDATE purchase_orders SET status = $1 WHERE id = $2`, [newStatus, poId]);

        await db.commit();
    } catch (error) {
        try { await db.rollback(); } catch { }
        throw error;
    }
}
