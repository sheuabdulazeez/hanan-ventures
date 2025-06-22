export type PaymentMethod = 'cash' | 'pos' | 'transfer';
export enum UserRole {
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
}

export type TUser = {
  id: string;
  name: string;
  username: string;
  phone: string;
  password?: string;
  isActive: boolean;
  role: UserRole;
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

export type TProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  selling_price: number;
  quantity_on_hand: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export type TSale = {
  id: string;
  sale_date: string;
  customer_id: string;
  customer_name?:string;
  employee_id: string;
  employee_name?:string;
  total_amount: number;
  discount: number;
  payments?: Omit<TSalePayment, "id"|'sale_id'>[];
  created_at: string;
  updated_at: string;
}

export type TSaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?:string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  customer_name?:string;
  amount_owed: number;
  due_date: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export type TDebtorPayment = {
  id: string;
  debtor_id: string;
  payment_date: string;
  payment_method: PaymentMethod;
  bank_name: string;
  amount_paid: number;
  employee_id: string;
  employee_name?:string;
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
