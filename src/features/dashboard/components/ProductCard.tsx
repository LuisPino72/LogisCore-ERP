interface ProductCardProps {
  name: string
  categoryName: string
  stock?: number
  total?: number
  quantity?: number
  localId: string
  onClick?: () => void
}

interface TopProductCardProps extends ProductCardProps {
  index: number
}

export function TopProductCard({ name, categoryName, total, quantity, index }: TopProductCardProps) {
  const medalEmoji = ['🥇', '🥈', '🥉']
  const medalClass = [
    'bg-amber-500/20 text-amber-400',
    'bg-slate-400/20 text-slate-300',
    'bg-orange-700/20 text-orange-400',
  ]
  const fallbackClass = 'bg-slate-700/50 text-slate-500'

  return (
    <div
      className="group flex items-center gap-3 p-3 bg-(--bg-tertiary)/50 hover:bg-(--bg-tertiary) rounded-lg transition-colors"
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
          index < 3 ? medalClass[index] : fallbackClass
        }`}
      >
        {index < 3 ? medalEmoji[index] : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-slate-500">{categoryName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-green-400 font-semibold text-sm">${(total ?? 0).toFixed(2)}</p>
        <p className="text-[10px] text-slate-500">{quantity ?? 0} uni.</p>
      </div>
    </div>
  )
}

interface StockProductCardProps extends ProductCardProps {
  onClick?: () => void
}

export function StockProductCard({ name, categoryName, stock = 0, localId: _localId }: StockProductCardProps) {
  const isOutOfStock = stock === 0

  return (
    <div className="flex items-center gap-3 p-3 bg-(--bg-tertiary)/50 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
      <div className={`w-1 h-10 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-amber-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-slate-500">{categoryName}</p>
      </div>
      <div
        className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold ${
          isOutOfStock
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}
      >
        {stock} uni.
      </div>
    </div>
  )
}

interface LowStockModalCardProps extends ProductCardProps {
  localId: string
}

export function LowStockModalCard({ name, categoryName, stock = 0, localId: _localId }: LowStockModalCardProps) {
  const isOutOfStock = stock === 0

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{name}</p>
        <p className="text-xs text-slate-500">{categoryName}</p>
      </div>
      <div
        className={`text-right px-3 py-1 rounded-full text-sm font-bold ${
          isOutOfStock ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
        }`}
      >
        {stock} uni.
      </div>
    </div>
  )
}
