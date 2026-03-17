import { useState, useEffect, useCallback } from 'react'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import * as adminService from '../services/admin.service'
import type { Tenant } from '../types/admin.types'
import { isOk } from '@/lib/types/result'

export interface UseAdminReturn {
  tenants: Tenant[]
  filteredTenants: Tenant[]
  loading: boolean
  error: string | null
  searchQuery: string
  viewMode: 'table' | 'grid' | 'expandable'
  expandedId: string | null
  editingTenant: Tenant | null
  setSearchQuery: (query: string) => void
  setViewMode: (mode: 'table' | 'grid' | 'expandable') => void
  setExpandedId: (id: string | null) => void
  setEditingTenant: (tenant: Tenant | null) => void
  fetchTenants: () => Promise<void>
  createTenant: (name: string, slug: string) => Promise<boolean>
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<boolean>
  deleteTenant: (id: string) => Promise<boolean>
  uploadLogo: (tenantId: string, file: File) => Promise<boolean>
  createOwner: (tenantId: string, email: string, password: string) => Promise<boolean>
  handleImpersonate: (tenant: Tenant) => void
}

export function useAdmin(): UseAdminReturn {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'expandable'>('table')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  const startImpersonation = useTenantStore((state) => state.startImpersonation)
  const { showError, showSuccess } = useToast()

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    const result = await adminService.getAllTenants()
    if (isOk(result)) {
      setTenants(result.value)
      setFilteredTenants(result.value)
    } else {
      setError(result.error.message)
      showError(result.error.message)
    }
    setLoading(false)
  }, [showError])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  useEffect(() => {
    const query = searchQuery.toLowerCase()
    const filtered = tenants.filter(
      (t) => t.name.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
    )
    setFilteredTenants(filtered)
  }, [searchQuery, tenants])

  const createTenant = useCallback(
    async (name: string, slug: string): Promise<boolean> => {
      setLoading(true)
      const result = await adminService.createTenant(name, slug)
      if (isOk(result)) {
        showSuccess('Tenant creado correctamente')
        await fetchTenants()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [fetchTenants, showError, showSuccess]
  )

  const updateTenant = useCallback(
    async (id: string, data: Partial<Tenant>): Promise<boolean> => {
      setLoading(true)
      const result = await adminService.updateTenant(id, data)
      if (isOk(result)) {
        showSuccess('Cambios guardados correctamente')
        setEditingTenant(null)
        await fetchTenants()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [fetchTenants, setEditingTenant, showError, showSuccess]
  )

  const deleteTenant = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      const result = await adminService.deleteTenant(id)
      if (isOk(result)) {
        showSuccess('Tenant eliminado correctamente')
        await fetchTenants()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [fetchTenants, showError, showSuccess]
  )

  const uploadLogo = useCallback(
    async (tenantId: string, file: File): Promise<boolean> => {
      setLoading(true)
      const result = await adminService.uploadLogo(tenantId, file)
      if (isOk(result)) {
        showSuccess('Logo actualizado')
        setEditingTenant({
          ...editingTenant!,
          config: { ...editingTenant!.config, logoUrl: result.value },
        })
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [editingTenant, setEditingTenant, showError, showSuccess]
  )

  const createOwner = useCallback(
    async (tenantId: string, email: string, password: string): Promise<boolean> => {
      setLoading(true)
      const result = await adminService.createOwner(tenantId, email, password)
      if (isOk(result)) {
        showSuccess(`Usuario "${email}" creado exitosamente como dueño`)
        await fetchTenants()
        setLoading(false)
        return true
      }
      showError(result.error.message)
      setLoading(false)
      return false
    },
    [fetchTenants, showError, showSuccess]
  )

  const handleImpersonate = useCallback(
    (tenant: Tenant) => {
      startImpersonation({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        modules: tenant.modules,
        config: tenant.config as unknown as Record<string, unknown>,
      })
    },
    [startImpersonation]
  )

  return {
    tenants,
    filteredTenants,
    loading,
    error,
    searchQuery,
    viewMode,
    expandedId,
    editingTenant,
    setSearchQuery,
    setViewMode,
    setExpandedId,
    setEditingTenant,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    uploadLogo,
    createOwner,
    handleImpersonate,
  }
}