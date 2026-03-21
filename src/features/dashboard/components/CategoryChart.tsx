import { PieChart } from 'lucide-react'

interface CategorySale {
  category: string
  total: number
  color: string
}

interface CategoryChartProps {
  categorySales: CategorySale[]
  maxCategorySale: number
}

export function CategoryChart({ categorySales, maxCategorySale }: CategoryChartProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-6">
      <h3
        className="text-lg font-semibold text-white mb-6"
        title="Porcentaje de ventas por cada categoría de producto"
      >
        Ventas por Categoría
      </h3>
      {categorySales.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay datos de ventas por categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categorySales.map((cat, index) => {
            const percentage = maxCategorySale > 0 ? (cat.total / maxCategorySale) * 100 : 0

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{cat.category}</span>
                  <span className="text-green-400 font-medium">${cat.total.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
