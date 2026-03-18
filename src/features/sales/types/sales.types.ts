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
  paymentMethod: 'cash' | 'card' | 'pago_movil'
  exchangeRate?: number
  exchangeRateSource?: 'api' | 'manual'
}

export type PaymentMethod = 'cash' | 'card' | 'pago_movil'
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded'