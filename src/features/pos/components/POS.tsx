import { useState, useEffect, useMemo, useCallback } from "react";
import { Product, Category, db } from "@/lib/db";
import { useTenantStore } from "@/store/useTenantStore";
import { createSale } from "@/features/sales/services/sales.service";
import { updateStock } from "@/features/inventory/services/products.service";
import { getExchangeRate, formatBs } from "@/features/exchange-rate/services/exchangeRate.service";
import { isOk, Result, AppError } from "@/lib/types/result";
import { useToast } from "@/providers/ToastProvider";
import { loadPOSData, filterProducts, addToCart as addToCartUtil, updateCartQuantity, removeFromCart as removeFromCartUtil, calculateCartTotals, prepareSaleItems, CartItem } from "../services/pos.service";
import { logger, logCategories } from "@/lib/logger";
import Card from "@/common/Card";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Package, Search, Star, Smartphone } from "lucide-react";

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "pago_movil">("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    getExchangeRate().then((result) => {
      if (isOk(result) && result.value) setExchangeRate(result.value.rate);
    });
  }, []);

  useEffect(() => {
    if (!tenant?.slug) return;
    loadPOSData(tenant.slug).then(data => {
      setProducts(data.products);
      setCategories(data.categories);
    });
  }, [tenant?.slug]);

  const filteredProducts = useMemo(() => filterProducts(products, search, selectedCategory), [products, search, selectedCategory]);
  const { total: cartTotal, count: cartCount } = useMemo(() => calculateCartTotals(cart), [cart]);

  const toggleFavorite = useCallback(async (_e: React.MouseEvent, product: Product) => {
    const newFavorite = !product.isFavorite;
    await db.products.update(product.localId, { isFavorite: newFavorite });
    setProducts(prev => prev.map(p => p.localId === product.localId ? { ...p, isFavorite: newFavorite } : p));
  }, []);

  const addToCart = useCallback((product: Product) => setCart(prev => addToCartUtil(prev, product)), []);
  const updateQuantity = useCallback((localId: string, delta: number) => setCart(prev => updateCartQuantity(prev, localId, delta)), []);
  const removeFromCart = useCallback((localId: string) => setCart(prev => removeFromCartUtil(prev, localId)), []);

  const handleCheckout = useCallback(async () => {
    if (!tenant) return;
    try {
      const saleItems = prepareSaleItems(cart);
      const saleResult = await createSale({ items: saleItems, subtotal: cartTotal, tax: 0, total: cartTotal, paymentMethod, exchangeRate: exchangeRate > 0 ? exchangeRate : undefined, exchangeRateSource: exchangeRate > 0 ? 'api' : undefined });
      if (!isOk(saleResult)) { showError(saleResult.error.message); return; }

      const stockUpdates = cart.map(item => updateStock(item.product.localId, -item.quantity));
      const results = await Promise.all(stockUpdates);
      const failed = results.filter((r: Result<void, AppError>) => !isOk(r));
      if (failed.length > 0) logger.warn(`${failed.length} stock updates failed`, { category: logCategories.INVENTORY });

      setCart([]);
      setShowCheckout(false);
      showSuccess("Venta registrada exitosamente!");
      const data = await loadPOSData(tenant.slug);
      setProducts(data.products);
    } catch { showError("Error al registrar la venta"); }
  }, [tenant, cart, cartTotal, paymentMethod, exchangeRate, showError, showSuccess]);

  const getStockStatus = (stock: number) => stock === 0 || stock <= 5 ? "text-red-400" : stock <= 10 ? "text-amber-400" : "text-slate-500";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-(--text-primary)">Punto de Venta</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
            <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)" />
          </div>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer min-w-[180px]">
            <option value="">Todas las categorías</option>
            {categories.map(cat => <option key={cat.localId} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pr-2">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-slate-500 py-12"><Package className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No hay productos disponibles</p></div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.localId} onClick={() => addToCart(product)}
                className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden text-left hover:border-(--brand-500) hover:bg-(--bg-tertiary)/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed aspect-square flex flex-col cursor-pointer">
                <div className="relative h-[60%] bg-(--bg-tertiary) flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <Package className="w-10 h-10 text-(--text-muted)" />}
                  <button onClick={e => toggleFavorite(e, product)} className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm transition-colors ${product.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-amber-200'}`}>
                    <Star className={`w-4 h-4 ${product.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <h3 className="font-semibold text-(--text-primary) truncate text-sm leading-tight">{product.name}</h3>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className="text-green-400 font-bold text-base">${product.price.toFixed(2)}</span>
                      {exchangeRate > 0 && <span className="block text-xs text-blue-400">{formatBs(product.price * exchangeRate)}</span>}
                    </div>
                    <span className={`text-xs ${getStockStatus(product.stock)}`}>Stock: {product.stock}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />Carrito{cartCount > 0 && <span className="bg-(--brand-500) text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>}
            </h3>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300 transition-colors">Limpiar</button>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 py-8"><ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>El carrito está vacío</p></div>
            ) : (
              cart.map(item => (
                <div key={item.product.localId} className="flex items-center gap-3 bg-(--bg-tertiary)/50 p-3 rounded-lg hover:bg-(--bg-tertiary) transition-colors">
                  <div className="w-10 h-10 bg-(--bg-primary) rounded-lg flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-(--text-muted)" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate text-sm">{item.product.name}</h4>
                    <p className="text-green-400 text-xs">${item.product.price.toFixed(2)} c/u {exchangeRate > 0 && <span className="text-blue-400">{formatBs(item.product.price * exchangeRate)}</span>}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.product.localId, -1)} className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors"><Minus className="w-3.5 h-3.5 text-(--text-secondary)" /></button>
                    <span className="w-6 text-center text-(--text-primary) font-medium text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.localId, 1)} className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors"><Plus className="w-3.5 h-3.5 text-(--text-secondary)" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.localId)} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-(--border-color) pt-4 space-y-3">
            <div className="flex justify-between text-(--text-secondary)"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-bold text-(--text-primary)"><span>Total</span><span className="text-green-400">${cartTotal.toFixed(2)}</span></div>
            {exchangeRate > 0 && <div className="text-center text-blue-400 text-sm">Total: {formatBs(cartTotal * exchangeRate)}</div>}

            {showCheckout ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMethod("cash")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${paymentMethod === "cash" ? "bg-green-500/20 border-green-500 text-green-400" : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"}`}>
                    <Banknote className="w-5 h-5" />Efectivo
                  </button>
                  <button onClick={() => setPaymentMethod("card")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${paymentMethod === "card" ? "bg-(--brand-500)/20 border-(--brand-500) text-(--brand-400)" : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"}`}>
                    <CreditCard className="w-5 h-5" />Tarjeta
                  </button>
                  <button onClick={() => setPaymentMethod("pago_movil")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${paymentMethod === "pago_movil" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"}`}>
                    <Smartphone className="w-5 h-5" />Pago Móvil
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCheckout(false)} className="flex-1 py-3 border border-(--border-color) text-(--text-secondary) rounded-lg hover:bg-(--bg-tertiary) transition-colors"> Cancelar</button>
                  <button onClick={handleCheckout} className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg transition-colors">Confirmar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full py-4 bg-(--brand-600) hover:bg-(--brand-500) disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors">
                Cobrar ${cartTotal.toFixed(2)}
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
