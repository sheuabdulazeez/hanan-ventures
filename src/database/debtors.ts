import { TDebtor, TDebtorPayment, TDebtorSale } from "@/types/database";
import { Database, initDatabase, round2, toSqlUtc } from ".";

/*
 * Debt model: every credit sale owns one `debtors` row (amount_owed = what is
 * still unpaid on that sale, original_amount = what it put on credit).
 *
 * The UI mostly thinks per customer, so the list/summary functions below return
 * one aggregated TDebtor per customer whose `id` is the customer id. Payments are
 * taken per customer and applied oldest-first across that customer's open sales.
 */

const CUSTOMER_DEBT_SELECT = `
    SELECT
        d.customer_id as id,
        d.customer_id,
        c.name as customer_name,
        SUM(d.amount_owed) as amount_owed,
        SUM(COALESCE(d.original_amount, d.amount_owed)) as original_amount,
        MIN(d.due_date) as due_date,
        MIN(d.created_at) as created_at,
        MAX(d.updated_at) as updated_at,
        COUNT(*) as sale_count,
        0 as is_paid
    FROM debtors d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.is_paid = 0
`;

export async function getDebtors() {
    const db = await initDatabase();
    return await db.select<TDebtor[]>(`
        ${CUSTOMER_DEBT_SELECT}
        GROUP BY d.customer_id, c.name
        ORDER BY MIN(d.due_date) ASC
    `);
}

export async function getOverdueDebtors() {
    const db = await initDatabase();
    return await db.select<TDebtor[]>(`
        ${CUSTOMER_DEBT_SELECT}
          AND d.due_date < CURRENT_TIMESTAMP
        GROUP BY d.customer_id, c.name
        ORDER BY MIN(d.due_date) ASC
    `);
}

/** Aggregated open debt for one customer, or null if they owe nothing. */
export async function getDebtorByCustomerId(customerId: string) {
    const db = await initDatabase();
    return await db.selectOne<TDebtor | null>(`
        ${CUSTOMER_DEBT_SELECT}
          AND d.customer_id = $1
        GROUP BY d.customer_id, c.name
    `, [customerId]);
}

/** The individual credit sales a customer still owes on, oldest first. */
export async function getCustomerOpenDebts(customerId: string) {
    const db = await initDatabase();
    return await db.select<TDebtorSale[]>(`
        SELECT
            d.id,
            d.sale_id,
            d.customer_id,
            d.amount_owed,
            COALESCE(d.original_amount, d.amount_owed) as original_amount,
            d.due_date,
            d.created_at,
            s.total_amount as sale_amount,
            s.created_at as sale_date
        FROM debtors d
        JOIN sales s ON d.sale_id = s.id
        WHERE d.customer_id = $1 AND d.is_paid = 0
        ORDER BY d.created_at ASC, d.rowid ASC
    `, [customerId]);
}

export async function createDebtor(debtor: Omit<TDebtor, "id" | "created_at" | "updated_at">) {
    const db = await initDatabase();
    const { lastInsertId: id } = await db.execute(
        'INSERT INTO debtors (sale_id, customer_id, amount_owed, original_amount, due_date, is_paid) VALUES ($1, $2, $3, $3, $4, $5)',
        [debtor.sale_id, debtor.customer_id, debtor.amount_owed, debtor.due_date, debtor.is_paid]
    );
    return id;
}

type RecordDebtPaymentInput = {
    customer_id: string;
    payment_date: string;
    payment_method: TDebtorPayment["payment_method"];
    bank_name?: string;
    amount_paid: number;
    employee_id: string;
};

/**
 * Take a payment from a customer and apply it oldest-first across their open
 * credit sales. Writes one debtor_payments row per sale touched, all sharing a
 * payment_group_id so the payment still reads as a single receipt.
 * Returns the payment group id.
 */
export async function recordDebtPayment(payment: RecordDebtPaymentInput) {
    const db = await initDatabase();
    const amountPaid = round2(payment.amount_paid);

    if (!(amountPaid > 0)) {
        throw new Error("Payment amount must be greater than zero.");
    }

    try {
        await db.beginTransaction();

        // Read balances inside the transaction so they can't change under us.
        const openDebts = await db.select<{ id: string; amount_owed: number }[]>(
            `SELECT id, amount_owed FROM debtors
             WHERE customer_id = $1 AND is_paid = 0
             ORDER BY created_at ASC, rowid ASC`,
            [payment.customer_id]
        );
        if (openDebts.length === 0) {
            throw new Error("This customer has no outstanding debt.");
        }

        const totalOwed = round2(openDebts.reduce((sum, d) => sum + round2(d.amount_owed), 0));
        if (amountPaid > totalOwed) {
            throw new Error(`Payment exceeds the outstanding balance of ${totalOwed.toFixed(2)}.`);
        }

        const { id: groupId } = await db.selectOne<{ id: string }>(
            `SELECT lower(hex(randomblob(16))) as id`
        );

        let remainingPayment = amountPaid;
        for (const debt of openDebts) {
            if (remainingPayment <= 0) break;

            const owed = round2(debt.amount_owed);
            const applied = Math.min(owed, remainingPayment);
            remainingPayment = round2(remainingPayment - applied);
            const newOwed = round2(owed - applied);

            await db.executeQuery(
                `INSERT INTO debtor_payments (debtor_id, payment_date, payment_method, bank_name, amount_paid, employee_id, payment_group_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [debt.id, payment.payment_date, payment.payment_method, payment.bank_name || null, applied, payment.employee_id, groupId]
            );

            await db.executeQuery(
                'UPDATE debtors SET amount_owed = $1, is_paid = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [newOwed, newOwed <= 0 ? 1 : 0, debt.id]
            );
        }

        await db.commit();
        return groupId;
    } catch (error) {
        try { await db.rollback(); } catch { }
        throw error;
    }
}

/** A customer's payments, one entry per payment (split allocations are summed). */
export async function getDebtorPayments(customerId: string) {
    const db = await initDatabase();
    return await db.select<TDebtorPayment[]>(`
        SELECT
            COALESCE(dp.payment_group_id, dp.id) as id,
            COALESCE(dp.payment_group_id, dp.id) as payment_group_id,
            MIN(dp.debtor_id) as debtor_id,
            MIN(dp.payment_date) as payment_date,
            dp.payment_method,
            dp.bank_name,
            SUM(dp.amount_paid) as amount_paid,
            dp.employee_id,
            u.name as employee_name,
            MIN(dp.created_at) as created_at
        FROM debtor_payments dp
        JOIN debtors d ON d.id = dp.debtor_id
        JOIN users u ON dp.employee_id = u.id
        WHERE d.customer_id = $1
        GROUP BY COALESCE(dp.payment_group_id, dp.id), dp.payment_method, dp.bank_name, dp.employee_id, u.name
        ORDER BY MIN(dp.payment_date) DESC, MIN(dp.created_at) DESC
    `, [customerId]);
}

/**
 * Record the unpaid part of a sale as its own debt row. Pass the sale's own
 * Database (with an open transaction) to make this atomic with the sale; without
 * it each statement auto-commits.
 */
export async function handleSaleDebt(
    saleId: string,
    customerId: string,
    totalAmount: number,
    amountPaid: number,
    dueDate: Date,
    txDb?: Database
) {
    const db = txDb ?? (await initDatabase());
    const run = (query: string, params: any[]) =>
        txDb ? db.executeQuery(query, params) : db.execute(query, params);

    const amountOwed = round2(totalAmount - amountPaid);
    if (amountOwed <= 0) return;

    await run(
        `INSERT INTO debtors (sale_id, customer_id, amount_owed, original_amount, due_date, is_paid)
         VALUES ($1, $2, $3, $3, $4, 0)`,
        [saleId, customerId, amountOwed, toSqlUtc(dueDate)]
    );
}

export async function getCustomerDebtHistory(customerId: string) {
    const db = await initDatabase();

    const result = await db.select<(TDebtor & { payments: string })[]>(`
        SELECT
            d.*,
            COALESCE(d.original_amount, d.amount_owed) as original_amount,
            c.name as customer_name,
            s.total_amount as sale_amount,
            s.created_at as sale_date,
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

    return result.map(debt => ({
        ...debt,
        payments: JSON.parse(debt.payments) as TDebtorPayment[]
    }));
}

/**
 * Balances for an invoice of `saleId`: what this sale still owes, what the
 * customer owed before it, and the total.
 */
export async function getCustomerDebtSummary(customerId: string, saleId: string) {
    const db = await initDatabase();

    const totals = await db.selectOne<{ total_debt: number; current_debt: number }>(`
        SELECT
            COALESCE(SUM(amount_owed), 0) as total_debt,
            COALESCE(SUM(CASE WHEN sale_id = $2 THEN amount_owed ELSE 0 END), 0) as current_debt
        FROM debtors
        WHERE customer_id = $1 AND is_paid = 0
    `, [customerId, saleId]);

    const totalBalance = round2(totals?.total_debt || 0);
    const currentBalance = round2(totals?.current_debt || 0);

    return {
        previousBalance: round2(totalBalance - currentBalance),
        currentBalance,
        totalBalance
    };
}

/** What a customer still owes on one specific sale (0 if it was paid in full). */
export async function getSaleDebtOwed(saleId: string) {
    const db = await initDatabase();
    const row = await db.selectOne<{ owed: number } | null>(
        "SELECT COALESCE(SUM(amount_owed), 0) as owed FROM debtors WHERE sale_id = $1 AND is_paid = 0",
        [saleId]
    );
    return round2(row?.owed || 0);
}
