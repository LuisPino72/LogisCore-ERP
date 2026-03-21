

interface DailySale {
  day: string
  current: number
  previous: number
}

interface SalesChartProps {
  dailySales: DailySale[]
  maxDailySale: number
}

export function SalesChart({ dailySales, maxDailySale }: SalesChartProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-semibold text-white"
          title="Comparación de ventas entre período actual y anterior"
        >
          Ventas del Período
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-slate-400">Período actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-600" />
            <span className="text-slate-400">Período anterior</span>
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 h-64">
        {dailySales.map((day, index) => {
          const currentHeight = maxDailySale > 0 ? (day.current / maxDailySale) * 100 : 0
          const previousHeight = maxDailySale > 0 ? (day.previous / maxDailySale) * 100 : 0
          const isPositive = day.current >= day.previous

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-48 relative">
                {previousHeight > 0 && (
                  <div
                    className="absolute bottom-0 w-4 bg-slate-700/60 rounded-t-sm"
                    style={{ height: `${previousHeight}%` }}
                  />
                )}
                <div
                  className="w-4 bg-green-500/60 rounded-t hover:bg-green-400 transition-colors relative group z-10"
                  style={{ height: `${currentHeight}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                    <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                      ${day.current.toFixed(2)}
                    </span>
                    <span className="text-slate-400 block text-center text-[10px]">
                      vs ${day.previous.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent ${
                      isPositive ? 'border-b-green-400' : 'border-b-red-400'
                    }`}
                  />
                </div>
              </div>
              <span className="text-xs text-slate-500">{day.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
