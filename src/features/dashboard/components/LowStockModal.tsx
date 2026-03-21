import { useState } from 'react'
import { X, PackageX, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/common/Button'
import { LowStockModalCard } from './ProductCard'

interface LowStockProduct {
  localId: string
  name: string
  categoryName: string
  stock: number
}

interface LowStockModalProps {
  isOpen: boolean
  products: LowStockProduct[]
  onClose: () => void
  onNavigate: () => void
}

const ITEMS_PER_PAGE = 5

export function LowStockModal({ isOpen, products, onClose, onNavigate }: LowStockModalProps) {
  const [page, setPage] = useState(1)

  if (!isOpen) return null

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE)
  const paginated = products.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleClose = () => {
    setPage(1)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
            <PackageX className="w-5 h-5 text-amber-400" />
            Productos con Stock Bajo
          </h3>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-(--text-secondary) mb-4">
            Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, products.length)} de{' '}
            {products.length} productos
          </p>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {paginated.map((product) => (
              <LowStockModalCard key={product.localId} {...product} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-(--border-color)">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-(--text-primary)"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-(--text-secondary)">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-(--bg-tertiary) hover:bg-(--brand-500)/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-(--text-primary)"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-(--border-color)">
          <Button onClick={onNavigate} className="w-full">
            Ver Inventario Completo
          </Button>
        </div>
      </div>
    </div>
  )
}
