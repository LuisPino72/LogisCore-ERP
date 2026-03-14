import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useTenantStore, TenantThemeConfig } from '@/store/useTenantStore'
import { useToast } from '@/providers/ToastProvider'
import {
  Search, LayoutGrid, List, ChevronDown, ChevronUp,
  Store, Hash, Users, Plus, Edit2, LogIn,
  Building2, X, Check, Palette, KeyRound
} from 'lucide-react'

const ALL_MODULES = [
  { id: 'sales', label: 'Ventas' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'purchases', label: 'Compras' },
  { id: 'recipes', label: 'Recetas' },
  { id: 'pos', label: 'Punto de Venta' },
] as const

interface TenantModules {
  sales?: boolean
  inventory?: boolean
  purchases?: boolean
  recipes?: boolean
  reports?: boolean
  dashboard?: boolean
  pos?: boolean
  [key: string]: boolean | undefined
}

interface TenantConfig {
  logoUrl?: string
  maxEmployees?: number
  themeConfig?: TenantThemeConfig
  ownerId?: string
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
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerLoading, setOwnerLoading] = useState(false)
  const { showError, showSuccess } = useToast()
  const startImpersonation = useTenantStore((state) => state.startImpersonation)

  const getThemeConfig = (config: TenantConfig | undefined): TenantThemeConfig => {
    return config?.themeConfig || { themeColor: '#ea580c', mode: 'dark', accentIntensity: 'normal' }
  }

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
      config: tenant.config as unknown as Record<string, unknown>
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

  const handleCreateOwner = async () => {
    if (!editingTenant) return
    if (!ownerUsername.trim()) {
      showError('El nombre de usuario es requerido')
      return
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (ownerPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden')
      return
    }

    setOwnerLoading(true)
    try {
      const email = ownerUsername.trim()
      
      // Crear un cliente temporal que no persista la sesión para evitar que el admin actual sea desconectado
      // Se utiliza un almacenamiento nulo para garantizar el aislamiento total
      const tempClient = (await import('@supabase/supabase-js')).createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { 
          auth: { 
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {}
            }
          } 
        }
      )

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email,
        password: ownerPassword,
        options: {
          data: {
            username: ownerUsername,
            tenant_id: editingTenant.id
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          showError('Ya existe un usuario con ese nombre')
        } else {
          showError('Error al crear usuario: ' + authError.message)
        }
        setOwnerLoading(false)
        return
      }

      if (authData.user) {
        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: authData.user.id,
          tenant_id: editingTenant.id,
          role: 'owner'
        })

        if (roleError) {
          showError('Error al asignar rol de dueño: ' + roleError.message)
          setOwnerLoading(false)
          return
        }

        const newConfig = { ...editingTenant.config, ownerId: authData.user.id }
        const { error: updateError } = await supabase.from('tenants').update({
          config: newConfig
        }).eq('id', editingTenant.id)

        if (updateError) {
          showError('Error al actualizar tenant: ' + updateError.message)
        } else {
          setEditingTenant({ ...editingTenant, config: newConfig })
          showSuccess(`Usuario "${ownerUsername}" creado exitosamente como dueño`)
          setOwnerUsername('')
          setOwnerPassword('')
          setConfirmPassword('')
        }
      }
    } catch (error) {
      showError('Error al crear usuario owner')
    }
    setOwnerLoading(false)
  }



  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const renderModuleBadges = (tenant: Tenant) => {
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

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 bg-(--bg-tertiary) rounded-full flex items-center justify-center mb-6 ring-4 ring-(--border-color)/50">
        <Building2 className="w-12 h-12 text-(--text-muted)" />
      </div>
      <h3 className="text-xl font-semibold text-(--text-primary) mb-2">No hay negocios registrados</h3>
      <p className="text-(--text-secondary) mb-8 max-w-sm">Comienza creando tu primer negocio para gestionar tus tenants.</p>
      <button
        onClick={() => setEditingTenant(null)}
        className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl transition-all duration-200 shadow-lg shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 hover:scale-105 active:scale-95"
      >
        <Plus className="w-5 h-5" />
        Crear Primer Negocio
      </button>
    </div>
  )

  const renderTenantCard = (tenant: Tenant) => (
    <div key={tenant.id} className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all duration-300 group">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-(--bg-tertiary) rounded-xl flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-(--border-subtle) group-hover:ring-(--brand-500)/30 transition-all">
          {tenant.config?.logoUrl ? (
            <img src={tenant.config.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-7 h-7 text-(--text-muted)" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-(--text-primary) text-lg truncate">{tenant.name}</h3>
          <p className="text-(--text-muted) text-sm font-mono truncate">/{tenant.slug}</p>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        <div>
          <p className="text-xs text-(--text-muted) mb-2 uppercase tracking-wide font-medium">Módulos</p>
          {renderModuleBadges(tenant)}
        </div>
        <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
          <Users className="w-4 h-4 text-(--brand-400)" />
          <span>{tenant.config?.maxEmployees || 3} usuarios permitidos</span>
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-(--border-color)">
        <button
          onClick={() => handleImpersonate(tenant)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30"
        >
          <LogIn className="w-4 h-4" />
          Entrar
        </button>
        <button
          onClick={() => setEditingTenant(tenant)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) rounded-xl text-sm font-medium transition-all duration-200 border border-(--border-color) hover:border-(--brand-500)/30"
        >
          <Edit2 className="w-4 h-4" />
          Editar
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
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

      {!editingTenant ? (
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
      ) : (
        <section className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-(--brand-400) flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Editando: {editingTenant.name}
            </h3>
            <button
              type="button"
              onClick={() => setEditingTenant(null)}
              className="text-sm text-(--text-muted) hover:text-(--text-primary) flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-(--bg-tertiary) transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
          <form onSubmit={handleUpdateTenant} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-(--text-secondary) mb-1.5 font-medium">Nombre Comercial</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-3 py-3 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl text-(--text-primary) focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                    value={editingTenant.name}
                    onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-(--text-secondary) mb-1.5 font-medium">Max Empleados</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
                  <input
                    type="number"
                    required
                    className="w-full pl-10 pr-3 py-3 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl text-(--text-primary) focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                    value={editingTenant.config?.maxEmployees || 3}
                    onChange={(e) => setEditingTenant({ ...editingTenant, config: { ...editingTenant.config, maxEmployees: parseInt(e.target.value) } })}
                  />
                </div>
              </div>
              <div>
                <label className="flex text-sm text-(--text-secondary) mb-1.5 font-medium items-center justify-between">
                  Logotipo
                  {editingTenant.config?.logoUrl && (
                    <a href={editingTenant.config.logoUrl} target="_blank" rel="noreferrer" className="text-(--brand-400) hover:underline text-xs">Ver Actual</a>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-(--brand-600) file:text-white hover:file:bg-(--brand-500) transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm text-(--text-secondary) mb-2 font-medium">
                  <span className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Personalización Visual
                  </span>
                </label>
                <div className="space-y-4 bg-(--bg-secondary) p-5 rounded-2xl border border-(--border-color) shadow-inner">
                  <div>
                    <label className="block text-xs text-(--text-muted) mb-2 font-medium">Color Principal</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={getThemeConfig(editingTenant.config).themeColor}
                        onChange={(e) => {
                          const tc = getThemeConfig(editingTenant.config)
                          setEditingTenant({ ...editingTenant, config: { ...editingTenant.config, themeConfig: { ...tc, themeColor: e.target.value } } })
                        }}
                        className="h-12 w-12 rounded-xl border-2 border-(--border-color) bg-(--bg-tertiary) cursor-pointer hover:scale-105 transition-transform"
                      />
                      <input
                        type="text"
                        value={getThemeConfig(editingTenant.config).themeColor}
                        onChange={(e) => {
                          const tc = getThemeConfig(editingTenant.config)
                          setEditingTenant({ ...editingTenant, config: { ...editingTenant.config, themeConfig: { ...tc, themeColor: e.target.value } } })
                        }}
                        className="flex-1 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) font-mono uppercase text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-(--text-muted) mb-2 font-medium">Color Secundario (opcional)</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={getThemeConfig(editingTenant.config).themeColorSecondary || '#65a30d'}
                        onChange={(e) => {
                          const tc = getThemeConfig(editingTenant.config)
                          setEditingTenant({ ...editingTenant, config: { ...editingTenant.config, themeConfig: { ...tc, themeColorSecondary: e.target.value } } })
                        }}
                        className="h-12 w-12 rounded-xl border-2 border-(--border-color) bg-(--bg-tertiary) cursor-pointer hover:scale-105 transition-transform"
                      />
                      <input
                        type="text"
                        value={getThemeConfig(editingTenant.config).themeColorSecondary || '#65a30d'}
                        onChange={(e) => {
                          const tc = getThemeConfig(editingTenant.config)
                          setEditingTenant({ ...editingTenant, config: { ...editingTenant.config, themeConfig: { ...tc, themeColorSecondary: e.target.value } } })
                        }}
                        className="flex-1 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) font-mono uppercase text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-(--text-muted) mb-2 font-medium">Intensidad del Color</label>
                    <div className="flex gap-2">
                      {(['subtle', 'normal', 'bold'] as const).map((intensity) => (
                        <button
                          key={intensity}
                          type="button"
                          onClick={() => {
                            const tc = getThemeConfig(editingTenant.config)
                            setEditingTenant({ ...editingTenant, config: { ...editingTenant.config, themeConfig: { ...tc, accentIntensity: intensity } } })
                          }}
                          className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            getThemeConfig(editingTenant.config).accentIntensity === intensity
                              ? 'bg-linear-to-r from-(--brand-600) to-(--brand-500) text-white shadow-md'
                              : 'bg-(--bg-tertiary) text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
                          }`}
                        >
                          {intensity === 'subtle' ? 'Sutil' : intensity === 'normal' ? 'Normal' : 'Audaz'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-(--border-color)">
                    <p className="text-xs text-(--text-muted)">
                      Vista previa:
                      <span
                        className="ml-2 px-3 py-1.5 rounded-lg font-medium inline-block"
                        style={{
                          backgroundColor: getThemeConfig(editingTenant.config).themeColor,
                          color: 'white'
                        }}
                      >
                        Botón
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-5 border-t border-(--border-color)">
              <h4 className="text-sm font-semibold text-(--text-primary) mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-(--brand-400)" />
                Módulos Activos
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-(--bg-primary) p-5 rounded-xl border border-(--border-color)">
                {ALL_MODULES.map(mod => (
                  <label
                    key={mod.id}
                    className={`flex items-center gap-3 text-sm rounded-xl p-3 cursor-pointer transition-all ${
                      editingTenant.modules?.[mod.id]
                        ? 'bg-(--brand-500)/10 text-(--brand-400) border border-(--brand-500)/30'
                        : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary) border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!editingTenant.modules?.[mod.id]}
                      onChange={(e) => setEditingTenant({ ...editingTenant, modules: { ...editingTenant.modules, [mod.id]: e.target.checked } })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      editingTenant.modules?.[mod.id]
                        ? 'bg-(--brand-500) border-(--brand-500)'
                        : 'border-(--border-color)'
                    }`}>
                      {editingTenant.modules?.[mod.id] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="capitalize font-medium">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 flex items-center justify-center gap-2 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl transition-all duration-200 shadow-lg shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 font-medium"
            >
              {loading ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar Cambios y Cerrar Edición</>}
            </button>
          </form>
          <div className="pt-6 border-t border-(--border-color)">
            <h4 className="text-sm font-semibold text-(--text-primary) mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-(--text-muted)" />
              Crear Usuario Owner
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs text-(--text-muted) mb-1.5 font-medium">Nombre de Usuario</label>
                <input
                  type="text"
                  placeholder="Ej: juan_admin"
                  className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-(--text-muted) mb-1.5 font-medium">Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-(--text-muted) mb-1.5 font-medium">Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  disabled={ownerLoading || !!editingTenant.config?.ownerId}
                  onClick={handleCreateOwner}
                  className="w-full py-3 bg-(--brand-600) hover:bg-(--brand-500) disabled:bg-(--bg-tertiary) text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:text-(--text-muted)"
                >
                  {ownerLoading ? 'Creando...' : editingTenant.config?.ownerId ? 'Owner ya creado' : <><KeyRound className="w-4 h-4" /> Crear Owner</>}
                </button>
              </div>
            </div>
            <p className="text-xs text-(--text-muted) mt-3">
              {editingTenant.config?.ownerId 
                ? '✓ Ya existe un usuario owner para este negocio' 
                : 'El usuario owner podrá iniciar sesión con las credenciales que proporciones. Solo puede haber un owner por empresa.'}
            </p>
          </div>
        </section>
      )}

      {!editingTenant && (
        <>
          {filteredTenants.length === 0 ? (
            renderEmptyState()
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTenants.map(renderTenantCard)}
            </div>
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
