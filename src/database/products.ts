import { TProduct, TProductPriceHistory, TInventoryAdjustment } from "@/types/database";
import { initDatabase } from ".";

export async function getProducts() {
    const db = await initDatabase();
    const result = await db.select<TProduct[]>('SELECT * FROM products ORDER BY name ASC');
    return result;
}

export async function getProductById(id: string) {
    const db = await initDatabase();
    const product = await db.selectOne<TProduct>('SELECT * FROM products WHERE id = $1', [id]);
    return product;
}

export async function createProduct(product: Omit<TProduct, "id" | "created_at" | "updated_at" | "reorder_level" | "description">) {
    const db = await initDatabase();
    const { lastInsertId: id } = await db.execute(
        'INSERT INTO products (name, category, cost_price, selling_price, quantity_on_hand) VALUES ($1, $2, $3, $4, $5)',
        [
            product.name,
            product.category,
            product.cost_price,
            product.selling_price,
            product.quantity_on_hand,
        ]
    );
    return id;
}

export async function updateProduct(id: string, product: Partial<Omit<TProduct, "id" | "created_at" | "updated_at">>) {
    const db = await initDatabase();
        const filteredEntries = Object.entries(product)
        .filter(([_, value]) => value !== undefined);
    
    if (filteredEntries.length === 0) return;

    const updates = filteredEntries
        .map(([key, _], index) => `${key} = $${index+2}`);

    const params = filteredEntries.map(([_, value]) => value);
    
    if (updates.length === 0) return;

    const query = `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    await db.execute(query, [id, ...params]);
}

export async function updateProductQuantity(id: string, quantity: number, reason: string) {
    const db = await initDatabase();
    try {
      await db.beginTransaction();
  
      // Update product quantity
      await db.executeQuery(
        `UPDATE products 
         SET quantity_on_hand = quantity_on_hand + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [quantity, id]
      );
  
      // Log the quantity adjustment
      await db.executeQuery(
        `INSERT INTO inventory_adjustments (id, product_id, quantity_changed, reason)
         VALUES (lower(hex(randomblob(16))), $1, $2, $3)`,
        [id, quantity, reason]
      );
  
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

export async function deleteProduct(id: string) {
    const db = await initDatabase();
    await db.execute('DELETE FROM products WHERE id = $1', [id]);
}

export async function getLowStockProducts() {
    const db = await initDatabase();
    const result = await db.select<TProduct[]>(
        'SELECT * FROM products WHERE quantity_on_hand <= reorder_level ORDER BY quantity_on_hand ASC'
    );
    return result;
}

export async function updateStock(id: string, quantity: number) {
    const db = await initDatabase();
    await db.execute(
        'UPDATE products SET quantity_on_hand = quantity_on_hand + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, id]
    );
}

export async function getProductsByCategory(category: string) {
    const db = await initDatabase();
    const result = await db.select<TProduct[]>(
        'SELECT * FROM products WHERE category = $1 ORDER BY product_name ASC',
        [category]
    );
    return result;
}

export async function searchProducts(query: string) {
    const db = await initDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.select<TProduct[]>(
        'SELECT * FROM products WHERE product_name LIKE $1 OR description LIKE $1 OR category LIKE $1',
        [searchTerm]
    );
    return result;
}

export async function updateProductPrices(id: string, prices: { costPrice?: number; sellingPrice?: number }, reason?: string, changedBy?: string) {
  const db = await initDatabase();
  try {
    await db.beginTransaction();
    
    // Get current prices
    const currentProduct = await db.selectOne<TProduct>(
      'SELECT cost_price, selling_price FROM products WHERE id = $1',
      [id]
    );
    
    if (!currentProduct) {
      throw new Error('Product not found');
    }
    
    // Record price changes in history
    if (changedBy) {
      if (prices.costPrice !== undefined && prices.costPrice !== currentProduct.cost_price) {
        await db.executeQuery(
          `INSERT INTO product_price_history 
           (product_id, old_cost_price, new_cost_price, change_reason, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, currentProduct.cost_price, prices.costPrice, reason || 'Cost price update', changedBy]
        );
      }
      
      if (prices.sellingPrice !== undefined && prices.sellingPrice !== currentProduct.selling_price) {
        await db.executeQuery(
          `INSERT INTO product_price_history 
           (product_id, old_selling_price, new_selling_price, change_reason, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, currentProduct.selling_price, prices.sellingPrice, reason || 'Selling price update', changedBy]
        );
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (prices.costPrice !== undefined) {
      updates.push(`cost_price = $${paramIndex}`);
      values.push(prices.costPrice);
      paramIndex++;
    }
    
    if (prices.sellingPrice !== undefined) {
      updates.push(`selling_price = $${paramIndex}`);
      values.push(prices.sellingPrice);
      paramIndex++;
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      await db.executeQuery(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }
    
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

export async function getProductPriceHistory(productId: string): Promise<TProductPriceHistory[]> {
  const db = await initDatabase();
  const history = await db.select<TProductPriceHistory[]>(
    `SELECT pph.*, u.name as changed_by_name
     FROM product_price_history pph
     LEFT JOIN users u ON pph.changed_by = u.id
     WHERE pph.product_id = $1
     ORDER BY pph.created_at DESC`,
    [productId]
  );
  return history;
}

export async function getProductInventoryHistory(productId: string): Promise<TInventoryAdjustment[]> {
  const db = await initDatabase();
  const history = await db.select<TInventoryAdjustment[]>(
    `SELECT i.*, u.name as changed_by_name
     FROM inventory_adjustments i
     LEFT JOIN users u ON i.changed_by = u.id
     WHERE product_id = $1
     ORDER BY created_at DESC`,
    [productId]
  );
  return history;
}

export async function getProductAnalytics(productId: string) {
  const db = await initDatabase();
  
  // Get product details
  const product = await db.selectOne<TProduct>(
    'SELECT * FROM products WHERE id = $1',
    [productId]
  );
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Get price history
  const priceHistory = await getProductPriceHistory(productId);
  
  // Get sales data
  const salesData = await db.selectOne(
    `SELECT 
       COUNT(DISTINCT si.sale_id) as totalTransactions,
       SUM(si.quantity) as totalSales,
       SUM(si.total_price) as totalRevenue,
       AVG(si.unit_price) as avgSellingPrice,
       MIN(si.unit_price) as minSellingPrice,
       MAX(si.unit_price) as maxSellingPrice,
       ((SUM(si.profit) / SUM(si.total_price)) * 100) as profitMargin,
       (SUM(si.profit) / SUM(si.quantity)) as avgProfitPerSale,
       SUM(si.profit) as totalProfit
     FROM sale_items si
     WHERE si.product_id = $1`,
    [productId]
  );
  // is stockValue not supposed to be product quantity on hand * current selling price?

  
  // Get monthly sales trend
  const monthlySales = await db.select(
    `SELECT 
       strftime('%Y-%m', s.sale_date) as month,
       SUM(si.quantity) as quantity_sold,
       SUM(si.total_price) as revenue,
       SUM(si.profit) as profit
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE si.product_id = $1
     GROUP BY strftime('%Y-%m', s.sale_date)
     ORDER BY month DESC
     LIMIT 12`,
    [productId]
  );
  
  salesData.stockValue = product.quantity_on_hand * product.selling_price;
  return {
    product,
    priceHistory,
    salesData: salesData,
    monthlySales
  };
}