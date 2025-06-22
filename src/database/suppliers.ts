import { initDatabase } from ".";

export interface Supplier {
    id: string;
    supplier_name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    created_at: string;
    updated_at: string;
}

export async function getSuppliers() {
    const db = await initDatabase();
    return await db.select<Supplier[]>(
        'SELECT * FROM suppliers ORDER BY created_at DESC'
    );
}

export async function createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    const db = await initDatabase();
    try {

        await db.execute(
            `INSERT INTO suppliers (supplier_name, contact_person, email, phone, address) 
             VALUES ($1, $2, $3, $4, $5)`,
            [supplier.supplier_name, supplier.contact_person, supplier.email, supplier.phone, supplier.address]
        );

        return true;
    } catch (error) {
        console.error('Error creating supplier:', error);
        throw error;
    }
}

export async function deleteSupplier(id: string) {
    const db = await initDatabase();
    await db.execute('DELETE FROM suppliers WHERE id = $1', [id]);
}