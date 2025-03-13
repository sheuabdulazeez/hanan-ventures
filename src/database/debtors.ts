import { TDebtor, TDebtorPayment } from "@/types/database";
import { initDatabase } from ".";

export async function getDebtors() {
    const db = await initDatabase();
    const result = await db.select<TDebtor[]>(`
        SELECT d.*, c.name as customer_name, s.total_amount as sale_amount
        FROM debtors d
        JOIN customers c ON d.customer_id = c.id
        JOIN sales s ON d.sale_id = s.id
        WHERE d.is_paid = 0
        ORDER BY d.due_date ASC
    `);
    return result;
}

export async function getDebtorById(id: string) {
    const db = await initDatabase();
    const [debtor] = await db.select<TDebtor[]>(`
        SELECT d.*, c.name as customer_name, s.total_amount as sale_amount
        FROM debtors d
        JOIN customers c ON d.customer_id = c.id
        JOIN sales s ON d.sale_id = s.id
        WHERE d.id = $1
    `, [id]);
    return debtor;
}

export async function createDebtor(debtor: Omit<TDebtor, "id" | "created_at" | "updated_at">) {
    const db = await initDatabase();
    const { lastInsertId: id } = await db.execute(
        'INSERT INTO debtors (sale_id, customer_id, amount_owed, due_date, is_paid) VALUES ($1, $2, $3, $4, $5)',
        [debtor.sale_id, debtor.customer_id, debtor.amount_owed, debtor.due_date, debtor.is_paid]
    );
    return id;
}

export async function recordDebtPayment(payment: Omit<TDebtorPayment, "id" | "created_at" | "updated_at">) {
    const db = await initDatabase();
    
    try {
        const { amount_owed } = await db.selectOne<{ amount_owed: number }>(
            'SELECT amount_owed FROM debtors WHERE id = $1',
            [payment.debtor_id]
        );

        await db.beginTransaction()
        // Record the payment
        const { lastInsertId: paymentId } = await db.executeQuery(
            'INSERT INTO debtor_payments (debtor_id, payment_date, payment_method, bank_name, amount_paid, employee_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [payment.debtor_id, payment.payment_date, payment.payment_method, payment.bank_name, payment.amount_paid, payment.employee_id]
        );

        // Update debtor record
        const remaining = amount_owed - payment.amount_paid;
        await db.executeQuery(
            'UPDATE debtors SET amount_owed = $1, is_paid = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [remaining, remaining <= 0 ? 1 : 0, payment.debtor_id]
        );

        await db.commit();
        return paymentId;
    } catch (error) {
        await db.rollback();
        throw error;
    }
}

export async function getDebtorPayments(debtorId: string) {
    const db = await initDatabase();
    const payments = await db.select<TDebtorPayment[]>(`
        SELECT dp.*, u.name as employee_name
        FROM debtor_payments dp
        JOIN users u ON dp.employee_id = u.id
        WHERE dp.debtor_id = $1
        ORDER BY dp.payment_date DESC
    `, [debtorId]);
    return payments;
}

export async function getOverdueDebtors() {
    const db = await initDatabase();
    const result = await db.select<TDebtor[]>(`
        SELECT d.*, c.name as customer_name, s.total_amount as sale_amount
        FROM debtors d
        JOIN customers c ON d.customer_id = c.id
        JOIN sales s ON d.sale_id = s.id
        WHERE d.is_paid = 0 AND d.due_date < CURRENT_TIMESTAMP
        ORDER BY d.due_date ASC
    `);
    return result;
}

export async function handleSaleDebt(
    saleId: string,
    customerId: string,
    totalAmount: number,
    amountPaid: number,
    dueDate: Date
) {
    const db = await initDatabase();
    
    try {

        const amountOwed = totalAmount - amountPaid;

        if (amountOwed > 0) {
            // Check if customer already has debt
            const existingDebtor = await db.selectOne<TDebtor>(
                'SELECT * FROM debtors WHERE customer_id = $1 AND is_paid = 0',
                [customerId]
            );

            if (existingDebtor) {
                // Update existing debt
                await db.execute(
                    `UPDATE debtors 
                     SET amount_owed = amount_owed + $1,
                         due_date = CASE 
                             WHEN due_date < $2 THEN $2 
                             ELSE due_date 
                         END,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [amountOwed, dueDate, existingDebtor.id]
                );
            } else {
                // Create new debt record
                await db.execute(
                    `INSERT INTO debtors (
                        sale_id, 
                        customer_id, 
                        amount_owed, 
                        due_date, 
                        is_paid
                    ) VALUES ($1, $2, $3, $4, 0)`,
                    [saleId, customerId, amountOwed, dueDate]
                );
            }
        }

    } catch (error) {
        throw error;
    }
}

export async function getCustomerDebtHistory(customerId: string) {
    const db = await initDatabase();
    
    const result = await db.select<(TDebtor & { payments: string })[]>(`
        SELECT 
            d.*,
            c.name as customer_name,
            s.total_amount as sale_amount,
            CASE 
                WHEN MAX(dp.id) IS NULL THEN '[]'
                ELSE json_group_array(
                    json_object(
                        'id', dp.id,
                        'payment_date', dp.payment_date,
                        'amount_paid', dp.amount_paid,
                        'payment_method', dp.payment_method,
                        'bank_name', dp.bank_name,
                        'employee_name', u.name
                    )
                ) 
            END as payments
        FROM debtors d
        JOIN customers c ON d.customer_id = c.id
        JOIN sales s ON d.sale_id = s.id
        LEFT JOIN debtor_payments dp ON d.id = dp.debtor_id
        LEFT JOIN users u ON dp.employee_id = u.id
        WHERE d.customer_id = $1
        GROUP BY d.id
        ORDER BY d.created_at DESC
    `, [customerId]);


    // Parse the JSON string into actual arrays
    return result.map(debt => ({
        ...debt,
        payments: JSON.parse(debt.payments) as TDebtorPayment[]
    }));
}