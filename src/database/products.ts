import { TProduct } from "@/types/database";
import { initDatabase } from ".";

export async function getProducts() {
    const db = await initDatabase();
    const result = await db.select<TProduct[]>('SELECT * FROM products ORDER BY name ASC');
    return result;
}

export async function getProductById(id: string) {
    const db = await initDatabase();
    const [product] = await db.select<TProduct[]>('SELECT * FROM products WHERE id = $1', [id]);
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
    const updates = Object.entries(product)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => `${key} = $${key}`);
    
    if (updates.length === 0) return;

    const query = `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    await db.execute(query, [id]);
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