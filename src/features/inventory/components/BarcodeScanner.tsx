import { Barcode, RotateCcw } from 'lucide-react'

interface BarcodeScannerProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
}

export default function BarcodeScanner({ value, onChange, resultCount }: BarcodeScannerProps) {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4">
      <div className="flex items-center gap-4">
        <Barcode className="w-6 h-6 text-blue-400" />
        <input
          type="text"
          placeholder="Escanee o ingrese el código de barras/SKU..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button onClick={() => onChange('')} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      {value && resultCount > 1 && (
        <p className="text-sm text-amber-400 mt-2">Se encontraron {resultCount} productos. Refine la búsqueda.</p>
      )}
    </div>
  )
}
