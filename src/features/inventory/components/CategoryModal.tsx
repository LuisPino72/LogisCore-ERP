import { useState } from 'react'
import { Button } from '@/common'
import { X, Edit2, Trash2, FolderEdit, Plus } from 'lucide-react'
import type { Category } from '@/lib/db'
import type { SaleType } from '../types/inventory.types'

interface CategoryModalProps {
  isOpen: boolean
  categories: Category[]
  editingCategory: Category | null
  onClose: () => void
  onCreateCategory: (name: string, saleType?: SaleType) => Promise<void>
  onUpdateCategory: (localId: string, data: { name: string; saleType: SaleType }) => Promise<void>
  onDeleteCategory: (localId: string) => void
  onSetEditingCategory: (category: Category | null) => void
}

export default function CategoryModal({
  isOpen,
  categories,
  editingCategory,
  onClose,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSetEditingCategory,
}: CategoryModalProps) {
  const [form, setForm] = useState({ name: '', saleType: 'unit' as SaleType })

  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    onSetEditingCategory(null)
    setForm({ name: '', saleType: 'unit' })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    await onCreateCategory(form.name.trim(), form.saleType)
    setForm({ name: '', saleType: 'unit' })
  }

  const handleUpdate = async () => {
    if (!form.name.trim() || !editingCategory) return
    await onUpdateCategory(editingCategory.localId, { name: form.name.trim(), saleType: form.saleType })
    onSetEditingCategory(null)
    setForm({ name: '', saleType: 'unit' })
  }

  const handleEdit = (category: Category) => {
    onSetEditingCategory(category)
    setForm({ name: category.name, saleType: category.saleType || 'unit' })
  }

  const handleCancelEdit = () => {
    onSetEditingCategory(null)
    setForm({ name: '', saleType: 'unit' })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderEdit className="w-5 h-5 text-(--brand-400)" />
            Gestionar Categorías
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva categoría..."
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value, saleType: form.saleType })}
                className="flex-1 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted)"
              />
              <button
                onClick={editingCategory ? handleUpdate : handleCreate}
                disabled={!form.name.trim()}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <select
              value={form.saleType}
              onChange={(e) => setForm({ ...form, saleType: e.target.value as SaleType })}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
            >
              <option value="unit">Venta Unitaria</option>
              <option value="weight">Venta por Peso (kg)</option>
              <option value="sample">Venta por Muestra</option>
            </select>
          </div>
          
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.localId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-white">{cat.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(cat)}
                    title="Editar categoría"
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.localId)}
                    title="Eliminar categoría"
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-slate-500 py-4">No hay categorías</p>
            )}
          </div>
        </div>
        
        {editingCategory && (
          <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value, saleType: form.saleType })}
                className="flex-1 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
              />
              <Button onClick={handleUpdate} disabled={!form.name.trim()}>
                Guardar
              </Button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-2 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
            <select
              value={form.saleType}
              onChange={(e) => setForm({ ...form, saleType: e.target.value as SaleType })}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
            >
              <option value="unit">Venta Unitaria</option>
              <option value="weight">Venta por Peso (kg)</option>
              <option value="sample">Venta por Muestra</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
