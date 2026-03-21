import { Package, Edit2, Trash2, Cloud, CloudOff, Star, CheckSquare, Square, ChevronUp, ChevronDown } from 'lucide-react'
import type { Product, Category } from '@/lib/db'
import type { SortConfig, SortField } from '../types/inventory.types'

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  selectedProducts: string[]
  sort: SortConfig
  loading: boolean
  onSort: (sort: SortConfig) => void
  onEdit: (product: Product) => void
  onDelete: (localId: string) => void
  onToggleSelection: (localId: string) => void
  getStockStatus: (stock: number) => { label: string; color: string }
}

export default function ProductTable({
  products,
  categories,
  selectedProducts,
  sort,
  loading,
  onSort,
  onEdit,
  onDelete,
  onToggleSelection,
  getStockStatus,
}: ProductTableProps) {
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button 
      onClick={() => onSort({ field, direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc' })} 
      className="flex items-center gap-1"
    >
      {children}
      {sort.field === field && (sort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </button>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">
              <span className="sr-only">Seleccionar</span>
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left">
              <SortHeader field="name">Producto</SortHeader>
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-left">
              <SortHeader field="sku">SKU</SortHeader>
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider">Categoría</th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-right">
              <SortHeader field="price">Precio</SortHeader>
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-right">
              <SortHeader field="stock">Stock</SortHeader>
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider">Sync</th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} className="py-10 text-center text-slate-500">Cargando productos...</td></tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg">No hay productos que coincidan</p>
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const stockStatus = getStockStatus(product.stock)
              return (
                <tr key={product.localId} className="border-b border-(--border-color) hover:bg-(--brand-500)/5 transition-colors group">
                  <td className="py-4 px-4">
                    <button onClick={() => onToggleSelection(product.localId)} className="text-slate-400 hover:text-white">
                      {selectedProducts.includes(product.localId) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {product.name}
                          {product.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        </div>
                        {!product.isActive && <span className="text-[10px] text-red-500 font-bold uppercase">Inactivo</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-mono text-sm">{product.sku}</td>
                  <td className="py-4 px-4 text-slate-400">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Sin Categoría'}
                  </td>
                  <td className="py-4 px-4 text-right text-green-400 font-medium">
                    ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${stockStatus.color}`}>
                      <span className="font-bold">{product.stock}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {product.syncedAt ? (
                      <div title="Sincronizado">
                        <Cloud className="w-4 h-4 text-(--brand-500) mx-auto" />
                      </div>
                    ) : (
                      <div title="Pendiente de sincronizar">
                        <CloudOff className="w-4 h-4 text-amber-500 mx-auto" />
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(product)} title="Editar producto" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(product.localId)} title="Eliminar producto" className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
