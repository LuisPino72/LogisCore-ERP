import type { Tenant } from '../types/admin.types'

interface TenantCardProps {
  tenant: Tenant
  onImpersonate: (tenant: Tenant) => void
  onEdit: (tenant: Tenant) => void
}

export function TenantCard({ tenant, onImpersonate, onEdit }: TenantCardProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all duration-300 group">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-(--bg-tertiary) rounded-xl flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-(--border-subtle) group-hover:ring-(--brand-500)/30 transition-all">
          {tenant.config?.logoUrl ? (
            <img 
              src={tenant.config.logoUrl} 
              alt={tenant.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-7 h-7 text-(--text-muted)">🏢</div>
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
          <ModuleBadges modules={tenant.modules} />
        </div>
        <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
          <span>👥</span>
          <span>{tenant.config?.maxEmployees || 3} usuarios permitidos</span>
        </div>
      </div>
      
      <div className="flex gap-2 pt-4 border-t border-(--border-color)">
        <button
          onClick={() => onImpersonate(tenant)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-linear-to-r from-(--brand-600) to-(--brand-500) hover:from-(--brand-500) hover:to-(--brand-400) text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md shadow-(--brand-900)/20 hover:shadow-(--brand-500)/30"
        >
          <span>🚪</span>
          Entrar
        </button>
        <button
          onClick={() => onEdit(tenant)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) rounded-xl text-sm font-medium transition-all duration-200 border border-(--border-color) hover:border-(--brand-500)/30"
        >
          <span>✏️</span>
          Editar
        </button>
      </div>
    </div>
  )
}

interface ModuleBadgesProps {
  modules: Tenant['modules']
}

function ModuleBadges({ modules }: ModuleBadgesProps) {
  const activeModuleIds = Object.keys(modules || {}).filter(m => modules[m])
  const modulesToShow = [
    { id: 'sales', label: 'Ventas' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'purchases', label: 'Compras' },
    { id: 'recipes', label: 'Recetas' },
    { id: 'pos', label: 'Punto de Venta' },
    { id: 'employees', label: 'Empleados' },
  ].filter(mod => activeModuleIds.includes(mod.id))
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {modulesToShow.map(mod => (
        <span 
          key={mod.id} 
          className="px-2 py-0.5 bg-(--brand-500)/10 text-(--brand-400) text-[10px] rounded-md uppercase tracking-wide border border-(--brand-500)/20 font-medium"
        >
          {mod.label}
        </span>
      ))}
    </div>
  )
}