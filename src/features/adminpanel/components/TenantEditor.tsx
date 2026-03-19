import { useState, type FormEvent } from 'react'
import { X, Check, Palette, Store, Users, KeyRound } from 'lucide-react'
import type { Tenant, TenantThemeConfig } from '../types/admin.types'

interface TenantEditorProps {
  tenant: Tenant | null
  onClose: () => void
  onSave: (data: Partial<Tenant>) => Promise<void>
  onUploadLogo: (file: File) => Promise<void>
  onCreateOwner: (email: string, password: string) => Promise<void>
  loading?: boolean
}

function getThemeConfig(config: Tenant['config']): TenantThemeConfig {
  return config?.themeConfig || { themeColor: '#ea580c' }
}

export function TenantEditor({ tenant, onClose, onSave, onUploadLogo, onCreateOwner, loading }: TenantEditorProps) {
  const [localTenant, setLocalTenant] = useState<Tenant>(tenant as Tenant)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerLoading, setOwnerLoading] = useState(false)

  if (!tenant) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await onSave({
      name: localTenant.name,
      modules: localTenant.modules,
      config: localTenant.config,
    })
  }

  const handleNameChange = (value: string) => {
    setLocalTenant(prev => ({ ...prev, name: value }))
  }

  const handleConfigChange = (config: Tenant['config']) => {
    setLocalTenant(prev => ({ ...prev, config }))
  }

  const handleModulesChange = (modules: Tenant['modules']) => {
    setLocalTenant(prev => ({ ...prev, modules }))
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    await onUploadLogo(e.target.files[0])
  }

  const handleCreateOwner = async () => {
    if (!ownerEmail.trim() || !ownerPassword || ownerPassword.length < 6) return
    if (ownerPassword !== confirmPassword) return
    
    setOwnerLoading(true)
    await onCreateOwner(ownerEmail, ownerPassword)
    setOwnerEmail('')
    setOwnerPassword('')
    setConfirmPassword('')
    setOwnerLoading(false)
  }

  const themeConfig = getThemeConfig(localTenant.config)

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-(--bg-secondary) border-l border-(--border-color) shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300">
      <div className="sticky top-0 bg-(--bg-secondary) border-b border-(--border-color) p-5 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
          <span>✏️</span>
          Editar: {tenant.name}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary) rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-(--text-secondary) mb-1.5 font-medium">Nombre Comercial</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-3 py-3 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl text-(--text-primary) focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                value={localTenant.name}
                onChange={(e) => handleNameChange(e.target.value)}
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
                value={localTenant.config?.maxEmployees || 3}
                onChange={(e) => handleConfigChange({ 
                  ...localTenant.config, maxEmployees: parseInt(e.target.value) 
                })}
              />
            </div>
          </div>

          <div>
            <label className="flex text-sm text-(--text-secondary) mb-1.5 font-medium items-center justify-between">
              Logotipo
              {tenant.config?.logoUrl && (
                <a href={tenant.config.logoUrl} target="_blank" rel="noreferrer" className="text-(--brand-400) hover:underline text-xs">Ver Actual</a>
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
            <div className="space-y-4 bg-(--bg-primary) p-5 rounded-2xl border border-(--border-color)">
              <div>
                <label className="block text-xs text-(--text-muted) mb-2 font-medium">Color Principal</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={themeConfig.themeColor}
                    onChange={(e) => handleConfigChange({
                      ...localTenant.config, 
                      themeConfig: { ...themeConfig, themeColor: e.target.value } 
                    })}
                    className="h-12 w-12 rounded-xl border-2 border-(--border-color) bg-(--bg-tertiary) cursor-pointer hover:scale-105 transition-transform"
                  />
                  <input
                    type="text"
                    value={themeConfig.themeColor}
                    onChange={(e) => handleConfigChange({
                      ...localTenant.config, 
                      themeConfig: { ...themeConfig, themeColor: e.target.value } 
                    })}
                    className="flex-1 bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) font-mono uppercase text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-(--border-color)">
          <h4 className="text-sm font-semibold text-(--text-primary) mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-(--brand-400)" />
            Módulos Activos
          </h4>
          <div className="grid grid-cols-2 gap-3 bg-(--bg-primary) p-4 rounded-xl border border-(--border-color)">
            {[
              { id: 'sales', label: 'Ventas' },
              { id: 'inventory', label: 'Inventario' },
              { id: 'purchases', label: 'Compras' },
              { id: 'recipes', label: 'Recetas' },
              { id: 'pos', label: 'Punto de Venta' },
              { id: 'employees', label: 'Empleados' },
              { id: 'customers', label: 'Clientes' },
              { id: 'invoicing', label: 'Facturación' },
            ].map(mod => (
              <label
                key={mod.id}
                className={`flex items-center gap-3 text-sm rounded-xl p-3 cursor-pointer transition-all ${
                  localTenant.modules?.[mod.id]
                    ? 'bg-(--brand-500)/10 text-(--brand-400) border border-(--brand-500)/30'
                    : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-tertiary) border border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!localTenant.modules?.[mod.id]}
                  onChange={(e) => handleModulesChange({ 
                    ...localTenant.modules, [mod.id]: e.target.checked 
                  })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                  localTenant.modules?.[mod.id]
                    ? 'bg-(--brand-500) border-(--brand-500)'
                    : 'border-(--border-color)'
                }`}>
                  {localTenant.modules?.[mod.id] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="capitalize font-medium">{mod.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 flex items-center justify-center gap-2 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl transition-all duration-200 shadow-lg shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30 font-medium disabled:opacity-50"
        >
          {loading ? 'Guardando...' : <><Check className="w-4 h-4" /> Guardar Cambios</>}
        </button>

        <div className="pt-6 border-t border-(--border-color)">
          <h4 className="text-sm font-semibold text-(--text-primary) mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-(--text-muted)" />
            Crear Usuario Owner
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-(--text-muted) mb-1.5 font-medium">Email</label>
              <input
                type="email"
                placeholder="Ej: juan@empresa.com"
                className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-(--text-muted) mb-1.5 font-medium">Contraseña</label>
                <input
                  type="password"
                  placeholder="Mín 6 caracteres"
                  className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-(--text-muted) mb-1.5 font-medium">Confirmar</label>
                <input
                  type="password"
                  placeholder="Repite"
                  className="w-full bg-(--bg-tertiary)/50 border border-(--border-color) rounded-xl px-4 py-3 text-(--text-primary) text-sm focus:border-(--brand-500) focus:outline-none focus:ring-2 focus:ring-(--brand-500)/20 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={ownerLoading || !!tenant.config?.ownerId}
              onClick={handleCreateOwner}
              className="w-full py-3 bg-(--brand-600) hover:bg-(--brand-500) disabled:bg-(--bg-tertiary) text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:text-(--text-muted)"
            >
              {ownerLoading ? 'Creando...' : tenant.config?.ownerId ? '✓ Owner ya creado' : <><KeyRound className="w-4 h-4" /> Crear Owner</>}
            </button>
          </div>
          <p className="text-xs text-(--text-muted) mt-3">
            {tenant.config?.ownerId 
              ? '✓ Ya existe un usuario owner para este negocio' 
              : 'El usuario owner podrá iniciar sesión con las credenciales que proporciones.'}
          </p>
        </div>
      </form>
    </div>
  )
}
