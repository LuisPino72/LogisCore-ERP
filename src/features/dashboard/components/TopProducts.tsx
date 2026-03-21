import { Trophy } from 'lucide-react'
import { TopProductCard } from './ProductCard'

interface TopProduct {
  localId: string
  name: string
  categoryName: string
  total: number
  quantity: number
}

interface TopProductsProps {
  products: TopProduct[]
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5">
      <h3
        className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
        title="Productos más vendidos en el período"
      >
        <Trophy className="w-5 h-5 text-amber-400" />
        Top 5 Productos
      </h3>
      {products.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No hay ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product, index) => (
            <TopProductCard key={product.localId} index={index} {...product} />
          ))}
        </div>
      )}
    </div>
  )
}
