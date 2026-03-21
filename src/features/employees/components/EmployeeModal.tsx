import { useState, useCallback, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import Button from '@/common/Button'
import type { Employee } from '@/lib/db'
import { DEFAULT_EMPLOYEE_PERMISSIONS, PERMISSION_LABELS, type EmployeePermissions } from '../types/employees.types'

interface EmployeeModalProps {
  employee?: Employee
  isOpen: boolean
  onClose: () => void
  onSave: (email: string, password: string, permissions: EmployeePermissions) => Promise<boolean>
  isEditing: boolean
}

export default function EmployeeModal({ employee, isOpen, onClose, onSave, isEditing }: EmployeeModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_EMPLOYEE_PERMISSIONS)

  useEffect(() => {
    if (employee && isEditing) {
      setPermissions((employee.permissions as EmployeePermissions) || DEFAULT_EMPLOYEE_PERMISSIONS)
    } else {
      setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS)
    }
    setEmail('')
    setPassword('')
  }, [employee, isEditing, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await onSave(email, password, permissions)
    if (success) {
      onClose()
    }
    setLoading(false)
  }

  const togglePermission = useCallback((key: keyof EmployeePermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) rounded-xl border border-(--border-color) w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary)">
            {isEditing ? 'Editar Permisos' : 'Nuevo Empleado'}
          </h3>
          <button onClick={onClose} title="Cerrar" className="p-1 hover:bg-(--bg-tertiary) rounded-lg">
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!isEditing && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Email</label>
                <input
                  type="email"
                  title="Correo electrónico del empleado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Contraseña Temporal</label>
                <input
                  type="password"
                  title="Contraseña temporal para el primer acceso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-(--text-secondary) mb-3">Permisos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(PERMISSION_LABELS) as (keyof EmployeePermissions)[]).map((key) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    permissions[key]
                      ? 'bg-(--brand-500)/10 border-(--brand-500)/30 text-(--brand-400)'
                      : 'bg-(--bg-tertiary)/50 border-(--border-color) text-(--text-muted)'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      permissions[key]
                        ? 'bg-(--brand-500) border-(--brand-500)'
                        : 'border-(--border-color)'
                    }`}
                  >
                    {permissions[key] && <X className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm">{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEditing ? 'Guardar Permisos' : 'Crear Empleado'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
