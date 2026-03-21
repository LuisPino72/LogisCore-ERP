import { useState, useEffect, useCallback, useMemo } from 'react'
import { useEmployees } from '../hooks/useEmployees'
import type { EmployeePermissions } from '../types/employees.types'
import type { SortField } from '../types/employees.types'
import type { Employee } from '@/lib/db'
import Button from '@/common/Button'
import { ConfirmationModal } from '@/common/ConfirmationModal'
import { Plus } from 'lucide-react'
import EmployeeFilters from './EmployeeFilters'
import EmployeeList from './EmployeeList'
import EmployeePagination from './EmployeePagination'
import EmployeeModal from './EmployeeModal'

const PAGE_SIZE = 10

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined)
  const [isEditing, setIsEditing] = useState(false)
  const [sort, setSort] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({ field: 'createdAt', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; localId: string | null }>({ isOpen: false, localId: null })

  const { loading, loadEmployees, createEmployee, updatePermissions, deleteEmployee } = useEmployees()

  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])

  const loadEmployeesData = useCallback(async (search: string, s: typeof sort, page: number, pageSize: number) => {
    const result = await loadEmployees(search, s, page, pageSize)
    if (result) {
      setFilteredEmployees(result.employees)
      setTotal(result.total)
    }
  }, [loadEmployees])

  useEffect(() => {
    loadEmployeesData(searchQuery, sort, currentPage, PAGE_SIZE)
  }, [searchQuery, sort, currentPage, loadEmployeesData])

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total])

  const handleSort = useCallback((field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
    setCurrentPage(1)
  }, [])

  const handleCreateEmployee = async (email: string, password: string, permissions: EmployeePermissions) => {
    const success = await createEmployee(email, password, permissions)
    if (success) {
      loadEmployeesData(searchQuery, sort, currentPage, PAGE_SIZE)
    }
    return success
  }

  const handleUpdatePermissions = async (_email: string, _password: string, permissions: EmployeePermissions) => {
    if (!editingEmployee) return false
    const success = await updatePermissions(editingEmployee.localId, permissions)
    if (success) {
      loadEmployeesData(searchQuery, sort, currentPage, PAGE_SIZE)
    }
    return success
  }

  const handleDeleteEmployee = (employee: Employee) => {
    setConfirmDelete({ isOpen: true, localId: employee.localId })
  }

  const confirmDeleteEmployee = async () => {
    if (!confirmDelete.localId) return
    const success = await deleteEmployee(confirmDelete.localId)
    if (success) {
      loadEmployeesData(searchQuery, sort, currentPage, PAGE_SIZE)
    }
    setConfirmDelete({ isOpen: false, localId: null })
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
          <h2 className="text-2xl font-bold text-(--text-primary)" title="Gestionar empleados y sus permisos">Empleados</h2>
          <p className="text-(--text-secondary)">{total} empleados</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      <EmployeeFilters
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        sort={sort}
        onSortChange={handleSort}
      />

      <EmployeeList
        employees={filteredEmployees}
        isLoading={loading}
        onEdit={openEditModal}
        onDelete={handleDeleteEmployee}
      />

      <EmployeePagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      <EmployeeModal
        employee={editingEmployee}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={isEditing ? handleUpdatePermissions : handleCreateEmployee}
        isEditing={isEditing}
      />

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        message="¿Estás seguro de eliminar este empleado?"
        title="Eliminar Empleado"
        confirmText="Eliminar"
        onConfirm={confirmDeleteEmployee}
        onCancel={() => setConfirmDelete({ isOpen: false, localId: null })}
      />
    </div>
  )
}
