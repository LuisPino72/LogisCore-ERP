import { Package, Plus, Minus, Trash2 } from "lucide-react";
import type { CartItem } from "../services/pos.service";

interface CartItemComponentProps {
  item: CartItem;
  exchangeRate: number;
  saleType: "unit" | "weight" | "sample";
  onUpdateQuantity: (localId: string, delta: number) => void;
  onUpdateWeight: (localId: string, grams: number) => void;
  onSelectSample: (localId: string, sampleId: string) => void;
  onRemove: (localId: string) => void;
  formatBs: (amount: number) => string;
}

export default function CartItemComponent({
  item,
  exchangeRate,
  saleType,
  onUpdateQuantity,
  onUpdateWeight,
  onSelectSample,
  onRemove,
  formatBs,
}: CartItemComponentProps) {
  const isWeight = saleType === "weight";
  const isSample = saleType === "sample";

  return (
    <div className="flex items-center gap-3 bg-(--bg-tertiary)/50 p-3 rounded-lg hover:bg-(--bg-tertiary) transition-colors">
      <div className="w-10 h-10 bg-(--bg-primary) rounded-lg flex items-center justify-center shrink-0">
        <Package className="w-5 h-5 text-(--text-muted)" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium truncate text-sm">{item.product.name}</h4>
        {isWeight ? (
          <p className="text-green-400 text-xs">
            ${(item.product.pricePerKg || item.product.price).toFixed(2)}/kg
            {exchangeRate > 0 && (
              <span className="text-blue-400">
                {" "}
                {formatBs((item.product.pricePerKg || item.product.price) * exchangeRate)}
              </span>
            )}
          </p>
        ) : isSample && item.product.samples ? (
          <p className="text-green-400 text-xs">
            {item.product.samples.map((s) => `${s.name}: $${s.price}`).join(" | ")}
          </p>
        ) : (
          <p className="text-green-400 text-xs">
            ${item.product.price.toFixed(2)} c/u{" "}
            {exchangeRate > 0 && <span className="text-blue-400">{formatBs(item.product.price * exchangeRate)}</span>}
          </p>
        )}
      </div>
      {isWeight ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateWeight(item.product.localId, Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-1 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm text-center"
            min="1"
            placeholder="g"
          />
          <span className="text-xs text-slate-400">g</span>
        </div>
      ) : isSample && item.product.samples ? (
        <select
          value={item.selectedSampleId || ""}
          onChange={(e) => onSelectSample(item.product.localId, e.target.value)}
          className="px-2 py-1 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) text-xs"
        >
          <option value="">Seleccionar</option>
          {item.product.samples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUpdateQuantity(item.product.localId, -1)}
            title="Reducir cantidad"
            className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-(--text-secondary)" />
          </button>
          <span className="w-6 text-center text-(--text-primary) font-medium text-sm">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.product.localId, 1)}
            title="Aumentar cantidad"
            className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-(--text-secondary)" />
          </button>
        </div>
      )}
      <button
        onClick={() => onRemove(item.product.localId)}
        title="Eliminar del carrito"
        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
    </div>
  );
}
