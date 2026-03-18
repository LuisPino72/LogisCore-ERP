import { useState, useCallback } from 'react'
import { useToast } from '@/providers/ToastProvider'
import * as employeesService from '../services/employees.service'
import type { EmployeePermissions } from '../types/employees.types'
import type { SortConfig } from '../types/employees.types'
import type { Employee } from '@/lib/db'
import { isOk } from '@/lib/types/result'

export interface UseEmployeesReturn {
  employees: Employee[]
  loading: boolean
  error: string | null
  loadEmployees: (search?: string, sort?: SortConfig, page?: number, pageSize?: number) => Promise<{ employees: Employee[]; total: number } | null>
  syncEmployees: () => Promise<boolean>
  createEmployee: (email: string, password: string, permissions: EmployeePermissions) => Promise<boolean>
  updatePermissions: (localId: string, permissions: EmployeePermissions) => Promise<boolean>
  deleteEmployee: (localId: string) => Promise<boolean>
}

export function useEmployees(): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showError, showSuccess } = useToast()

  const loadEmployees = useCallback(async (
    search: string = '', 
    sort?: SortConfig, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<{ employees: Employee[]; total: number } | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await employeesService.filterEmployees({ search, sort, page, pageSize })
      setEmployees(result.employees)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar empleados'
      setError(msg)
      showError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [showError])

  const syncEmployees = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    const result = await employeesService.syncEmployees()
    if (isOk(result)) {
      await loadEmployees()
      showSuccess(`Sincronizados ${result.value} empleados`)
      setLoading(false)
      return true
    }
    showError(result.error.message)
    setLoading(false)
    return false
  }, [loadEmployees, showError, showSuccess])

  const createEmployee = useCallback(
    async (email: string, password: string, permissions: EmployeePermissions): Promise<boolean> => {
      setLoading(true)
      const result = await employeesService.createEmployee(email, password, permissions)
      if (isOk(result)) {
        showSuccess('Empleado creado correctamente')
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [showError, showSuccess],
  )

  const updatePermissions = useCallback(
    async (localId: string, permissions: EmployeePermissions): Promise<boolean> => {
      setLoading(true)
      const result = await employeesService.updateEmployeePermissions(localId, permissions)
      if (isOk(result)) {
        showSuccess('Permisos actualizados correctamente')
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [showError, showSuccess],
  )

  const deleteEmployee = useCallback(
    async (localId: string): Promise<boolean> => {
      const confirmed = window.confirm('¿Estás seguro de eliminar este empleado?')
      if (!confirmed) return false

      setLoading(true)
      const result = await employeesService.deleteEmployee(localId)
      if (isOk(result)) {
        showSuccess('Empleado eliminado correctamente')
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [showError, showSuccess],
  )

  return {
    employees,
    loading,
    error,
    loadEmployees,
    syncEmployees,
    createEmployee,
    updatePermissions,
    deleteEmployee,
  }
}