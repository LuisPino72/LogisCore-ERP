import { useState, useEffect, useCallback } from 'react'
import { useEmployees } from '../hooks/useEmployees'
import type { EmployeePermissions } from '../types/employees.types'
import { DEFAULT_EMPLOYEE_PERMISSIONS, PERMISSION_LABELS } from '../types/employees.types'
import { Employee } from '@/lib/db'
import Card from '@/common/Card'
import Button from '@/common/Button'
import {
  Users,
  Search,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
} from 'lucide-react'

interface EmployeeModalProps {
  employee?: Employee
  isOpen: boolean
  onClose: () => void
  onSave: (email: string, password: string, permissions: EmployeePermissions) => Promise<boolean>
  isEditing: boolean
}

function EmployeeModal({ employee, isOpen, onClose, onSave, isEditing }: EmployeeModalProps) {
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
          <button onClick={onClose} className="p-1 hover:bg-(--bg-tertiary) rounded-lg">
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

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined)
  const [isEditing, setIsEditing] = useState(false)

  const { employees, loading, loadEmployees, createEmployee, updatePermissions, deleteEmployee } = useEmployees()

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const filteredEmployees = employees.filter(
    (e) =>
      e.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateEmployee = async (email: string, password: string, permissions: EmployeePermissions) => {
    return createEmployee(email, password, permissions)
  }

  const handleUpdatePermissions = async (_email: string, _password: string, permissions: EmployeePermissions) => {
    if (!editingEmployee) return false
    return updatePermissions(editingEmployee.localId, permissions)
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    return deleteEmployee(employee.localId)
  }

  const openCreateModal = () => {
    setEditingEmployee(undefined)
    setIsEditing(false)
    setShowModal(true)
  }

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsEditing(true)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-(--text-primary)">Empleados</h2>
          <p className="text-(--text-secondary)">Gestiona los empleados de tu negocio</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar empleados..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-(--text-muted)">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay empleados registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.localId}
                className="flex items-center justify-between p-4 bg-(--bg-tertiary)/50 rounded-lg border border-(--border-color)"
              >
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
                    onClick={() => openEditModal(employee)}
                    className="p-2 text-(--text-muted) hover:text-(--brand-400) hover:bg-(--bg-tertiary) rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee)}
                    className="p-2 text-(--text-muted) hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EmployeeModal
        employee={editingEmployee}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={isEditing ? handleUpdatePermissions : handleCreateEmployee}
        isEditing={isEditing}
      />
    </div>
  )
}