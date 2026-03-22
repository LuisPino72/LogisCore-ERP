import type { Product } from '@/lib/db'

export interface CartItem {
  product: Product
  quantity: number
  unit?: 'kg' | 'g' | 'unit' | 'carton' | 'half'
  selectedSampleId?: string
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unit: 'kg' | 'g' | 'unit' | 'carton' | 'half'
  unitPrice: number
  total: number
}

export interface SaleInput {
  customerId?: string
}

export type PaymentMethod = 'cash' | 'card' | 'pago_movil'
export type POSView = 'grid' | 'list'

export type SortField = 'name' | 'price' | 'stock'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

export interface SuspendedSaleItem {
  productId: string
  productName: string
  quantity: number
  unit: 'kg' | 'g' | 'unit' | 'carton' | 'half'
  unitPrice: number
  total: number
  productSnapshot: Product
}

export interface DailyStats {
  totalSales: number
  totalAmount: number
  transactionCount: number
  averageTicket: number
  paymentMethodBreakdown: {
    cash: number
    card: number
    pago_movil: number
  }
}