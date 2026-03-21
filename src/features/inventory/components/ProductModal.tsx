import { Button, Input } from '@/common'
import { Plus, X, Edit2, Image as ImageIcon, Loader2, Star, Trash2 } from 'lucide-react'
import type { Category } from '@/lib/db'
import type { ProductFormData } from '../types/inventory.types'

interface ProductModalProps {
  isOpen: boolean
  editingId: string | null
  categories: Category[]
  form: ProductFormData
  imagePreview: string | null
  uploadingImage: boolean
  showNewCategory: boolean
  newCategoryName: string
  onClose: () => void
  onResetForm: () => void
  onFormChange: (form: ProductFormData) => void
  onImageFileChange: (file: File | null) => void
  onImagePreviewChange: (url: string | null) => void
  onShowNewCategory: (show: boolean) => void
  onNewCategoryNameChange: (name: string) => void
  onCreateCategory: (name: string) => Promise<void>
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export default function ProductModal({
  isOpen,
  editingId,
  categories,
  form,
  imagePreview,
  uploadingImage,
  showNewCategory,
  newCategoryName,
  onClose,
  onResetForm,
  onFormChange,
  onImageFileChange,
  onImagePreviewChange,
  onShowNewCategory,
  onNewCategoryNameChange,
  onCreateCategory,
  onSubmit,
}: ProductModalProps) {
  const selectedCategory = categories.find(c => c.id === form.categoryId)
  
  const handleClose = () => {
    onClose()
    onResetForm()
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    await onCreateCategory(newCategoryName.trim())
    onShowNewCategory(false)
    onNewCategoryNameChange('')
  }

  const saleType = selectedCategory?.saleType || 'unit'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-(--brand-400)" /> : <Plus className="w-5 h-5 text-green-400" />}
            {editingId ? 'Editar Producto' : 'Crear Nuevo Producto'}
          </h3>
          <button onClick={handleClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <label className="text-sm font-medium text-slate-400 mb-2 block">Imagen</label>
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center overflow-hidden relative group">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { onImageFileChange(null); onImagePreviewChange(null); }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-slate-500 mb-1" />
                          <span className="text-[10px] text-slate-500">Subir</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            onImageFileChange(file)
                            onImagePreviewChange(URL.createObjectURL(file))
                          }
                        }}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Input
                  label="Nombre del Producto"
                  title="Nombre visible del producto"
                  value={form.name}
                  onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                  placeholder="Ej: Hamburguesa Especial"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SKU / Código"
                title="Código único de identificación del producto"
                value={form.sku}
                onChange={(e) => onFormChange({ ...form, sku: e.target.value })}
                placeholder="Ene-001"
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">Categoría</label>
                {showNewCategory ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => onNewCategoryNameChange(e.target.value)}
                      placeholder="Nueva categoría..."
                      className="flex-1 px-4 py-2.5 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { onShowNewCategory(false); onNewCategoryNameChange(''); }}
                      className="px-3 py-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select 
                      value={form.categoryId || ''}
                      onChange={(e) => onFormChange({ ...form, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                      className="flex-1 px-4 py-2.5 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories.map(cat => (
                        <option key={cat.localId} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onShowNewCategory(true)}
                      className="px-3 py-2 bg-(--brand-500)/20 text-(--brand-400) rounded-lg hover:bg-(--brand-500)/30 transition-colors"
                      title="Crear nueva categoría"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Precio Venta"
                title="Precio al que se venderá el producto"
                type="number"
                step="0.01"
                value={form.price}
                placeholder="0"
                onChange={(e) => onFormChange({ ...form, price: e.target.value })}
                onFocus={(e) => e.target.select()}
                required
              />
              <Input
                label="Costo Unitario"
                title="Costo de adquisición del producto"
                type="number"
                step="0.01"
                value={form.cost}
                placeholder="0"
                onChange={(e) => onFormChange({ ...form, cost: e.target.value })}
                onFocus={(e) => e.target.select()}
              />
              <Input
                label="Stock Inicial"
                title="Cantidad inicial en inventario"
                type="number"
                value={form.stock}
                placeholder="0"
                onChange={(e) => onFormChange({ ...form, stock: e.target.value })}
                onFocus={(e) => e.target.select()}
                required
              />
            </div>

            {saleType === 'weight' && (
              <Input
                label="Precio por Kilogramo"
                type="number"
                step="0.01"
                value={form.pricePerKg || ''}
                placeholder="0.00"
                onChange={(e) => onFormChange({ ...form, pricePerKg: e.target.value })}
                onFocus={(e) => e.target.select()}
              />
            )}
            
            {saleType === 'sample' && <SampleInputs form={form} onFormChange={onFormChange} />}

            <ToggleCheckbox
              id="isFavorite"
              checked={form.isFavorite}
              onChange={(checked) => onFormChange({ ...form, isFavorite: checked })}
              label="Producto Favorito"
              description="Aparece primero en el POS"
              icon={<Star className="w-4 h-4 text-amber-400" />}
            />

            <ToggleCheckbox
              id="isActive"
              checked={form.isActive}
              onChange={(checked) => onFormChange({ ...form, isActive: checked })}
              label="Producto Activo"
              description="Visible en el punto de venta"
              icon={null}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Descartar
            </button>
            <Button type="submit" className="px-8 shadow-lg shadow-(--brand-500)/20">
              {editingId ? 'Actualizar Producto' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SampleInputsProps {
  form: ProductFormData
  onFormChange: (form: ProductFormData) => void
}

function SampleInputs({ form, onFormChange }: SampleInputsProps) {
  const samples = form.samples || []

  const addSample = () => {
    const newSamples = [...samples, { id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }]
    onFormChange({ ...form, samples: newSamples })
  }

  const updateSample = (index: number, updates: Partial<typeof samples[0]>) => {
    const newSamples = [...samples]
    newSamples[index] = { ...newSamples[index], ...updates }
    onFormChange({ ...form, samples: newSamples })
  }

  const removeSample = (index: number) => {
    const newSamples = samples.filter((_, i) => i !== index)
    onFormChange({ ...form, samples: newSamples })
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-400">Muestras de Venta</label>
      <div className="space-y-2">
        {samples.map((sample, index) => (
          <div key={sample.id} className="flex gap-2 items-center">
            <input
              type="text"
              value={sample.name}
              onChange={(e) => updateSample(index, { name: e.target.value })}
              placeholder="Nombre (ej: Cartón)"
              className="flex-1 px-3 py-2 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary)"
            />
            <input
              type="number"
              value={sample.quantity}
              onChange={(e) => updateSample(index, { quantity: parseFloat(e.target.value) || 0 })}
              placeholder="Cant"
              className="w-20 px-3 py-2 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary)"
            />
            <input
              type="number"
              step="0.01"
              value={sample.price}
              onChange={(e) => updateSample(index, { price: parseFloat(e.target.value) || 0 })}
              placeholder="Precio"
              className="w-24 px-3 py-2 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary)"
            />
            <button
              type="button"
              onClick={() => removeSample(index)}
              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSample}
          className="text-sm text-(--brand-400) hover:text-(--brand-300)"
        >
          + Agregar muestra
        </button>
      </div>
    </div>
  )
}

interface ToggleCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
  icon: React.ReactNode
}

function ToggleCheckbox({ id, checked, onChange, label, description, icon }: ToggleCheckboxProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded-md bg-(--bg-primary) border-(--border-color) text-blue-600 focus:ring-(--brand-500)/20"
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-semibold text-white flex items-center gap-2">
          {icon}
          {label}
        </label>
        <span className="text-xs text-slate-500">{description}</span>
      </div>
    </div>
  )
}
