export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface CreateSaleInput {
  items: SaleItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: 'cash' | 'card'
  exchangeRate?: number
  exchangeRateSource?: 'api' | 'manual'
}

export type PaymentMethod = 'cash' | 'card'
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded'