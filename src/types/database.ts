export type PaymentMethod = 'cash' | 'pos' | 'transfer';
export enum UserRole {
  super_admin = 'super_admin',
  admin = 'admin',
  manager = 'manager',
  cashier = 'sales',
};
export type PurchaseOrderStatus = 'pending' | 'partially_received' | 'received' | 'cancelled';
export type ReceiptStatus = 'pending' | 'approved' | 'rejected';

export type TDatabase = {
  users: TUser[];
  customers: TCustomer[];
  suppliers: TSupplier[];
  supplier_payables: TSupplierPayable[];
  supplier_payments: TSupplierPayment[];
  supplier_payment_allocations: TSupplierPaymentAllocation[];
  products: TProduct[];
  sales: TSale[];
  sale_items: TSaleItem[];
  debtors: TDebtor[];
  debtor_payments: TDebtorPayment[];
  purchase_orders: TPurchaseOrder[];
  purchase_order_items: TPurchaseOrderItem[];
  purchase_receipts: TPurchaseReceipt[];
  purchase_receipt_items: TPurchaseReceiptItem[];
  business_expenses: TBusinessExpense[];
  product_price_history: TProductPriceHistory[];
}

export type TUser = {
  id: string;
  name: string;
  username: string;
  phone: string;
  password?: string;
  isActive: boolean;
  role: UserRole;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export type TCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export type TSupplier = {
  id: string;
  supplier_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export type TCommonUnit = {
  id: string;
  name: string;
  abbrev: string;
  related_units: string[]; // Parsed from JSON
  created_at: string;
  updated_at: string;
}

export type TProductUnit = {
  id: string;
  product_id: string;
  unit_id: string;
  conversion_to_base: number;
  selling_price: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  unit?: TCommonUnit; // Optional join
}

export type TProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  selling_price: number;
  quantity_on_hand: number;
  reorder_level: number;
  base_unit?: string; // ID of common_unit
  created_at: string;
  updated_at: string;
  product_units?: TProductUnit[]; // Optional join
}

export type TSale = {
  id: string;
  sale_date: string;
  customer_id: string;
  customer_name?: string;
  employee_id: string;
  employee_name?: string;
  total_amount: number;
  discount: number;
  total_cost?: number;
  gross_profit?: number;
  /** Value of goods returned/voided; the sale's net total is total_amount - returned_amount. */
  returned_amount?: number;
  returned_cost?: number;
  status?: 'completed' | 'voided';
  payments?: Omit<TSalePayment, "id" | 'sale_id'>[];
  created_at: string;
  updated_at: string;
}

export type TSaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price_at_sale?: number;
  profit?: number;
  base_quantity?: number;
  returned_quantity?: number;
  unit_name?: string;
  unit_abbrev?: string;
  created_at: string;
  updated_at: string;
}

export type TSalePayment = {
  id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  bank_name: string;
  amount: number;
  reference_number: string;
}

export type TDebtor = {
  id: string;
  sale_id: string;
  customer_id: string;
  customer_name?: string;
  amount_owed: number;
  /** Amount the sale originally put on credit; amount_owed is what is still unpaid. */
  original_amount?: number;
  /** Set on the per-customer aggregate returned by getDebtors(). */
  sale_count?: number;
  due_date: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

/** One credit sale a customer still owes on. */
export type TDebtorSale = {
  id: string;
  sale_id: string;
  customer_id: string;
  amount_owed: number;
  original_amount: number;
  due_date: string;
  created_at: string;
  sale_amount: number;
  sale_date: string;
}

export type TDebtorPayment = {
  id: string;
  debtor_id: string;
  payment_group_id?: string;
  payment_date: string;
  payment_method: PaymentMethod;
  bank_name: string;
  amount_paid: number;
  employee_id: string;
  employee_name?: string;
  created_at: string;
  updated_at: string;
}

export type TPurchaseOrder = {
  id: string;
  order_date: string;
  supplier_id: string;
  employee_id: string;
  total_cost: number;
  status: PurchaseOrderStatus;
  created_at: string;
  updated_at: string;
}

export type TPurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export type TPurchaseReceipt = {
  id: string;
  purchase_order_id: string;
  received_date: string;
  employee_id: string;
  status: ReceiptStatus;
  created_at: string;
  updated_at: string;
}

export type TPurchaseReceiptItem = {
  id: string;
  purchase_receipt_id: string;
  product_id: string;
  quantity_received: number;
  created_at: string;
  updated_at: string;
}

export type TSupplierPayable = {
  id: string;
  supplier_id: string;
  purchase_order_id: string;
  amount_accrued: number;
  amount_allocated: number;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
  order_date?: string;
  outstanding_amount?: number;
  total_paid?: number;
}

export type TSupplierPayment = {
  id: string;
  supplier_id: string;
  purchase_order_id?: string | null;
  payment_date: string;
  payment_method: PaymentMethod;
  bank_name: string;
  reference_number: string;
  amount_paid: number;
  notes: string;
  employee_id: string;
  employee_name?: string;
  supplier_name?: string;
  is_unapplied_credit: boolean;
  created_at: string;
  allocated_amount?: number;
  remaining_credit?: number;
}

export type TSupplierPaymentAllocation = {
  id: string;
  supplier_payment_id: string;
  supplier_payable_id: string;
  allocated_amount: number;
  created_at: string;
  purchase_order_id?: string;
}

export type TSupplierBalanceSummary = {
  supplier_id: string;
  total_accrued: number;
  total_allocated_paid: number;
  unapplied_credit: number;
  net_outstanding: number;
}

export type TPurchaseOrderPayableSummary = {
  supplier_id: string;
  purchase_order_id: string;
  total_accrued: number;
  total_paid: number;
  outstanding: number;
  supplier_name?: string;
  order_date?: string;
}

export type TBusinessExpense = {
  id: string;
  expense_date: string;
  expense_type: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  bank_name: string;
  employee_id: string;
  created_at: string;
  updated_at: string;
}

export type TAdminSetting = {
  id: string;
  key: string;
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type TProductPriceHistory = {
  id: string;
  product_id: string;
  old_cost_price: number | null;
  new_cost_price: number | null;
  old_selling_price: number | null;
  new_selling_price: number | null;
  change_reason: string | null;
  changed_by: string;
  changed_by_name?: string;
  created_at: string;
}

export enum InventoryAdjustmentType {
  INCREASE = 'increase',
  DECREASE = 'decrease',
}

export type TInventoryAdjustment = {
  id: string;
  product_id: string;
  adjustment_type: InventoryAdjustmentType;
  quantity: number;
  reason: string;
  changed_by: string;
  changed_by_name?: string;
  created_at: string;
}

export type ProductAnalytics = {
  product: TProduct;
  priceHistory: TProductPriceHistory[];
  salesData: {
    totalTransactions: number;
    totalSales: number;
    totalRevenue: number;
    avgSellingPrice: number;
    minSellingPrice: number;
    maxSellingPrice: number;
    totalProfit: number;
    profitMargin: number;
    avgProfitPerSale: number;
    stockValue: number;
  };
  monthlySales: {
    month: string;
    quantitySold: number;
    revenue: number;
    profit: number;
  }[];
}

export type TSaleReturn = {
  id: string;
  sale_id: string;
  kind: 'void' | 'return';
  reason: string;
  total_amount: number;
  debt_reduced: number;
  refund_amount: number;
  refund_method?: PaymentMethod | null;
  employee_id: string;
  employee_name?: string;
  created_at: string;
}
