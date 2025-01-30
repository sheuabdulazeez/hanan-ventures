import { addDays, subDays } from 'date-fns'
import { SALE_Sale } from '../types/sales';
import { TCustomer, TProduct } from '@/types/database';

export const customers: Partial<TCustomer>[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
];

export const products: Partial<TProduct>[] = [
    { "id": "1", "name": "Viju wheat and chocolate", "selling_price": 9000 },
    { "id": "2", "name": "Viju plain", "selling_price": 5800 },
    { "id": "3", "name": "Viju milk", "selling_price": 5000 },
    { "id": "4", "name": "Mr fruit pet", "selling_price": 5300 },
    { "id": "5", "name": "Malt", "selling_price": 5500 },
    { "id": "6", "name": "Big size American", "selling_price": 3500 },
    { "id": "7", "name": "Small size American", "selling_price": 2200 },
    { "id": "8", "name": "Fearless", "selling_price": 4200 },
    { "id": "9", "name": "Predator", "selling_price": 4850 },
    { "id": "10", "name": "Coke and fanta", "selling_price": 4300 },
    { "id": "11", "name": "Nutri milk", "selling_price": 5500 },
    { "id": "12", "name": "Hollandia sachet", "selling_price": 3300 },
    { "id": "13", "name": "Bobo", "selling_price": 4500 },
    { "id": "14", "name": "Monster", "selling_price": 22000 },
    { "id": "15", "name": "Bullet", "selling_price": 29000 },
    { "id": "16", "name": "Hollandia ltr", "selling_price": 15500 },
    { "id": "17", "name": "Active", "selling_price": 14500 },
    { "id": "18", "name": "Exotics", "selling_price": 13500 },
    { "id": "19", "name": "Pulpy", "selling_price": 7500 },
    { "id": "20", "name": "Komando big", "selling_price": 4300 },
    { "id": "21", "name": "Komando small", "selling_price": 2800 },
    { "id": "22", "name": "Pepsi/7up/teem", "selling_price": 4400 },
    { "id": "23", "name": "Mama coke", "selling_price": 6800 }
  ];


  export const mockSales: SALE_Sale[] = [
    {
      id: '1',
      customer: { id: '1', name: 'John Doe', email: 'john@example.com' },
      items: [
        { product: { id: '1', name: 'Coca Cola', selling_price: 1.5 }, quantity: 2, unit_price: 1.5 },
        { product: { id: '2', name: 'Pepsi', selling_price: 1.5 }, quantity: 1, unit_price: 1.5 },
      ],
      total: 4.5,
      date: new Date('2025-01-10T10:30:00'),
      paymentMethod: 'cash',
    },
    {
      id: '2',
      customer: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      items: [
        { product: { id: '3', name: 'Fanta', selling_price: 1.25 }, quantity: 3, unit_price: 1.25 },
      ],
      total: 3.75,
      date: new Date('2025-01-11T14:45:00'),
      paymentMethod: "pos",
    },
    // Add more mock sales as needed
  ]


  export interface Supplier {
    id: string
    name: string
    email: string
    phone: string
  }
  
  export interface PurchaseOrder {
    id: string
    supplierName: string
    orderDate: Date
    expectedDeliveryDate: Date
    totalAmount: number
    status: 'Pending' | 'Approved' | 'Disapproved' | 'Delivered' | 'Cancelled'
    items: Array<{
      product: Partial<TProduct>
      quantity: number
      unitPrice: number
    }>
  }
  
  export const mockSuppliers: Supplier[] = [
    { id: 'S001', name: 'Tech Supplies Inc.', email: 'tech@example.com', phone: '1234567890' },
    { id: 'S002', name: 'Office Furniture Co.', email: 'office@example.com', phone: '2345678901' },
    { id: 'S003', name: 'Stationery Wholesale', email: 'stationery@example.com', phone: '3456789012' },
  ]
  
  export const mockProducts: Partial<TProduct>[] = [
    { id: 'P001', name: 'Laptop', selling_price: 1000, quantity_on_hand: 50 },
    { id: 'P002', name: 'Office Chair', selling_price: 200, quantity_on_hand: 100 },
    { id: 'P003', name: 'Desk Lamp', selling_price: 50, quantity_on_hand: 200 },
    { id: 'P004', name: 'Notebook', selling_price: 5, quantity_on_hand: 1000 },
    { id: 'P005', name: 'Pen', selling_price: 1, quantity_on_hand: 5000 },
  ]
  
  export const mockPurchaseOrders: PurchaseOrder[] = [
    {
      id: 'PO001',
      supplierName: 'Tech Supplies Inc.',
      orderDate: subDays(new Date(), 5),
      expectedDeliveryDate: addDays(new Date(), 2),
      totalAmount: 2500,
      status: 'Pending',
      items: [
        { product: mockProducts[0], quantity: 2, unitPrice: 1000 },
        { product: mockProducts[4], quantity: 500, unitPrice: 1 },
      ],
    },
    {
      id: 'PO002',
      supplierName: 'Office Furniture Co.',
      orderDate: subDays(new Date(), 10),
      expectedDeliveryDate: addDays(new Date(), 5),
      totalAmount: 1500,
      status: 'Approved',
      items: [
        { product: mockProducts[1], quantity: 5, unitPrice: 200 },
        { product: mockProducts[2], quantity: 10, unitPrice: 50 },
      ],
    },
    {
      id: 'PO003',
      supplierName: 'Stationery Wholesale',
      orderDate: subDays(new Date(), 2),
      expectedDeliveryDate: addDays(new Date(), 7),
      totalAmount: 500,
      status: 'Pending',
      items: [
        { product: mockProducts[3], quantity: 100, unitPrice: 5 },
      ],
    },
  ]
  
  export interface Expense {
    id: string
    description: string
    amount: number
    date: Date
    category: string
    paymentMethod: string
    receipt?: string
  }
  
  export const mockExpenses: Expense[] = [
    {
      id: 'EXP001',
      description: 'Office Rent',
      amount: 2000,
      date: subDays(new Date(), 2),
      category: 'Rent',
      paymentMethod: 'Bank Transfer',
    },
    {
      id: 'EXP002',
      description: 'Utility Bills',
      amount: 500,
      date: subDays(new Date(), 5),
      category: 'Utilities',
      paymentMethod: 'Credit Card',
    },
    {
      id: 'EXP003',
      description: 'Team Lunch',
      amount: 150,
      date: subDays(new Date(), 1),
      category: 'Meals',
      paymentMethod: 'Cash',
      receipt: '/placeholder.svg',
    },
    {
      id: 'EXP004',
      description: 'Software Subscription',
      amount: 99,
      date: subDays(new Date(), 7),
      category: 'Software',
      paymentMethod: 'Credit Card',
    },
  ]