import { Button } from '@/common'
import { Trash2 } from 'lucide-react'
import type { Category } from '@/lib/db'

interface CategoryDeleteConfirmProps {
  isOpen: boolean
  category: Category | null
  onConfirm: () => void
  onCancel: () => void
}

export default function CategoryDeleteConfirm({ isOpen, category, onConfirm, onCancel }: CategoryDeleteConfirmProps) {
  if (!isOpen || !category) return null

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Eliminar Categoría</h3>
          <p className="text-slate-400 mb-6">
            ¿Eliminar "<span className="text-white">{category.name}</span>"? Los productos sin categoría se mantendrán.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600">
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
