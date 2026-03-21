import { useState } from 'react'
import { DollarSign, RefreshCw, Calendar } from 'lucide-react'
import { formatBs } from '../../exchange-rate/services/exchangeRate.service'
import type { DashboardDateRange } from '../types/dashboard.types'

const quickRanges = [
  { label: 'Hoy', days: 0 },
  { label: 'Esta semana', days: 7 },
  { label: 'Este mes', days: 30 },
  { label: 'Últimos 3 meses', days: 90 },
]

interface ExchangeRate {
  rate: number
  source: string
}

interface DashboardHeaderProps {
  tenantName?: string
  exchangeRate: ExchangeRate | null
  isUpdatingRate: boolean
  dateRange: DashboardDateRange
  onSetDateRange: (range: DashboardDateRange) => void
  onOpenRateModal: () => void
}

export function DashboardHeader({
  tenantName,
  exchangeRate,
  isUpdatingRate,
  dateRange,
  onSetDateRange,
  onOpenRateModal,
}: DashboardHeaderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)

  const getCurrentGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const formatDate = () =>
    new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

  const handleQuickRange = (days: number) => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    onSetDateRange({ start, end })
    setShowDatePicker(false)
  }

  const handleDateInputChange = (field: 'start' | 'end', value: string) => {
    const newDate = new Date(value)
    newDate.setHours(23, 59, 59, 999)
    onSetDateRange({ ...dateRange, [field]: newDate })
  }

  return (
    <>
      <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-(--text-primary) mb-1">
              {getCurrentGreeting()} 👋
            </h2>
            <p className="text-(--text-secondary)">
              Bienvenido a <span className="text-(--brand-400) font-medium">{tenantName}</span>
            </p>
            <p className="text-s mt-1 capitalize">{formatDate()}</p>
          </div>
          {exchangeRate && (
            <button
              onClick={onOpenRateModal}
              title="Cambiar tasa de dólar manualmente"
              className="group flex items-center gap-4 px-5 py-3 bg-linear-to-r from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/30 hover:border-blue-500/50 rounded-xl transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-black uppercase tracking-wider">Tasa BCV</p>
                  <p className="text-xl font-bold text-black">{formatBs(exchangeRate.rate)}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 pl-3 border-l border-blue-500/20">
                <RefreshCw
                  className={`w-4 h-4 text-blue-400/50 ${isUpdatingRate ? 'animate-spin' : ''}`}
                />
                <span className="text-[10px] text-blue-400/50 capitalize">{exchangeRate.source}</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            title="Filtrar por rango de fechas"
            className="flex items-center gap-2 px-4 py-2 bg-(--bg-secondary) border border-(--border-color) rounded-lg text-(--text-primary) hover:border-(--brand-500)/50 transition-colors"
          >
            <Calendar className="w-4 h-4 text-(--text-secondary)" />
            <span className="text-sm">
              {formatDateInput(dateRange.start)} - {formatDateInput(dateRange.end)}
            </span>
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-xl z-20 min-w-72">
              <div className="flex gap-2 mb-4">
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    title={`Ver datos de ${range.label.toLowerCase()}`}
                    onClick={() => handleQuickRange(range.days)}
                    className="px-3 py-1.5 text-xs bg-(--bg-tertiary) hover:bg-(--brand-500)/20 hover:text-(--brand-400) rounded-lg transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-(--text-secondary) mb-1">Desde</label>
                  <input
                    type="date"
                    value={formatDateInput(dateRange.start)}
                    onChange={(e) => handleDateInputChange('start', e.target.value)}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-(--text-secondary) mb-1">Hasta</label>
                  <input
                    type="date"
                    value={formatDateInput(dateRange.end)}
                    onChange={(e) => handleDateInputChange('end', e.target.value)}
                    className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
