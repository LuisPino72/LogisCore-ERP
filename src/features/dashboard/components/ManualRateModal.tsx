import { X } from 'lucide-react'
import Button from '@/common/Button'

interface ManualRateModalProps {
  isOpen: boolean
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

export function ManualRateModal({ isOpen, value, onChange, onSave, onClose }: ManualRateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary)">Configurar Tasa BCV</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400">Ingrese la tasa del dólar manualmente.</p>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tasa (Bs por USD)</label>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Ej: 36.50"
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>
          <Button onClick={onSave} className="w-full py-2.5">
            Guardar Tasa
          </Button>
        </div>
      </div>
    </div>
  )
}
