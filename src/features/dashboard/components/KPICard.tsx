import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface TrendIndicatorProps {
  value: number
  size?: 'sm' | 'lg'
}

export function TrendIndicator({ value, size = 'sm' }: TrendIndicatorProps) {
  if (value === 0) return null

  return (
    <div
      className={`flex items-center gap-1 ${size === 'lg' ? 'text-sm' : 'text-xs'} font-medium ${
        value > 0 ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {value > 0 ? (
        <ArrowUpRight className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      ) : (
        <ArrowDownRight className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      )}
      {Math.abs(value).toFixed(1)}%
    </div>
  )
}

interface MiniSparklineProps {
  current: number
  previous: number
  color: string
}

export function MiniSparkline({ current, previous, color }: MiniSparklineProps) {
  const maxVal = Math.max(current, previous, 1)
  const currentHeight = (current / maxVal) * 24
  const previousHeight = (previous / maxVal) * 24

  return (
    <div className="flex items-end gap-0.5 h-6 w-12">
      <div className="w-1 bg-slate-700 rounded-t" style={{ height: '100%' }} />
      <div
        className="w-1 bg-slate-600 rounded-t"
        style={{ height: `${previousHeight}px`, marginTop: `${24 - previousHeight}px` }}
      />
      <div
        className="w-1 rounded-t"
        style={{
          height: `${currentHeight}px`,
          marginTop: `${24 - currentHeight}px`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}

interface KPICardProps {
  label: string
  value: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'amber' | 'red'
  trend: number | null
  comparison?: { value: number; label: string }
  sparkCurrent?: number
  sparkPrevious?: number
  onClick?: () => void
  tooltip?: string
}

const colorClasses: Record<string, { icon: string; text: string }> = {
  blue: { icon: 'bg-blue-500/20', text: 'text-blue-400' },
  green: { icon: 'bg-green-500/20', text: 'text-green-400' },
  amber: { icon: 'bg-amber-500/20', text: 'text-amber-400' },
  red: { icon: 'bg-red-500/20', text: 'text-red-400' },
}

export function KPICard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  comparison,
  sparkCurrent,
  sparkPrevious,
  onClick,
  tooltip,
}: KPICardProps) {
  const sparkColor = colorClasses[color].text.replace('text-', '')

  return (
    <div
      title={tooltip}
      className={`bg-(--bg-secondary) border border-(--border-color) rounded-xl p-5 shadow-lg hover:shadow-xl hover:border-(--brand-500)/30 transition-all ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color].icon}`}>
          <Icon className={`w-5 h-5 ${colorClasses[color].text}`} />
        </div>
        {sparkCurrent !== undefined && sparkPrevious !== undefined && (
          <MiniSparkline current={sparkCurrent} previous={sparkPrevious} color={sparkColor} />
        )}
      </div>
      <p className="text-(--text-secondary) text-sm mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-(--text-primary)">{value}</p>
        {trend !== null && <TrendIndicator value={trend} />}
      </div>
      {comparison && (
        <p className="text-xs text-slate-500 mt-1">
          Ayer: ${comparison.value.toFixed(2)}
        </p>
      )}
    </div>
  )
}
