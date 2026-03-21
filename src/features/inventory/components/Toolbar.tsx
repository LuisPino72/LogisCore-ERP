import { Button } from '@/common'
import { Plus, Star, CheckSquare, Barcode, Download, FolderEdit, List, LayoutGrid, X, Trash } from 'lucide-react'
import type { ViewMode } from '../types/inventory.types'

interface ToolbarProps {
  productCount: number
  selectedCount: number
  viewMode: ViewMode
  showFavoritesOnly: boolean
  showBarcodeScanner: boolean
  onNewProduct: () => void
  onToggleFavorites: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  onToggleBarcodeScanner: () => void
  onExport: () => void
  onOpenCategoryModal: () => void
  onSetViewMode: (mode: ViewMode) => void
}

export default function Toolbar({
  productCount,
  selectedCount,
  viewMode,
  showFavoritesOnly,
  showBarcodeScanner,
  onNewProduct,
  onToggleFavorites,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onToggleBarcodeScanner,
  onExport,
  onOpenCategoryModal,
  onSetViewMode,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white" title="Gestiona tu inventario de productos">Inventario</h2>
        <p className="text-slate-400">{productCount} productos {selectedCount > 0 && `(${selectedCount} seleccionados)`}</p>
      </div>
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 pr-4 border-r border-(--border-color)">
            <span className="text-sm text-slate-400">{selectedCount} seleccionados</span>
            <button
              onClick={onDeleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Trash className="w-4 h-4" />
              Eliminar
            </button>
            <button onClick={onClearSelection} title="Limpiar selección" className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <button
          onClick={onToggleFavorites}
          className={`p-2 rounded-lg border transition-all ${showFavoritesOnly ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'}`}
          title="Solo favoritos"
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          onClick={onSelectAll}
          className="p-2 rounded-lg border bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white transition-all"
          title="Seleccionar todos"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleBarcodeScanner}
          className={`p-2 rounded-lg border transition-all ${showBarcodeScanner ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white'}`}
          title="Escanear código de barras"
        >
          <Barcode className="w-4 h-4" />
        </button>
        <button
          onClick={onExport}
          className="p-2 rounded-lg border bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white transition-all"
          title="Exportar CSV"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenCategoryModal}
          className="p-2 rounded-lg border bg-(--bg-tertiary) border-(--border-color) text-slate-400 hover:text-white transition-all"
          title="Gestionar categorías"
        >
          <FolderEdit className="w-4 h-4" />
        </button>
        <div className="flex items-center bg-(--bg-tertiary)/50 rounded-lg p-1 border border-(--border-color)">
          <button
            onClick={() => onSetViewMode('table')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-(--brand-600) text-white' : 'text-slate-400 hover:text-white'}`}
            title="Vista Tabla"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSetViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-(--brand-600) text-white' : 'text-slate-400 hover:text-white'}`}
            title="Vista Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={onNewProduct}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>
    </div>
  )
}
