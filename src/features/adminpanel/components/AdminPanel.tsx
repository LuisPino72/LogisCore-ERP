import { useState, Fragment } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import {
  Search, LayoutGrid, List, ChevronDown, ChevronUp,
  Store, Hash, Users, Plus, Edit2, LogIn,
  Building2
} from 'lucide-react'
import { ALL_MODULES, DEFAULT_THEME_CONFIG } from '../types/admin.types'
import type { Tenant, TenantConfig, TenantThemeConfig } from '../types/admin.types'
import { DashboardMetrics } from './DashboardMetrics'
import { TenantGrid } from './TenantGrid'
import { TenantEditor } from './TenantEditor'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

function getThemeConfig(config: TenantConfig | undefined): TenantThemeConfig {
  return config?.themeConfig || DEFAULT_THEME_CONFIG
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function renderModuleBadges(tenant: Tenant) {
  const activeModuleIds = Object.keys(tenant.modules || {}).filter(m => tenant.modules[m])
  const modulesToShow = ALL_MODULES.filter(mod => activeModuleIds.includes(mod.id))
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {modulesToShow.map(mod => (
        <span key={mod.id} className="px-2 py-0.5 bg-(--brand-500)/10 text-(--brand-400) text-[10px] rounded-md uppercase tracking-wide border border-(--brand-500)/20 font-medium">
          {mod.label}
        </span>
      ))}
    </div>
  )
}

function renderEmptyState(onCreate: () => void) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-(--bg-tertiary) rounded-full flex items-center justify-center mb-6 ring-4 ring-(--border-color)/50">
        <Building2 className="w-12 h-12 text-(--text-muted)" />
      </div>
      <h3 className="text-xl font-semibold text-(--text-primary) mb-2">No hay negocios registrados</h3>
      <p className="text-(--text-secondary) mb-8 max-w-sm">Comienza creando tu primer negocio para gestionar tus tenants.</p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl transition-all duration-200 shadow-lg shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 hover:scale-105 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        Crear Primer Negocio
      </button>
    </div>
  )
}

export default function AdminPanel() {
  const {
    filteredTenants,
    loading,
    searchQuery,
    viewMode,
    expandedId,
    editingTenant,
    metrics,
    metricsLoading,
    deleteConfirm,
    setSearchQuery,
    setViewMode,
    setExpandedId,
    setEditingTenant,
    setDeleteConfirm,
    createTenant,
    updateTenant,
    uploadLogo,
    createOwner,
    handleImpersonate,
    deleteTenant,
  } = useAdmin()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(true)

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await createTenant(name, slug)
    if (success) {
      setName('')
      setSlug('')
      setShowCreateForm(false)
    }
  }

  const handleUpdateTenant = async (data: Partial<Tenant>) => {
    if (!editingTenant) return
    await updateTenant(editingTenant.id, data)
  }

  const handleUploadLogo = async (file: File) => {
    if (!editingTenant) return
    await uploadLogo(editingTenant.id, file)
  }

  const handleCreateOwner = async (email: string, password: string) => {
    if (!editingTenant) return
    await createOwner(editingTenant.id, email, password)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.tenantId) {
      await deleteTenant(deleteConfirm.tenantId)
    }
  }

  return (
    <div className="space-y-6">
      {metrics && (
        <DashboardMetrics metrics={metrics} loading={metricsLoading} />
      )}

      {editingTenant && (
        <TenantEditor
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSave={handleUpdateTenant}
          onUploadLogo={handleUploadLogo}
          onCreateOwner={handleCreateOwner}
          loading={loading}
        />
      )}

      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        tenantName={deleteConfirm.tenantName}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, tenantId: null, tenantName: '' })}
        loading={loading}
      />

      {!editingTenant && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por nombre o slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-secondary) border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 bg-(--bg-secondary) p-1.5 rounded-xl border border-(--border-color)">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'table' ? 'bg-linear-to-r from-(--brand-600) to-(--brand-500) text-white shadow-md' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary)'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-linear-to-r from-(--brand-600) to-(--brand-500) text-white shadow-md' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary)'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('expandable')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'expandable' ? 'bg-linear-to-r from-(--brand-600) to-(--brand-500) text-white shadow-md' : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary)'}`}
              title="Vista Expandible"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!editingTenant && showCreateForm && (
        <section className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-5 text-(--brand-400) flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Registrar Nuevo Negocio
          </h3>
          <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-(--text-secondary) mb-1.5 font-medium">Nombre Comercial</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-3 py-3 bg-(--bg-elevated) border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) focus:border-(--brand-500) focus:bg-(--bg-tertiary) focus:outline-none focus:ring-4 focus:ring-(--brand-500)/10 transition-all"
                  placeholder="Ej: Panadería Juan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-(--text-secondary) mb-1.5 font-medium">Slug (URL única)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-3 py-3 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl text-(--text-primary) placeholder-(--text-muted) focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  placeholder="ej-panaderia-juan"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-12 flex items-center justify-center gap-2 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl transition-all duration-200 shadow-lg shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 font-medium"
            >
              {loading ? 'Creando...' : <><Plus className="w-4 h-4" /> Crear Empresa</>}
            </button>
          </form>
        </section>
      )}

      {!editingTenant && (
        <>
          {filteredTenants.length === 0 ? (
            renderEmptyState(() => setShowCreateForm(true))
          ) : viewMode === 'grid' ? (
            <TenantGrid 
              tenants={filteredTenants} 
              onImpersonate={handleImpersonate}
              onEdit={setEditingTenant}
            />
          ) : (
            <section className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-(--bg-tertiary)/50 text-(--text-muted) text-sm uppercase font-medium">
                  <tr>
                    <th className="px-6 py-4">Negocio</th>
                    <th className="px-6 py-4">Módulos</th>
                    <th className="px-6 py-4">Usuarios</th>
                    <th className="px-6 py-4">Creado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-color)">
                  {filteredTenants.map((t) => (
                    <Fragment key={t.id}>
                      <tr
                        className={`hover:bg-(--bg-tertiary)/30 transition-colors cursor-pointer ${viewMode === 'expandable' && expandedId === t.id ? 'bg-(--bg-tertiary)/30' : ''}`}
                        onClick={() => viewMode === 'expandable' && setExpandedId(expandedId === t.id ? null : t.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-(--bg-tertiary) rounded-xl flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-(--border-color)/30">
                              {t.config?.logoUrl ? (
                                <img src={t.config.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-6 h-6 text-(--text-muted)" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-(--text-primary)">{t.name}</p>
                              <p className="text-(--text-muted) font-mono text-xs">/{t.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {renderModuleBadges(t)}
                        </td>
                        <td className="px-6 py-4 text-(--text-secondary)">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-(--brand-400)" />
                            {t.config?.maxEmployees || 3}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-(--text-muted) text-sm">
                          {formatDate(t.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {viewMode === 'expandable' && (
                              <button className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                                {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleImpersonate(t); }}
                              className="text-sm text-(--brand-400) hover:text-(--brand-300) hover:underline transition-colors font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-(--brand-500)/10"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              Entrar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingTenant(t); }}
                              className="text-sm text-(--text-muted) hover:text-(--text-primary) border border-(--border-color) hover:border-(--brand-500)/30 hover:bg-(--bg-tertiary) px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                      {viewMode === 'expandable' && expandedId === t.id && (
                        <tr key={`${t.id}-expanded`} className="bg-(--bg-primary)/50">
                          <td colSpan={5} className="px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                              <div>
                                <p className="text-xs text-(--text-muted) uppercase mb-2 font-medium">Color</p>
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-lg shadow-md"
                                    style={{ backgroundColor: getThemeConfig(t.config).themeColor }}
                                  />
                                  <span className="text-(--text-primary) font-mono text-sm">{getThemeConfig(t.config).themeColor}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-(--text-muted) uppercase mb-2 font-medium">ID</p>
                                <p className="text-(--text-primary) font-mono text-xs">{t.id}</p>
                              </div>
                              <div>
                                <p className="text-xs text-(--text-muted) uppercase mb-2 font-medium">Configuración</p>
                                <p className="text-(--text-secondary) text-sm">{JSON.stringify(t.config || {}).slice(0, 50)}...</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  )
}