import { TCustomer } from "@/types/database";
import { initDatabase } from ".";

export async function getCustomers() {
    const db = await initDatabase();
    const result = await db.select<TCustomer[]>('SELECT * FROM customers ORDER BY name ASC');
    return result;
}

export async function getCustomerById(id: string) {
    const db = await initDatabase();
    const customer = await db.selectOne<TCustomer>('SELECT * FROM customers WHERE id = $1', [id]);
    return customer;
}

export async function createCustomer(customer: Omit<TCustomer, "id" | "created_at" | "updated_at">) {
    const db = await initDatabase();
    const { lastInsertId: id } = await db.execute(
        'INSERT INTO customers (name, phone, email, address) VALUES ($1, $2, $3, $4)',
        [customer.name, customer.phone, customer.email, customer.address]
    );
    return id;
}

export async function updateCustomer(id: string, customer: Partial<Omit<TCustomer, "id" | "created_at" | "updated_at">>) {
    const db = await initDatabase();
    const updates = Object.entries(customer)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => `${key} = $${key}`);
    
    if (updates.length === 0) return;

    const query = `UPDATE customers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    await db.execute(query, [ id ]);
}

export async function searchCustomers(query: string) {
    const db = await initDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.select<TCustomer[]>(
        'SELECT * FROM customers WHERE name LIKE $1 OR phone LIKE $1 OR email LIKE $1',
        [searchTerm]
    );
    return result;
}

export async function ensureWalkInCustomer() {
  const db = await initDatabase();
  
  // Check if walk-in customer exists
  const walkIn = await db.selectOne<TCustomer>('SELECT * FROM customers WHERE id = $1', ["WALK-IN"]);
  
  if (!walkIn?.id) {
    // Create walk-in customer if it doesn't exist
    await db.execute(`
      INSERT INTO customers (id, name, phone, email, address)
      VALUES ('WALK-IN', 'Walk-in Customer', '', '', '')
    `);
  }
}