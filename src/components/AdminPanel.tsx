import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTenantStore } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import { 
  Search, LayoutGrid, List, ChevronDown, ChevronUp,
  Store, Hash, Users, Plus, Edit2, LogIn,
  Building2, X, Check
} from 'lucide-react'

interface TenantModules {
  sales?: boolean
  inventory?: boolean
  purchases?: boolean
  recipes?: boolean
  reports?: boolean
  [key: string]: boolean | undefined
}

interface TenantConfig {
  logoUrl?: string
  maxEmployees?: number
  themeColor?: string
  [key: string]: unknown
}

interface Tenant {
  id: string
  name: string
  slug: string
  modules: TenantModules
  config: TenantConfig
  created_at: string
}

type ViewMode = 'table' | 'grid' | 'expandable'

export default function AdminPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const { showError, showSuccess } = useToast()
  const startImpersonation = useTenantStore((state) => state.startImpersonation)

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    const query = searchQuery.toLowerCase()
    const filtered = tenants.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.slug.toLowerCase().includes(query)
    )
    setFilteredTenants(filtered)
  }, [searchQuery, tenants])

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (data) {
      setTenants(data)
      setFilteredTenants(data)
    }
  }

  const handleImpersonate = (tenant: Tenant) => {
    startImpersonation({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      modules: tenant.modules,
      config: tenant.config
    })
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('tenants').insert([
      { name, slug: slug.toLowerCase().replace(/\s+/g, '-') }
    ])
    if (error) {
      showError('Error al crear tenant: ' + error.message)
    } else {
      showSuccess('Tenant creado correctamente')
      setName('')
      setSlug('')
      fetchTenants()
    }
    setLoading(false)
  }

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTenant) return
    setLoading(true)
    const { error } = await supabase.from('tenants').update({
      name: editingTenant.name,
      modules: editingTenant.modules,
      config: editingTenant.config
    }).eq('id', editingTenant.id)
    
    if (error) {
      showError('Error al actualizar: ' + error.message)
    } else {
      showSuccess('Cambios guardados correctamente')
      setEditingTenant(null)
      fetchTenants()
    }
    setLoading(false)
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTenant || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setLoading(true)
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${editingTenant.id}-logo-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('tenant_assets')
      .upload(fileName, file, { upsert: true })
      
    if (uploadError) {
      showError('Error subiendo logo: ' + uploadError.message)
    } else {
      const { data } = supabase.storage.from('tenant_assets').getPublicUrl(fileName)
      setEditingTenant({
        ...editingTenant,
        config: { ...editingTenant.config, logoUrl: data.publicUrl }
      })
      showSuccess('Logo actualizado')
    }
    setLoading(false)
  }

  const handleInviteOwner = async (tenantId: string) => {
    if (!inviteEmail) {
      showError('Ingresa un correo electrónico')
      return
    }
    setInviteLoading(true)
    const { error } = await supabase.from('invitations').insert([{
      tenant_id: tenantId,
      email: inviteEmail,
      role: 'owner'
    }])
    if (error) {
      showError('Error invitando: ' + error.message)
    } else {
      showSuccess('Invitación enviada a ' + inviteEmail)
      setInviteEmail('')
    }
    setInviteLoading(false)
  }

  const getActiveModules = (tenant: Tenant) => Object.keys(tenant.modules || {}).filter(m => tenant.modules[m])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const renderModuleBadges = (tenant: Tenant) => {
    const modules = getActiveModules(tenant)
    return (
      <div className="flex flex-wrap gap-1.5">
        {modules.map(mod => (
          <span key={mod} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-md uppercase tracking-wide border border-blue-500/20 font-medium">
            {mod}
          </span>
        ))}
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <Building2 className="w-10 h-10 text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No hay negocios registrados</h3>
      <p className="text-slate-400 mb-6">Comienza creando tu primer negocio para gestionar tus tenants.</p>
      <button 
        onClick={() => setEditingTenant(null)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Crear Primer Negocio
      </button>
    </div>
  )

  const renderTenantCard = (tenant: Tenant) => (
    <div key={tenant.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-slate-700 transition-all duration-200">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          {tenant.config?.logoUrl ? (
            <img src={tenant.config.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-6 h-6 text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate">{tenant.name}</h3>
          <p className="text-slate-500 text-sm font-mono truncate">/{tenant.slug}</p>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Módulos</p>
          {renderModuleBadges(tenant)}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="w-4 h-4" />
          <span>{tenant.config?.maxEmployees || 3} usuarios permitidos</span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-800">
        <button 
          onClick={() => handleImpersonate(tenant)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Entrar
        </button>
        <button 
          onClick={() => setEditingTenant(tenant)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700"
        >
          <Edit2 className="w-4 h-4" />
          Editar
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y toggle */}
      {!editingTenant && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title="Vista Tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title="Vista Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('expandable')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'expandable' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title="Vista Expandible"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Formulario de Creación */}
      {!editingTenant ? (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Registrar Nuevo Negocio
          </h3>
          <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Nombre Comercial</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  required 
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Ej: Panadería Juan" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Slug (URL única)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  required 
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="ej-panaderia-juan" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary h-10 flex items-center justify-center gap-2"
            >
              {loading ? 'Creando...' : <><Plus className="w-4 h-4" /> Crear Empresa</>}
            </button>
          </form>
        </section>
      ) : (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Editando: {editingTenant.name}
            </h3>
            <button 
              type="button" 
              onClick={() => setEditingTenant(null)} 
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
          
          <form onSubmit={handleUpdateTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Nombre Comercial</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    required 
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    value={editingTenant.name} 
                    onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Max Empleados</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="number" 
                    required 
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    value={editingTenant.config?.maxEmployees || 3} 
                    onChange={(e) => setEditingTenant({...editingTenant, config: {...editingTenant.config, maxEmployees: parseInt(e.target.value)}})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="flex text-sm text-slate-400 mb-1.5 items-center justify-between">
                  Logotipo 
                  {editingTenant.config?.logoUrl && (
                    <a href={editingTenant.config.logoUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Ver Actual</a>
                  )}
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleUploadLogo} 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Color Principal</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={editingTenant.config?.themeColor || '#3b82f6'} 
                    onChange={(e) => setEditingTenant({...editingTenant, config: {...editingTenant.config, themeColor: e.target.value}})} 
                    className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={editingTenant.config?.themeColor || '#3b82f6'} 
                    onChange={(e) => setEditingTenant({...editingTenant, config: {...editingTenant.config, themeColor: e.target.value}})} 
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" />
                Módulos Activos
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {['sales', 'inventory', 'purchases', 'recipes'].map(mod => (
                  <label 
                    key={mod} 
                    className={`flex items-center gap-2.5 text-sm rounded-lg p-2 cursor-pointer transition-all ${
                      editingTenant.modules?.[mod] 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={!!editingTenant.modules?.[mod]} 
                      onChange={(e) => setEditingTenant({...editingTenant, modules: {...editingTenant.modules, [mod]: e.target.checked}})} 
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      editingTenant.modules?.[mod] 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-slate-600'
                    }`}>
                      {editingTenant.modules?.[mod] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="capitalize">{mod}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar Cambios y Cerrar Edición</>}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-800">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Invitar Dueño (Owner)
            </h4>
            <div className="flex gap-2 max-w-md">
              <input 
                type="email" 
                placeholder="correo@dueño.com" 
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all" 
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)} 
              />
              <button 
                disabled={inviteLoading} 
                onClick={() => handleInviteOwner(editingTenant.id)} 
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Invitar
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Solo puede registrarse un dueño por empresa. El usuario debe crear una cuenta usando el mismo correo para que el acceso se vincule automáticamente.</p>
          </div>
        </section>
      )}

      {/* Vista de Tenants */}
      {!editingTenant && (
        <>
          {filteredTenants.length === 0 ? (
            renderEmptyState()
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTenants.map(renderTenantCard)}
            </div>
          ) : (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Negocio</th>
                    <th className="px-6 py-4 font-medium">Módulos</th>
                    <th className="px-6 py-4 font-medium">Usuarios</th>
                    <th className="px-6 py-4 font-medium">Creado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTenants.map((t) => (
                    <>
                      <tr 
                        key={t.id} 
                        className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${viewMode === 'expandable' && expandedId === t.id ? 'bg-slate-800/30' : ''}`}
                        onClick={() => viewMode === 'expandable' && setExpandedId(expandedId === t.id ? null : t.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                              {t.config?.logoUrl ? (
                                <img src={t.config.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-white">{t.name}</p>
                              <p className="text-slate-500 font-mono text-xs">/{t.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {renderModuleBadges(t)}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-slate-500" />
                            {t.config?.maxEmployees || 3}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {formatDate(t.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {viewMode === 'expandable' && (
                              <button className="p-1 text-slate-500 hover:text-white">
                                {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleImpersonate(t); }} 
                              className="text-sm text-amber-500 hover:text-amber-400 hover:underline transition-colors font-medium flex items-center gap-1"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              Entrar
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingTenant(t); }} 
                              className="text-sm text-blue-400 hover:text-white border border-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                      {viewMode === 'expandable' && expandedId === t.id && (
                        <tr key={`${t.id}-expanded`} className="bg-slate-950/50">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Color</p>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded" 
                                    style={{ backgroundColor: t.config?.themeColor || '#3b82f6' }}
                                  />
                                  <span className="text-white font-mono text-sm">{t.config?.themeColor || '#3b82f6'}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">ID</p>
                                <p className="text-white font-mono text-xs">{t.id}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase mb-1">Configuración</p>
                                <p className="text-slate-400 text-sm">{JSON.stringify(t.config || {}).slice(0, 50)}...</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
