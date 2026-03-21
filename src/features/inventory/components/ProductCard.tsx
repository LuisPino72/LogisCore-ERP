import { Package, Edit2, Trash2, Cloud, CloudOff } from 'lucide-react'
import type { Product, Category } from '@/lib/db'

interface ProductCardProps {
  product: Product
  category: Category | undefined
  stockStatus: { label: string; color: string }
  onEdit: (product: Product) => void
  onDelete: (localId: string) => void
}

export default function ProductCard({ product, category, stockStatus, onEdit, onDelete }: ProductCardProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-slate-500" />
          )}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onEdit(product)} 
            title="Editar producto" 
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(product.localId)} 
            title="Eliminar producto" 
            className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <h3 className="font-semibold text-white mb-1 truncate">{product.name}</h3>
      <p className="text-xs text-slate-500 font-mono mb-3">{product.sku}</p>
      
      <div className="flex flex-wrap gap-1.5 mb-3">
        {category && (
          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded uppercase">
            {category.name}
          </span>
        )}
        {!product.isActive && (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded uppercase font-medium">
            Inactivo
          </span>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Precio</p>
          <p className="text-lg font-bold text-green-400">${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${stockStatus.color}`}>
            <span className="text-xs font-medium">{stockStatus.label}</span>
            <span className="text-xs font-bold">{product.stock}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
        {product.syncedAt ? (
          <div className="flex items-center gap-1 text-(--brand-400) text-xs">
            <Cloud className="w-3 h-3" />
            Sincronizado
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <CloudOff className="w-3 h-3" />
            Pendiente
          </div>
        )}
      </div>
    </div>
  )
}
