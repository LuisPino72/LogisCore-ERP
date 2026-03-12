import { useState, useEffect } from 'react';
import { db, Product, Sale } from '../../services/db';
import { useTenantStore } from '../../store/useTenantStore';
import { EventBus, Events } from '../../services/events/EventBus';
import { SyncEngine } from '../../services/sync/SyncEngine';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { ShoppingCart, Plus, Minus, X, Trash2, CreditCard, Banknote } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [showCheckout, setShowCheckout] = useState(false);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    async function loadProducts() {
      if (!tenant?.slug) return;
      const data = await db.products
        .where('tenantId')
        .equals(tenant.slug)
        .filter(p => p.isActive && p.stock > 0)
        .toArray();
      setProducts(data);
    }
    loadProducts();
  }, [tenant?.slug]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.localId === product.localId);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.localId === product.localId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (localId: string, delta: number) => {
    setCart((prev) =>
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
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (localId: string) => {
    setCart((prev) => prev.filter((item) => item.product.localId !== localId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    const saleItems = cart.map(item => ({
      productId: item.product.localId,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
    }));

    const newSale: Sale = {
      localId: crypto.randomUUID(),
      tenantId: tenant!.slug,
      items: saleItems,
      subtotal: cartTotal,
      tax: 0,
      total: cartTotal,
      paymentMethod,
      status: 'completed',
      createdAt: new Date(),
    };

    await db.sales.add(newSale);
    await SyncEngine.addToQueue('sales', 'create', newSale as unknown as Record<string, unknown>, newSale.localId);

    for (const item of cart) {
      const newStock = item.product.stock - item.quantity;
      await db.products.update(item.product.localId, { stock: newStock, updatedAt: new Date() });
    }

    EventBus.emit(Events.SALE_COMPLETED, {
      items: cart,
      total: cartTotal,
      paymentMethod,
      timestamp: new Date(),
    });

    setCart([]);
    setShowCheckout(false);
    alert('Venta registrada exitosamente!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Punto de Venta</h2>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pr-2">
          {filteredProducts.map((product) => (
            <button
              key={product.localId}
              onClick={() => addToCart(product)}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-blue-500 hover:bg-slate-700/50 transition-all duration-200 group"
            >
              <div className="h-20 bg-slate-700 rounded-lg mb-3 flex items-center justify-center">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="font-medium text-white truncate">{product.name}</h3>
              <p className="text-xs text-slate-400 mb-2">{product.sku}</p>
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-bold">${product.price.toFixed(2)}</span>
                <span className={`text-xs ${product.stock <= 10 ? 'text-red-400' : 'text-slate-400'}`}>
                  Stock: {product.stock}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <Card className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrito
              {cartCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </h3>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.localId}
                  className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{item.product.name}</h4>
                    <p className="text-green-400 text-sm">
                      ${item.product.price.toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.localId, -1)}
                      className="p-1 hover:bg-slate-700 rounded"
                    >
                      <Minus className="w-4 h-4 text-slate-400" />
                    </button>
                    <span className="w-8 text-center text-white font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.localId, 1)}
                      className="p-1 hover:bg-slate-700 rounded"
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.localId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-700 pt-4 space-y-3">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span className="text-green-400">${cartTotal.toFixed(2)}</span>
            </div>

            {cart.length > 0 && (
              <Button onClick={() => setShowCheckout(true)} className="w-full">
                Proceder al Pago
              </Button>
            )}
          </div>
        </Card>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Finalizar Venta</h3>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <p className="text-slate-400">Total a pagar</p>
                <p className="text-4xl font-bold text-green-400">${cartTotal.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-400">Método de pago</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    Efectivo
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      paymentMethod === 'card'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Tarjeta
                  </button>
                </div>
              </div>

              <Button onClick={handleCheckout} className="w-full py-3 text-lg">
                Confirmar Venta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
