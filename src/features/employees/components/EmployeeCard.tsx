import { useState, useCallback } from 'react'
import { UserCheck, Shield, Eye, EyeOff, Edit2, Trash2 } from 'lucide-react'
import type { Employee } from '@/lib/db'
import { PERMISSION_LABELS, type EmployeePermissions } from '../types/employees.types'

interface EmployeeCardProps {
  employee: Employee
  onEdit: () => void
  onDelete: () => void
}

function getPermissionCount(permissions: EmployeePermissions) {
  return Object.values(permissions || {}).filter(Boolean).length
}

function getEnabledPermissions(permissions: EmployeePermissions) {
  return (Object.keys(permissions || {}) as (keyof EmployeePermissions)[])
    .filter(key => permissions[key])
    .map(key => PERMISSION_LABELS[key])
}

export default function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const permCount = getPermissionCount(employee.permissions as EmployeePermissions)
  const enabledPerms = getEnabledPermissions(employee.permissions as EmployeePermissions)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-4 bg-(--bg-tertiary)/50 rounded-lg border border-(--border-color)">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-(--brand-500)/20 rounded-full flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-(--brand-400)" />
          </div>
          <div>
            <p className="font-medium text-(--text-primary)">{employee.userId}</p>
            <p className="text-sm text-(--text-muted) capitalize">{employee.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleExpanded}
            title={isExpanded ? "Ocultar permisos" : "Ver permisos del empleado"}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            {permCount} permisos
            {isExpanded ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1" />}
          </button>
          <button
            onClick={onEdit}
            title="Editar permisos del empleado"
            className="p-2 text-(--text-muted) hover:text-(--brand-400) hover:bg-(--bg-tertiary) rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar empleado"
            className="p-2 text-(--text-muted) hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="ml-14 p-3 bg-(--bg-tertiary)/30 rounded-lg border border-(--border-color)">
          <div className="flex flex-wrap gap-2">
            {enabledPerms.length > 0 ? (
              enabledPerms.map((perm, idx) => (
                <span key={idx} className="px-2 py-1 bg-(--brand-500)/10 text-(--brand-400) text-xs rounded-md">
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-(--text-muted)">Sin permisos especiales</span>
            )}
          </div>
          <p className="text-xs text-(--text-muted) mt-2">
            Creado: {employee.createdAt.toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
