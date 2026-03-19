import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Product, Category, db, SuspendedSale } from "@/lib/db";
import { useTenantStore, checkModuleDependencies } from "@/store/useTenantStore";
import { createSale } from "@/features/sales/services/sales.service";
import { updateStock } from "@/features/inventory/services/products.service";
import { getExchangeRate, formatBs } from "@/features/exchange-rate/services/exchangeRate.service";
import { getDailyStats } from "@/features/sales/services/sales.service";
import { isOk, Result, AppError } from "@/lib/types/result";
import { useToast } from "@/providers/ToastProvider";
import { loadPOSData, filterProducts, addToCart as addToCartUtil, updateCartQuantity, removeFromCart as removeFromCartUtil, calculateCartTotals, prepareSaleItems, CartItem, saveSuspendedSale, getSuspendedSales, deleteSuspendedSale, findProductBySku } from "../services/pos.service";
import { useInvoicingForPOS, CustomerSelector } from "@/features/invoicing";
import { logger, logCategories } from "@/lib/logger";
import Card from "@/common/Card";
import Button from "@/common/Button";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Package, Search, Star, Smartphone, ArrowUpDown, ArrowUp, ArrowDown, Pause, Play, X, Clock, TrendingUp, FileText, Loader2, AlertTriangle } from "lucide-react";
import type { SortField, PaymentMethod } from "../types/pos.types";

const InvoicePreview = lazy(() => 
  import("@/features/invoicing/components/InvoicePreview").then(m => ({ default: m.InvoicePreview }))
);

const InvoicePreviewFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="flex items-center gap-3 bg-(--bg-secondary) px-6 py-4 rounded-xl shadow-2xl">
      <Loader2 className="w-6 h-6 text-(--brand-500) animate-spin" />
      <span className="text-(--text-primary)">Cargando factura...</span>
    </div>
  </div>
);

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [sort, setSort] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [dailyStats, setDailyStats] = useState<{ totalSales: number; totalAmount: number; transactionCount: number; averageTicket: number; paymentMethodBreakdown: { cash: number; card: number; pago_movil: number } } | null>(null);
  const [suspendNote, setSuspendNote] = useState("");
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();

  const {
    isEnabled: invoicingEnabled,
    showCustomerSelector,
    showInvoicePreview,
    invoice: currentInvoice,
    taxpayerInfo,
    prepareAndOpen,
    closeCustomerSelector,
    onCustomerSelected,
    closeInvoicePreview,
  } = useInvoicingForPOS();

  const [lastSaleId, setLastSaleId] = useState<string>('');
  const [lastSaleCart, setLastSaleCart] = useState<CartItem[]>([]);

  const { missingDependencies } = checkModuleDependencies('pos', tenant);

  useEffect(() => {
    getExchangeRate().then((result) => {
      if (isOk(result) && result.value) setExchangeRate(result.value.rate);
    });
  }, []);

  useEffect(() => {
    if (!tenant?.slug) return;
    
    const { enabled } = checkModuleDependencies('pos', tenant);
    if (!enabled) return;
    
    loadPOSData(tenant.slug).then(data => {
      setProducts(data.products);
      setCategories(data.categories);
    });
    loadDailyStats();
    loadSuspended();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]); // loadSuspended and loadDailyStats are stable functions

  const loadDailyStats = async () => {
    try {
      const stats = await getDailyStats();
      setDailyStats(stats);
    } catch { /* ignore */ }
  };

  const loadSuspended = async () => {
    if (!tenant?.slug) return;
    const sales = await getSuspendedSales(tenant.slug);
    setSuspendedSales(sales);
  };

  const filteredProducts = useMemo(() => 
    filterProducts(products, search, selectedCategory, sort, showFavoritesOnly), 
    [products, search, selectedCategory, sort, showFavoritesOnly]
  );
  const { total: cartTotal, count: cartCount } = useMemo(() => calculateCartTotals(cart), [cart]);

  const handleSort = useCallback((field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const toggleFavorite = useCallback(async (_e: React.MouseEvent, product: Product) => {
    const newFavorite = !product.isFavorite;
    await db.products.update(product.localId, { isFavorite: newFavorite });
    setProducts(prev => prev.map(p => p.localId === product.localId ? { ...p, isFavorite: newFavorite } : p));
  }, []);

  const addToCart = useCallback((product: Product) => setCart(prev => addToCartUtil(prev, product)), []);
  const updateQuantity = useCallback((localId: string, delta: number) => setCart(prev => updateCartQuantity(prev, localId, delta)), []);
  const removeFromCart = useCallback((localId: string) => setCart(prev => removeFromCartUtil(prev, localId)), []);

  const getSaleType = useCallback((categoryId?: number): 'unit' | 'weight' | 'sample' => {
    if (!categoryId) return 'unit';
    const category = categories.find(c => c.id === categoryId);
    return category?.saleType || 'unit';
  }, [categories]);

  const updateWeight = useCallback((localId: string, grams: number) => {
    setCart(prev => prev.map(item =>
      item.product.localId === localId
        ? { ...item, quantity: grams, unit: 'g' as const }
        : item
    ));
  }, []);

  const selectSample = useCallback((localId: string, sampleId: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.localId !== localId) return item;
      const sample = item.product.samples?.find(s => s.id === sampleId);
      return {
        ...item,
        quantity: sample?.quantity || 1,
        unit: 'unit' as const,
        selectedSampleId: sampleId,
      };
    }));
  }, []);

  const handleSkuSearch = useCallback(() => {
    const found = findProductBySku(products, search);
    if (found) {
      addToCart(found);
      setSearch("");
    }
  }, [products, search, addToCart]);

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

      const saleId = saleResult.value;
      setCart([]);
      setShowCheckout(false);
      showSuccess("Venta registrada exitosamente!");
      loadDailyStats();
      const data = await loadPOSData(tenant.slug);
      setProducts(data.products);

      if (invoicingEnabled) {
        setLastSaleId(saleId);
        setLastSaleCart([...cart]);
      }
    } catch { showError("Error al registrar la venta"); }
  }, [tenant, cart, cartTotal, paymentMethod, exchangeRate, showError, showSuccess, invoicingEnabled]);

  const handleGenerateInvoice = useCallback(() => {
    if (lastSaleId && lastSaleCart.length > 0) {
      prepareAndOpen(lastSaleCart, lastSaleId);
    }
  }, [lastSaleId, lastSaleCart, prepareAndOpen]);

  const handleInvoiceSuccess = useCallback(() => {
    setLastSaleId('');
    setLastSaleCart([]);
  }, []);

  const handleSuspend = useCallback(async () => {
    if (!tenant?.slug || cart.length === 0) return;
    await saveSuspendedSale(tenant.slug, cart, suspendNote || undefined);
    setCart([]);
    setSuspendNote("");
    setShowSuspendModal(false);
    showSuccess("Venta suspendida");
    loadSuspended();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, cart, suspendNote, showSuccess]); // loadSuspended is stable

  const handleResumeSale = useCallback(async (sale: SuspendedSale) => {
    const cartItems: CartItem[] = sale.cart.map(item => ({
      product: item.productSnapshot,
      quantity: item.quantity,
    }));
    setCart(cartItems);
    setShowSuspendedModal(false);
    showSuccess("Venta restaurada");
  }, [showSuccess]);

  const handleDeleteSuspended = useCallback(async (localId: string) => {
    if (confirm("¿Eliminar esta venta suspendida?")) {
      await deleteSuspendedSale(localId);
      loadSuspended();
      showSuccess("Venta eliminada");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuccess]); // loadSuspended is stable

  const getStockStatus = (stock: number) => stock === 0 || stock <= 5 ? "text-red-400" : stock <= 10 ? "text-amber-400" : "text-slate-500";

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-30" />;
    return sort.direction === "asc" ? <ArrowUp className="w-3 h-3 ml-1 inline text-(--brand-400)" /> : <ArrowDown className="w-3 h-3 ml-1 inline text-(--brand-400)" />;
  };

  return (
    <div className="space-y-4">
      {missingDependencies.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Módulo requerído desactivado</p>
            <p className="text-amber-300/70 text-sm mt-1">
              Para usar el Punto de Venta, necesitas activar el módulo: <span className="font-semibold">{missingDependencies.join(', ')}</span>
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2" title="Punto de venta - Realizar cobros">
            <ShoppingCart className="w-6 h-6" />
            Punto de Venta
          </h2>
        </div>
        <Card className="bg-linear-to-br from-green-900/30 to-green-800/20 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-x uppercase tracking-wide">Hoy</p>
              <p className="text-xl font-bold">${dailyStats?.totalAmount.toFixed(2) || "0.00"}</p>
              <p className="text-xs">{dailyStats?.transactionCount || 0} ventas</p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar producto o escanear SKU..." 
                title="Buscar productos por nombre o escanear código SKU"
                value={search} 
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSkuSearch()}
                className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)" 
              />
            </div>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              title="Filtrar productos por categoría"
              className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer min-w-[180px]">
              <option value="">Todas las categorías</option>
              {categories.map(cat => <option key={cat.localId} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => handleSort('name')}
              title="Ordenar por nombre"
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${sort.field === 'name' ? 'bg-(--brand-600) text-white' : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)'}`}>
              Nombre <SortIcon field="name" />
            </button>
            <button
              onClick={() => handleSort('price')}
              title="Ordenar por precio"
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${sort.field === 'price' ? 'bg-(--brand-600) text-white' : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)'}`}>
              Precio <SortIcon field="price" />
            </button>
            <button
              onClick={() => handleSort('stock')}
              title="Ordenar por stock"
              className={`flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${sort.field === 'stock' ? 'bg-(--brand-600) text-white' : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)'}`}>
              Stock <SortIcon field="stock" />
            </button>
            <div className="w-px h-6 bg-(--border-color) mx-1" />
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              title={showFavoritesOnly ? "Mostrar todos los productos" : "Mostrar solo favoritos"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${showFavoritesOnly ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary)'}`}>
              <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favoritos
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { loadSuspended(); setShowSuspendedModal(true); }}
              title="Ver ventas suspendidas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--bg-secondary) transition-colors">
              <Pause className="w-3.5 h-3.5" />
              Suspendidas ({suspendedSales.length})
            </button>
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
                    <button onClick={e => toggleFavorite(e, product)} title={product.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"} className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm transition-colors ${product.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-amber-200'}`}>
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
              {cart.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSuspendModal(true)}
                    title="Suspender venta para continuar después"
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
                    <Pause className="w-3 h-3" />Suspender
                  </button>
                  <button onClick={() => setCart([])} title="Limpiar carrito" className="text-xs text-red-400 hover:text-red-300 transition-colors">Limpiar</button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {cart.length === 0 ? (
                <div className="text-center text-slate-500 py-8"><ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>El carrito está vacío</p></div>
              ) : (
              cart.map(item => {
                const saleType = getSaleType(item.product.categoryId);
                const isWeight = saleType === 'weight';
                const isSample = saleType === 'sample';
                
                return (
                  <div key={item.product.localId} className="flex items-center gap-3 bg-(--bg-tertiary)/50 p-3 rounded-lg hover:bg-(--bg-tertiary) transition-colors">
                    <div className="w-10 h-10 bg-(--bg-primary) rounded-lg flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-(--text-muted)" /></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate text-sm">{item.product.name}</h4>
                      {isWeight ? (
                        <p className="text-green-400 text-xs">
                          ${(item.product.pricePerKg || item.product.price).toFixed(2)}/kg
                          {exchangeRate > 0 && <span className="text-blue-400"> {formatBs((item.product.pricePerKg || item.product.price) * exchangeRate)}</span>}
                        </p>
                      ) : isSample && item.product.samples ? (
                        <p className="text-green-400 text-xs">
                          {item.product.samples.map(s => `${s.name}: $${s.price}`).join(' | ')}
                        </p>
                      ) : (
                        <p className="text-green-400 text-xs">${item.product.price.toFixed(2)} c/u {exchangeRate > 0 && <span className="text-blue-400">{formatBs(item.product.price * exchangeRate)}</span>}</p>
                      )}
                    </div>
                    {isWeight ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateWeight(item.product.localId, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) text-sm text-center"
                          min="1"
                          placeholder="g"
                        />
                        <span className="text-xs text-slate-400">g</span>
                      </div>
                    ) : isSample && item.product.samples ? (
                      <select
                        value={item.selectedSampleId || ''}
                        onChange={(e) => selectSample(item.product.localId, e.target.value)}
                        className="px-2 py-1 bg-(--bg-primary) border border-(--border-color) rounded-lg text-(--text-primary) text-xs"
                      >
                        <option value="">Seleccionar</option>
                        {item.product.samples.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQuantity(item.product.localId, -1)} title="Reducir cantidad" className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors"><Minus className="w-3.5 h-3.5 text-(--text-secondary)" /></button>
                        <span className="w-6 text-center text-(--text-primary) font-medium text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.localId, 1)} title="Aumentar cantidad" className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors"><Plus className="w-3.5 h-3.5 text-(--text-secondary)" /></button>
                      </div>
                    )}
                    <button onClick={() => removeFromCart(item.product.localId)} title="Eliminar del carrito" className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                );
              })
              )}
            </div>

            <div className="border-t border-(--border-color) pt-4 space-y-3">
              <div className="flex justify-between text-(--text-secondary)"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xl font-bold text-(--text-primary)"><span>Total</span><span className="text-green-400">${cartTotal.toFixed(2)}</span></div>
              {exchangeRate > 0 && <div className="text-center text-blue-400 text-sm">Total: {formatBs(cartTotal * exchangeRate)}</div>}

              {showCheckout ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setPaymentMethod("cash")} title="Pagar en efectivo" className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${paymentMethod === "cash" ? "bg-green-500/20 border-green-500 text-green-400" : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"}`}>
                      <Banknote className="w-5 h-5" />Efectivo
                    </button>
                    <button onClick={() => setPaymentMethod("card")} title="Pagar con tarjeta" className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${paymentMethod === "card" ? "bg-(--brand-500)/20 border-(--brand-500) text-(--brand-400)" : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"}`}>
                      <CreditCard className="w-5 h-5" />Tarjeta
                    </button>
                    <button onClick={() => setPaymentMethod("pago_movil")} title="Pagar por pago móvil" className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${paymentMethod === "pago_movil" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"}`}>
                      <Smartphone className="w-5 h-5" />Pago Móvil
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCheckout(false)} title="Cancelar cobro" className="flex-1 py-3 border border-(--border-color) text-(--text-secondary) rounded-lg hover:bg-(--bg-tertiary) transition-colors"> Cancelar</button>
                    <button onClick={handleCheckout} title="Confirmar y registrar venta" className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg transition-colors">Confirmar</button>
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

      {showSuspendedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <Pause className="w-5 h-5" />Ventas Suspendidas
              </h3>
              <button onClick={() => setShowSuspendedModal(false)} title="Cerrar" className="p-1 hover:bg-(--bg-tertiary) rounded">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {suspendedSales.length === 0 ? (
                <div className="text-center text-(--text-muted) py-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay ventas suspendidas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspendedSales.map(sale => (
                    <div key={sale.localId} className="flex items-center justify-between bg-(--bg-tertiary) p-4 rounded-lg border border-(--border-color)">
                      <div className="flex-1">
                        <p className="text-(--text-primary) font-medium">{sale.cart.length} productos</p>
                        <p className="text-xs text-(--text-muted)">{sale.createdAt.toLocaleString()}</p>
                        {sale.note && <p className="text-xs text-(--text-secondary) mt-1">Nota: {sale.note}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleResumeSale(sale)} title="Restaurar esta venta al carrito">
                          <Play className="w-3 h-3 mr-1" />Restaurar
                        </Button>
                        <button onClick={() => handleDeleteSuspended(sale.localId)} title="Eliminar venta suspendida" className="p-2 hover:bg-red-500/20 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
                <Pause className="w-5 h-5" />Suspender Venta
              </h3>
              <button onClick={() => setShowSuspendModal(false)} className="p-1 hover:bg-(--bg-tertiary) rounded">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1.5">
                  Nota (opcional)
                </label>
                <textarea
                  value={suspendNote}
                  onChange={(e) => setSuspendNote(e.target.value)}
                  placeholder="Ej: Cliente vuelve en 30 minutos..."
                  title="Agregar una nota para identificar esta venta"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowSuspendModal(false)}>Cancelar</Button>
                <Button onClick={handleSuspend}>Suspender</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoicingEnabled && lastSaleId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <FileText className="w-12 h-12 mx-auto text-blue-400" />
              <h3 className="text-lg font-semibold text-(--text-primary)">¿Desea generar una factura?</h3>
              <p className="text-sm text-(--text-secondary)">
                La venta se completó exitosamente. ¿Desea generar la factura fiscal?
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleInvoiceSuccess} className="flex-1">
                  No, gracias
                </Button>
                <Button onClick={handleGenerateInvoice} className="flex-1">
                  Generar Factura
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerSelector && (
        <CustomerSelector
          isOpen={showCustomerSelector}
          onClose={closeCustomerSelector}
          onSelect={onCustomerSelected}
        />
      )}

      {showInvoicePreview && currentInvoice && taxpayerInfo && (
        <Suspense fallback={<InvoicePreviewFallback />}>
          <InvoicePreview
            isOpen={showInvoicePreview}
            invoice={currentInvoice}
            taxpayerInfo={taxpayerInfo}
            onClose={() => {
              closeInvoicePreview();
              handleInvoiceSuccess();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
