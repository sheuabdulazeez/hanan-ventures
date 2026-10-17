import {
  TPurchaseOrderPayableSummary,
  TSupplierBalanceSummary,
  TSupplierPayable,
  TSupplierPayment,
} from "@/types/database";
import { Database, initDatabase } from ".";

type SupplierPaymentAllocationInput = {
  supplier_payable_id: string;
  allocated_amount: number;
};

type RecordSupplierPaymentInput = {
  supplier_id: string;
  purchase_order_id?: string | null;
  payment_date: string;
  payment_method: "cash" | "pos" | "transfer";
  bank_name?: string;
  reference_number?: string;
  amount_paid: number;
  notes?: string;
  employee_id: string;
  is_unapplied_credit: boolean;
  allocations?: SupplierPaymentAllocationInput[];
};

type AllocateSupplierCreditInput = {
  supplier_payment_id: string;
  allocations: SupplierPaymentAllocationInput[];
};

type SupplierPayableRow = TSupplierPayable & {
  outstanding_amount: number;
  total_paid: number;
};

const EPSILON = 0.0001;

function normalizeAmount(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function buildInClauseParams(values: string[], startIndex: number) {
  return values.map((_, index) => `$${startIndex + index}`).join(", ");
}

async function fetchPayablesForValidation(
  db: Database,
  supplierId: string,
  payableIds: string[],
) {
  if (payableIds.length === 0) {
    return [];
  }

  const placeholders = buildInClauseParams(payableIds, 2);
  return await db.select<SupplierPayableRow[]>(
    `
      SELECT
        sp.*,
        (sp.amount_allocated) as total_paid,
        (sp.amount_accrued - sp.amount_allocated) as outstanding_amount
      FROM supplier_payables sp
      WHERE sp.supplier_id = $1
        AND sp.id IN (${placeholders})
    `,
    [supplierId, ...payableIds],
  );
}

export async function getSupplierPayablesBySupplier(supplierId: string) {
  const db = await initDatabase();
  return await db.select<SupplierPayableRow[]>(
    `
      SELECT
        sp.*,
        po.order_date,
        s.supplier_name,
        sp.amount_allocated as total_paid,
        (sp.amount_accrued - sp.amount_allocated) as outstanding_amount
      FROM supplier_payables sp
      JOIN purchase_orders po ON po.id = sp.purchase_order_id
      JOIN suppliers s ON s.id = sp.supplier_id
      WHERE sp.supplier_id = $1
      ORDER BY po.order_date ASC, sp.created_at ASC
    `,
    [supplierId],
  );
}

export async function getSupplierPayableByPurchaseOrder(purchaseOrderId: string) {
  const db = await initDatabase();
  return await db.selectOne<TPurchaseOrderPayableSummary>(
    `
      SELECT
        po.supplier_id,
        po.id as purchase_order_id,
        s.supplier_name,
        po.order_date,
        COALESCE(sp.amount_accrued, 0) as total_accrued,
        COALESCE(sp.amount_allocated, 0) as total_paid,
        COALESCE(sp.amount_accrued, 0) - COALESCE(sp.amount_allocated, 0) as outstanding
      FROM purchase_orders po
      LEFT JOIN supplier_payables sp ON sp.purchase_order_id = po.id
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = $1
    `,
    [purchaseOrderId],
  );
}

export async function getSupplierPaymentHistory(supplierId: string) {
  const db = await initDatabase();
  return await db.select<TSupplierPayment[]>(
    `
      WITH allocation_totals AS (
        SELECT
          supplier_payment_id,
          COALESCE(SUM(allocated_amount), 0) as allocated_amount
        FROM supplier_payment_allocations
        GROUP BY supplier_payment_id
      )
      SELECT
        sp.*,
        s.supplier_name,
        u.name as employee_name,
        COALESCE(at.allocated_amount, 0) as allocated_amount,
        CASE
          WHEN sp.is_unapplied_credit = 1 THEN sp.amount_paid - COALESCE(at.allocated_amount, 0)
          ELSE 0
        END as remaining_credit
      FROM supplier_payments sp
      JOIN suppliers s ON s.id = sp.supplier_id
      JOIN users u ON u.id = sp.employee_id
      LEFT JOIN allocation_totals at ON at.supplier_payment_id = sp.id
      WHERE sp.supplier_id = $1
      ORDER BY sp.payment_date DESC, sp.created_at DESC
    `,
    [supplierId],
  );
}

export async function getSupplierBalanceSummary(supplierId: string) {
  const db = await initDatabase();
  const summary = await db.selectOne<TSupplierBalanceSummary>(
    `
      WITH payable_totals AS (
        SELECT
          COALESCE(SUM(amount_accrued), 0) as total_accrued,
          COALESCE(SUM(amount_allocated), 0) as total_allocated_paid
        FROM supplier_payables
        WHERE supplier_id = $1
      ),
      credit_totals AS (
        SELECT
          COALESCE(SUM(
            CASE
              WHEN sp.is_unapplied_credit = 1 THEN sp.amount_paid - COALESCE(a.allocated_amount, 0)
              ELSE 0
            END
          ), 0) as unapplied_credit
        FROM supplier_payments sp
        LEFT JOIN (
          SELECT
            supplier_payment_id,
            COALESCE(SUM(allocated_amount), 0) as allocated_amount
          FROM supplier_payment_allocations
          GROUP BY supplier_payment_id
        ) a ON a.supplier_payment_id = sp.id
        WHERE sp.supplier_id = $1
      )
      SELECT
        $1 as supplier_id,
        pt.total_accrued,
        pt.total_allocated_paid,
        ct.unapplied_credit,
        pt.total_accrued - pt.total_allocated_paid - ct.unapplied_credit as net_outstanding
      FROM payable_totals pt
      CROSS JOIN credit_totals ct
    `,
    [supplierId],
  );

  return (
    summary || {
      supplier_id: supplierId,
      total_accrued: 0,
      total_allocated_paid: 0,
      unapplied_credit: 0,
      net_outstanding: 0,
    }
  );
}

export async function recordSupplierPayment(input: RecordSupplierPaymentInput) {
  const db = await initDatabase();
  const amountPaid = normalizeAmount(input.amount_paid);
  const allocations = (input.allocations || [])
    .filter((allocation) => normalizeAmount(allocation.allocated_amount) > 0)
    .map((allocation) => ({
      ...allocation,
      allocated_amount: normalizeAmount(allocation.allocated_amount),
    }));

  if (amountPaid <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  if (input.is_unapplied_credit && allocations.length > 0) {
    throw new Error("Supplier credit payments cannot include allocations.");
  }

  if (!input.is_unapplied_credit && allocations.length === 0) {
    throw new Error("Allocated payments must include at least one payable allocation.");
  }

  const totalAllocated = normalizeAmount(
    allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0),
  );

  if (!input.is_unapplied_credit && Math.abs(totalAllocated - amountPaid) > EPSILON) {
    throw new Error("Allocated payment total must match the payment amount.");
  }

  try {
    await db.beginTransaction();

    const paymentIdRecord = await db.selectOne<{ id: string }>(
      `SELECT lower(hex(randomblob(16))) as id`,
    );
    const paymentId = paymentIdRecord.id;

    if (allocations.length > 0) {
      const payableIds = allocations.map((allocation) => allocation.supplier_payable_id);
      const payables = await fetchPayablesForValidation(db, input.supplier_id, payableIds);

      if (payables.length !== payableIds.length) {
        throw new Error("One or more supplier balances could not be found.");
      }

      for (const allocation of allocations) {
        const payable = payables.find((row) => row.id === allocation.supplier_payable_id);
        if (!payable) {
          throw new Error("A selected supplier balance is invalid.");
        }

        if (allocation.allocated_amount - normalizeAmount(payable.outstanding_amount) > EPSILON) {
          throw new Error("Allocated amount cannot exceed the outstanding PO balance.");
        }
      }
    }

    await db.executeQuery(
      `
        INSERT INTO supplier_payments (
          id,
          supplier_id,
          purchase_order_id,
          payment_date,
          payment_method,
          bank_name,
          reference_number,
          amount_paid,
          notes,
          employee_id,
          is_unapplied_credit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        paymentId,
        input.supplier_id,
        input.purchase_order_id || null,
        input.payment_date,
        input.payment_method,
        input.bank_name || "",
        input.reference_number || "",
        amountPaid,
        input.notes || "",
        input.employee_id,
        input.is_unapplied_credit ? 1 : 0,
      ],
    );

    for (const allocation of allocations) {
      await db.executeQuery(
        `
          INSERT INTO supplier_payment_allocations (
            id,
            supplier_payment_id,
            supplier_payable_id,
            allocated_amount
          ) VALUES (lower(hex(randomblob(16))), $1, $2, $3)
        `,
        [paymentId, allocation.supplier_payable_id, allocation.allocated_amount],
      );

      await db.executeQuery(
        `
          UPDATE supplier_payables
          SET
            amount_allocated = amount_allocated + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [allocation.allocated_amount, allocation.supplier_payable_id],
      );
    }

    await db.commit();
    return paymentId;
  } catch (error) {
    try {
      await db.rollback();
    } catch {}
    throw error;
  }
}

export async function allocateSupplierCredit(input: AllocateSupplierCreditInput) {
  const db = await initDatabase();
  const allocations = input.allocations
    .filter((allocation) => normalizeAmount(allocation.allocated_amount) > 0)
    .map((allocation) => ({
      ...allocation,
      allocated_amount: normalizeAmount(allocation.allocated_amount),
    }));

  if (allocations.length === 0) {
    throw new Error("Add at least one allocation before saving.");
  }

  try {
    await db.beginTransaction();

    const payment = await db.selectOne<TSupplierPayment & { allocated_amount: number }>(
      `
        SELECT
          sp.*,
          COALESCE(SUM(spa.allocated_amount), 0) as allocated_amount
        FROM supplier_payments sp
        LEFT JOIN supplier_payment_allocations spa ON spa.supplier_payment_id = sp.id
        WHERE sp.id = $1
        GROUP BY sp.id
      `,
      [input.supplier_payment_id],
    );

    if (!payment) {
      throw new Error("Supplier credit payment was not found.");
    }

    if (!payment.is_unapplied_credit) {
      throw new Error("Only supplier credit payments can be allocated later.");
    }

    const totalToAllocate = normalizeAmount(
      allocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0),
    );
    const remainingCredit = normalizeAmount(
      payment.amount_paid - Number(payment.allocated_amount || 0),
    );

    if (totalToAllocate - remainingCredit > EPSILON) {
      throw new Error("Allocation exceeds the remaining supplier credit.");
    }

    const payableIds = allocations.map((allocation) => allocation.supplier_payable_id);
    const payables = await fetchPayablesForValidation(db, payment.supplier_id, payableIds);

    if (payables.length !== payableIds.length) {
      throw new Error("One or more supplier balances could not be found.");
    }

    for (const allocation of allocations) {
      const payable = payables.find((row) => row.id === allocation.supplier_payable_id);
      if (!payable) {
        throw new Error("A selected supplier balance is invalid.");
      }

      if (allocation.allocated_amount - normalizeAmount(payable.outstanding_amount) > EPSILON) {
        throw new Error("Allocated amount cannot exceed the outstanding PO balance.");
      }
    }

    for (const allocation of allocations) {
      await db.executeQuery(
        `
          INSERT INTO supplier_payment_allocations (
            id,
            supplier_payment_id,
            supplier_payable_id,
            allocated_amount
          ) VALUES (lower(hex(randomblob(16))), $1, $2, $3)
        `,
        [input.supplier_payment_id, allocation.supplier_payable_id, allocation.allocated_amount],
      );

      await db.executeQuery(
        `
          UPDATE supplier_payables
          SET
            amount_allocated = amount_allocated + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [allocation.allocated_amount, allocation.supplier_payable_id],
      );
    }

    await db.commit();
    return true;
  } catch (error) {
    try {
      await db.rollback();
    } catch {}
    throw error;
  }
}
