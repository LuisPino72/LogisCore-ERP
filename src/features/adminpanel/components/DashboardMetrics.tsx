import type { SystemMetrics, ActivityLog } from '../types/admin.types'

interface DashboardMetricsProps {
  metrics: SystemMetrics
  loading?: boolean
}

export function DashboardMetrics({ metrics, loading }: DashboardMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="h-4 bg-(--bg-tertiary) rounded mb-3"></div>
            <div className="h-8 bg-(--bg-tertiary) rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Negocios"
          value={metrics.totalTenants}
          icon="🏢"
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          title="Negocios Activos"
          value={metrics.activeTenants}
          icon="✅"
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatCard
          title="Usuarios Totales"
          value={metrics.totalUsers}
          icon="👥"
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <StatCard
          title="Actividad Reciente"
          value={metrics.recentActivity.length}
          icon="📊"
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
      </div>
      
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-(--text-primary) mb-4 flex items-center gap-2">
          📈 Actividad Reciente
        </h3>
        <div className="space-y-3">
          {metrics.recentActivity.slice(0, 5).map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
          {metrics.recentActivity.length === 0 && (
            <p className="text-(--text-muted) text-center py-4">No hay actividad reciente</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: string
  color: string
  bgColor: string
}

function StatCard({ title, value, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-4`}>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-(--text-muted) text-sm font-medium mb-2">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

interface ActivityItemProps {
  activity: ActivityLog
}

function ActivityItem({ activity }: ActivityItemProps) {
  const actionIcons = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    login: '🔐',
    logout: '🚪'
  } as const

  const actionColors = {
    create: 'text-green-500',
    update: 'text-blue-500',
    delete: 'text-red-500',
    login: 'text-purple-500',
    logout: 'text-gray-500'
  } as const

  return (
    <div className="flex items-center gap-3 p-3 bg-(--bg-primary)/50 rounded-xl">
      <span className={`text-lg ${actionColors[activity.action]}`}>
        {actionIcons[activity.action]}
      </span>
      <div className="flex-1">
        <p className="text-sm text-(--text-primary) font-medium">
          {activity.description}
        </p>
        <p className="text-xs text-(--text-muted)">
          {activity.tenant_name} • {new Date(activity.created_at).toLocaleDateString('es-ES')}
        </p>
      </div>
    </div>
  )
}