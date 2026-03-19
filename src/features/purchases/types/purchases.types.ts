export interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  cost: number
  total: number
}

export interface CreatePurchaseInput {
  supplier: string
  supplierId?: string
  invoiceNumber: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'completed' | 'cancelled'
}

export type PurchaseStatus = 'pending' | 'completed' | 'cancelled'

export type SortField = 'createdAt' | 'supplier' | 'invoiceNumber' | 'total' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface PurchaseFilters {
  search: string
  status: PurchaseStatus | 'all'
  dateRange: DateRange
}

export interface SupplierFormData {
  name: string
  phone: string
  email: string
  address: string
  contactPerson: string
}

export interface PurchaseStats {
  totalCompleted: number
  totalPending: number
  totalCancelled: number
  countCompleted: number
  countPending: number
  countCancelled: number
  avgPurchase: number
}