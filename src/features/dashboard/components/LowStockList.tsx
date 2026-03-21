import { StockProductCard } from './ProductCard'
import { PackageX } from 'lucide-react'

interface LowStockProduct {
  localId: string
  name: string
  categoryName: string
  stock: number
}

interface LowStockListProps {
  products: LowStockProduct[]
  lowStockCount: number
}

export function LowStockList({ products, lowStockCount }: LowStockListProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <PackageX className="w-5 h-5 text-amber-400" />
          Stock Bajo
        </h3>
        {lowStockCount > 0 && (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
            {lowStockCount} productos
          </span>
        )}
      </div>
      {products.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PackageX className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay productos con stock bajo</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {products.map((product) => (
            <StockProductCard key={product.localId} {...product} />
          ))}
        </div>
      )}
    </div>
  )
}
