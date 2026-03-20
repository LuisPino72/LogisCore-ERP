import { AlertTriangle } from 'lucide-react'
import Button from './Button'

interface ConfirmationModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({
  isOpen,
  title = 'Confirmar Acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-(--text-primary)">{title}</h3>
            <p className="text-sm text-(--text-muted)">Esta acción no se puede deshacer</p>
          </div>
        </div>
        
        <p className="text-(--text-secondary) mb-6">
          {message}
        </p>
        
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
