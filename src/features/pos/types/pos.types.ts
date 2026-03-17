import type { Product } from '@/lib/db'

export interface CartItem {
  product: Product
  quantity: number
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export type PaymentMethod = 'cash' | 'card'
export type POSView = 'grid' | 'list'