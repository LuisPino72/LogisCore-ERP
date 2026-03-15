import { useState, useEffect, useMemo, useCallback } from "react";
import { Product, Category, db } from "../../../lib/db";
import { useTenantStore } from "../../../store/useTenantStore";
import { createSale } from "../../sales/services/sales.service";
import { updateStock } from "../../inventory/services/products.service";
import { getExchangeRate, formatBs } from "../../exchange-rate/services/exchangeRate.service";
import { isOk } from "../../../types/result";
import { useToast } from "../../../providers/ToastProvider";
import Card from "../../../common/Card";
import Button from "../../../common/Button"; 
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
  CreditCard,
  Banknote,
  Package,
  Search,
  Star,
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const loadExchangeRate = async () => {
      const rate = await getExchangeRate();
      if (rate) {
        setExchangeRate(rate.rate);
      }
    };
    loadExchangeRate();
  }, []);

  const loadProducts = useCallback(async () => {
    if (!tenant?.slug) return;
    const [prods, cats] = await Promise.all([
      db.products.where("tenantId").equals(tenant.slug).toArray(),
      db.categories.where("tenantId").equals(tenant.slug).toArray(),
    ]);
    setProducts(prods);
    setCategories(cats);
  }, [tenant?.slug]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !selectedCategory || p.categoryId === Number(selectedCategory);
      return matchesSearch && matchesCategory && p.isActive && p.stock > 0;
    });
    
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, search, selectedCategory]);

  const toggleFavorite = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const newFavorite = !product.isFavorite;
    await db.products.update(product.localId, { isFavorite: newFavorite });
    setProducts((prev) =>
      prev.map((p) =>
        p.localId === product.localId ? { ...p, isFavorite: newFavorite } : p
      )
    );
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.localId === product.localId,
      );
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.localId === product.localId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (localId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.product.localId === localId) {
              const newQty = item.quantity + delta;
              if (newQty <= 0) return null;
              if (newQty > item.product.stock) return item;
              return { ...item, quantity: newQty };
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (localId: string) => {
    setCart((prev) => prev.filter((item) => item.product.localId !== localId));
  };

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const handleCheckout = async () => {
    if (!tenant) return;
    
    try {
      const saleItems = cart.map((item) => ({
        productId: item.product.localId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity,
      }));

      const saleResult = await createSale({
        items: saleItems,
        subtotal: cartTotal,
        tax: 0,
        total: cartTotal,
        paymentMethod,
        exchangeRate: exchangeRate > 0 ? exchangeRate : undefined,
        exchangeRateSource: exchangeRate > 0 ? 'api' : undefined,
      });

      if (!isOk(saleResult)) {
        showError(saleResult.error.message);
        return;
      }

      // Actualizar stock de cada producto usando el servicio para asegurar sincronización
      const stockUpdates = cart.map((item) => 
        updateStock(item.product.localId, -item.quantity)
      );
      
      const results = await Promise.all(stockUpdates);
      const failed = results.filter(r => !isOk(r));
      
      if (failed.length > 0) {
        console.warn(`[POS] ${failed.length} actualizaciones de stock fallaron tras la venta.`);
      }

      setCart([]);
      setShowCheckout(false);
      showSuccess("Venta registrada exitosamente!");
      await loadProducts(); // Recargar productos para ver stock actualizado
    } catch (_error) {
      showError("Error al registrar la venta");
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return "text-red-400";
    if (stock <= 5) return "text-red-400";
    if (stock <= 10) return "text-amber-400";
    return "text-slate-500";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-(--text-primary)">
            Punto de Venta
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-500) cursor-pointer min-w-[180px]">
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.localId} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pr-2">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-slate-500 py-12">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay productos disponibles</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.localId}
                onClick={() => addToCart(product)}
                className="bg-(--bg-secondary) border border-(--border-color) rounded-xl overflow-hidden text-left hover:border-(--brand-500) hover:bg-(--bg-tertiary)/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed aspect-square flex flex-col cursor-pointer">
                <div className="relative h-[60%] bg-(--bg-tertiary) flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-(--text-muted)" />
                  )}
                  <button
                    onClick={(e) => toggleFavorite(e, product)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm transition-colors ${
                      product.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-amber-200'
                    }`}>
                    <Star className={`w-4 h-4 ${product.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <h3 className="font-semibold text-(--text-primary) truncate text-sm leading-tight">
                    {product.name}
                  </h3>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className="text-green-400 font-bold text-base">
                        ${product.price.toFixed(2)}
                      </span>
                      {exchangeRate > 0 && (
                        <span className="block text-xs text-blue-400">
                          {formatBs(product.price * exchangeRate)}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs ${getStockStatus(product.stock)}`}>
                      Stock: {product.stock}
                    </span>
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
              <ShoppingCart className="w-5 h-5" />
              Carrito
              {cartCount > 0 && (
                <span className="bg-(--brand-500) text-white text-xs px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Limpiar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>El carrito está vacío</p>
                <p className="text-sm text-slate-600 mt-1">
                  Selecciona productos para comenzar
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.localId}
                  className="flex items-center gap-3 bg-(--bg-tertiary)/50 p-3 rounded-lg hover:bg-(--bg-tertiary) transition-colors">
                  <div className="w-10 h-10 bg-(--bg-primary) rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-(--text-muted)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate text-sm">
                      {item.product.name}
                    </h4>
                    <p className="text-green-400 text-xs">
                      ${item.product.price.toFixed(2)} c/u
                    </p>
                    {exchangeRate > 0 && (
                      <p className="text-blue-400 text-xs">
                        {formatBs(item.product.price * exchangeRate)} c/u
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.localId, -1)}
                      className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors">
                      <Minus className="w-3.5 h-3.5 text-(--text-secondary)" />
                    </button>
                    <span className="w-6 text-center text-(--text-primary) font-medium text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.localId, 1)}
                      className="p-1.5 hover:bg-(--bg-primary) rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5 text-(--text-secondary)" />
                    </button>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className="text-white font-medium text-sm">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.localId)}
                      className="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-(--border-color) pt-4 space-y-3">
            <div className="flex justify-between text-(--text-secondary) text-sm">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            {exchangeRate > 0 && (
              <div className="flex justify-between text-blue-400 text-sm">
                <span>En Bs.</span>
                <span>{formatBs(cartTotal * exchangeRate)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span className="text-green-400">${cartTotal.toFixed(2)}</span>
            </div>

            {cart.length > 0 && (
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full py-3">
                Proceder al Pago
              </Button>
            )}
          </div>
        </Card>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                Finalizar Venta
              </h3>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1.5 hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center mb-6">
                <p className="text-slate-400 text-sm">Total a pagar</p>
                <p className="text-4xl font-bold text-green-400">
                  ${cartTotal.toFixed(2)}
                </p>
                {exchangeRate > 0 && (
                  <p className="text-blue-400 text-lg mt-1">
                    {formatBs(cartTotal * exchangeRate)}
                  </p>
                )}
                <p className="text-slate-500 text-sm mt-1">
                  {cartCount} productos
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400 mb-2">Método de pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === "cash"
                        ? "border-green-500 bg-green-500/10 text-green-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}>
                    <Banknote className="w-5 h-5" />
                    <span className="font-medium">Efectivo</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === "card"
                        ? "border-(--brand-500) bg-(--brand-500)/10 text-(--brand-400)"
                        : "border-(--border-color) text-(--text-secondary) hover:border-(--brand-500)/50"
                    }`}>
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Tarjeta</span>
                  </button>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full py-4 text-lg font-semibold">
                Confirmar Venta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
