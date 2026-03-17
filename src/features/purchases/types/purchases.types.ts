export interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  cost: number
  total: number
}

export interface CreatePurchaseInput {
  supplier: string
  invoiceNumber: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'completed' | 'cancelled'
}

export type PurchaseStatus = 'pending' | 'completed' | 'cancelled'

export interface SupplierFormData {
  name: string
  phone: string
  email: string
  address: string
  contactPerson: string
}