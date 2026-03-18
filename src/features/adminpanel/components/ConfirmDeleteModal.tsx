import { AlertTriangle } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  tenantName: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDeleteModal({ isOpen, tenantName, onConfirm, onCancel, loading }: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-(--text-primary)">Confirmar Eliminación</h3>
            <p className="text-sm text-(--text-muted)">Esta acción no se puede deshacer</p>
          </div>
        </div>
        
        <p className="text-(--text-secondary) mb-6">
          ¿Estás seguro de que deseas eliminar el negocio <strong className="text-(--text-primary)">"{tenantName}"</strong>? 
          Todos los datos asociados serán eliminados permanentemente.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) rounded-xl font-medium transition-colors border border-(--border-color)"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
