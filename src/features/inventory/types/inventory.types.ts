export type ViewMode = 'table' | 'grid'
export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
export type StatusFilter = 'all' | 'active' | 'inactive'

export interface ProductFormData {
  name: string
  sku: string
  price: string
  cost: string
  stock: string
  categoryId: number | undefined
  imageUrl: string | undefined
  isFavorite: boolean
  isActive: boolean
}

export const DEFAULT_PRODUCT_FORM: ProductFormData = {
  name: '',
  sku: '',
  price: '0',
  cost: '0',
  stock: '0',
  categoryId: undefined,
  imageUrl: undefined,
  isFavorite: false,
  isActive: true,
}