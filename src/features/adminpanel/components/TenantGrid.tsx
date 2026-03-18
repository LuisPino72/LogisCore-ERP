import type { Tenant } from '../types/admin.types'
import { TenantCard } from './TenantCard'

interface TenantGridProps {
  tenants: Tenant[]
  onImpersonate: (tenant: Tenant) => void
  onEdit: (tenant: Tenant) => void
}

export function TenantGrid({ tenants, onImpersonate, onEdit }: TenantGridProps) {
  if (tenants.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {tenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          onImpersonate={onImpersonate}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
