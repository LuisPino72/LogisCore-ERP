import { Package, Star } from "lucide-react";
import type { Product } from "@/lib/db";
import { formatBs } from "@/features/exchange-rate/services/exchangeRate.service";

interface ProductGridProps {
  products: Product[];
  exchangeRate: number;
  onProductClick: (product: Product) => void;
  onToggleFavorite: (e: React.MouseEvent, product: Product) => void;
  getStockStatus: (stock: number) => string;
}

export default function ProductGrid({
  products,
  exchangeRate,
  onProductClick,
  onToggleFavorite,
  getStockStatus,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex-1 text-center text-slate-500 py-12">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay productos disponibles</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pr-2">
      {products.map((product) => (
        <div
          key={product.localId}
          onClick={() => onProductClick(product)}
          className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden text-left hover:border-(--brand-500) hover:bg-(--bg-tertiary)/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed aspect-square flex flex-col cursor-pointer"
        >
          <div className="relative h-[60%] bg-(--bg-tertiary) flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-10 h-10 text-(--text-muted)" />
            )}
            <button
              onClick={(e) => onToggleFavorite(e, product)}
              title={product.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm transition-colors ${
                product.isFavorite ? "text-amber-400" : "text-slate-400 hover:text-amber-200"
              }`}
            >
              <Star className={`w-4 h-4 ${product.isFavorite ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="flex-1 p-3 flex flex-col justify-between">
            <h3 className="font-semibold text-(--text-primary) truncate text-sm leading-tight">{product.name}</h3>
            <div className="flex items-end justify-between mt-2">
              <div>
                <span className="text-green-400 font-bold text-base">${product.price.toFixed(2)}</span>
                {exchangeRate > 0 && (
                  <span className="block text-xs text-blue-400">{formatBs(product.price * exchangeRate)}</span>
                )}
              </div>
              <span className={`text-xs ${getStockStatus(product.stock)}`}>Stock: {product.stock}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
