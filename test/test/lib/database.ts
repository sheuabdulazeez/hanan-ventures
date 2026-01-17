export interface Product {
  id: string
  name: string
  category: string
  description: string
  cost_price: number
  selling_price: number
  quantity_on_hand: number
  reorder_level: number
  base_unit: string
  created_at: string
  updated_at: string
}

export interface CommonUnit {
  id: string
  name: string
  label: string
  related_units: string[]
  created_at: string
  updated_at: string
}

export interface ProductUnit {
  id: string
  product_id: string
  unit_id: string
  conversion_to_base: number
  selling_price: number
  is_primary: number
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  sale_date: string
  customer_id?: string
  employee_id: string
  total_amount: number
  total_cost?: number
  gross_profit?: number
  discount: number
  payment_method?: string
  bank_name?: string
  amount_paid: number
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  cost_price_at_sale?: number
  profit?: number
  unit_price: number
  total_price: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  name: string
  username: string
  phone?: string
  password: string
  is_active: number
  role: string
  created_at: string
  updated_at: string
}

// In-memory JavaScript database
interface Database {
  products: Product[]
  common_units: CommonUnit[]
  product_units: ProductUnit[]
  customers: Customer[]
  sales: Sale[]
  sale_items: SaleItem[]
  users: User[]
}

let database: Database | null = null

function getDatabase(): Database {
  if (!database) {
    database = {
      products: [],
      common_units: [],
      product_units: [],
      customers: [],
      sales: [],
      sale_items: [],
      users: [],
    }
    initializeDatabase()
  }
  return database
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function initializeDatabase() {
  const db = getDatabase()

  // Seed common units
  const units = [
    { name: "piece", label: "Piece", related_units: ["dozen", "pack"] },
    { name: "kg", label: "Kilogram", related_units: ["gram", "pound"] },
    { name: "gram", label: "Gram", related_units: ["kg", "pound"] },
    { name: "liter", label: "Liter", related_units: ["ml", "gallon"] },
    { name: "ml", label: "Milliliter", related_units: ["liter", "gallon"] },
    { name: "dozen", label: "Dozen", related_units: ["piece", "pack"] },
    { name: "pack", label: "Pack", related_units: ["piece", "dozen"] },
    { name: "box", label: "Box", related_units: ["piece", "pack"] },
    { name: "meter", label: "Meter", related_units: ["cm", "inch"] },
    { name: "cm", label: "Centimeter", related_units: ["meter", "inch"] },
  ]

  units.forEach((unit) => {
    const now = new Date().toISOString()
    db.common_units.push({
      id: generateId(),
      name: unit.name,
      label: unit.label,
      related_units: unit.related_units,
      created_at: now,
      updated_at: now,
    })
  })

  // Create default admin user
  const now = new Date().toISOString()
  db.users.push({
    id: generateId(),
    name: "Admin User",
    username: "admin",
    phone: "",
    password: "admin123",
    is_active: 1,
    role: "admin",
    created_at: now,
    updated_at: now,
  })

  // Add some sample products
  const sampleProducts = [
    {
      name: "Rice",
      category: "Grains",
      description: "Premium white rice",
      cost_price: 80,
      selling_price: 100,
      quantity_on_hand: 50,
      reorder_level: 10,
      base_unit: "kg",
    },
    {
      name: "Cooking Oil",
      category: "Oils",
      description: "Sunflower cooking oil",
      cost_price: 150,
      selling_price: 180,
      quantity_on_hand: 30,
      reorder_level: 5,
      base_unit: "liter",
    },
    {
      name: "Bread",
      category: "Bakery",
      description: "Fresh white bread",
      cost_price: 25,
      selling_price: 35,
      quantity_on_hand: 20,
      reorder_level: 5,
      base_unit: "piece",
    },
  ]

  sampleProducts.forEach((product) => {
    const now = new Date().toISOString()
    db.products.push({
      id: generateId(),
      name: product.name,
      category: product.category,
      description: product.description,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
      base_unit: product.base_unit,
      created_at: now,
      updated_at: now,
    })
  })
}

export async function getProducts(): Promise<Product[]> {
  const db = getDatabase()
  return [...db.products].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getCommonUnits(): Promise<CommonUnit[]> {
  const db = getDatabase()
  return [...db.common_units].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getProductUnits(productId: string): Promise<ProductUnit[]> {
  const db = getDatabase()
  return db.product_units
    .filter((pu) => pu.product_id === productId)
    .map((pu) => {
      const unit = db.common_units.find((cu) => cu.id === pu.unit_id)
      return {
        ...pu,
        unit_name: unit?.name || "",
        unit_label: unit?.label || "",
      } as any
    })
}

export async function createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
  const db = getDatabase()
  const id = generateId()
  const now = new Date().toISOString()

  const newProduct: Product = {
    ...product,
    id,
    created_at: now,
    updated_at: now,
  }

  db.products.push(newProduct)
  return newProduct
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const db = getDatabase()
  const now = new Date().toISOString()

  const productIndex = db.products.findIndex((p) => p.id === id)
  if (productIndex === -1) {
    throw new Error("Product not found")
  }

  db.products[productIndex] = {
    ...db.products[productIndex],
    ...updates,
    id, // Ensure ID doesn't change
    updated_at: now,
  }

  return db.products[productIndex]
}

export async function createProductUnit(
  productUnit: Omit<ProductUnit, "id" | "created_at" | "updated_at">,
): Promise<ProductUnit> {
  const db = getDatabase()
  const id = generateId()
  const now = new Date().toISOString()

  const newProductUnit: ProductUnit = {
    ...productUnit,
    id,
    created_at: now,
    updated_at: now,
  }

  db.product_units.push(newProductUnit)
  return newProductUnit
}

export async function updateProductUnit(id: string, updates: Partial<ProductUnit>): Promise<ProductUnit> {
  const db = getDatabase()
  const now = new Date().toISOString()

  const unitIndex = db.product_units.findIndex((pu) => pu.id === id)
  if (unitIndex === -1) {
    throw new Error("Product unit not found")
  }

  db.product_units[unitIndex] = {
    ...db.product_units[unitIndex],
    ...updates,
    id, // Ensure ID doesn't change
    updated_at: now,
  }

  return db.product_units[unitIndex]
}

export async function deleteProductUnit(id: string): Promise<void> {
  const db = getDatabase()
  const unitIndex = db.product_units.findIndex((pu) => pu.id === id)

  if (unitIndex === -1) {
    throw new Error("Product unit not found")
  }

  db.product_units.splice(unitIndex, 1)
}

export async function setPrimaryProductUnit(productId: string, unitId: string): Promise<void> {
  const db = getDatabase()

  // Set all units for this product to non-primary
  db.product_units.forEach((pu) => {
    if (pu.product_id === productId) {
      pu.is_primary = 0
      pu.updated_at = new Date().toISOString()
    }
  })

  // Set the specified unit as primary
  const targetUnit = db.product_units.find((pu) => pu.id === unitId)
  if (targetUnit) {
    targetUnit.is_primary = 1
    targetUnit.updated_at = new Date().toISOString()
  }
}

export async function getCustomers(): Promise<Customer[]> {
  const db = getDatabase()
  return [...db.customers].sort((a, b) => a.name.localeCompare(b.name))
}

export async function createCustomer(customer: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> {
  const db = getDatabase()
  const id = generateId()
  const now = new Date().toISOString()

  const newCustomer: Customer = {
    ...customer,
    id,
    created_at: now,
    updated_at: now,
  }

  db.customers.push(newCustomer)
  return newCustomer
}

export async function createSale(sale: Omit<Sale, "id" | "created_at" | "updated_at">): Promise<Sale> {
  const db = getDatabase()
  const id = generateId()
  const now = new Date().toISOString()

  const newSale: Sale = {
    ...sale,
    id,
    created_at: now,
    updated_at: now,
  }

  db.sales.push(newSale)
  return newSale
}

export async function createSaleItem(saleItem: Omit<SaleItem, "id" | "created_at" | "updated_at">): Promise<SaleItem> {
  const db = getDatabase()
  const id = generateId()
  const now = new Date().toISOString()

  const newSaleItem: SaleItem = {
    ...saleItem,
    id,
    created_at: now,
    updated_at: now,
  }

  db.sale_items.push(newSaleItem)
  return newSaleItem
}

export async function getSales(): Promise<Sale[]> {
  const db = getDatabase()
  return [...db.sales].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const db = getDatabase()
  return (
    db.users.find((user) => user.username === username && user.password === password && user.is_active === 1) || null
  )
}

export async function getUsers(): Promise<User[]> {
  const db = getDatabase()
  return [...db.users].sort((a, b) => a.name.localeCompare(b.name))
}
