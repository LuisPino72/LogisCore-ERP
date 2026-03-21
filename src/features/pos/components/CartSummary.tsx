import Card from "@/common/Card";
import Button from "@/common/Button";
import { ShoppingCart, Pause } from "lucide-react";
import CartItemComponent from "./CartItem";
import PaymentSelector from "./PaymentSelector";
import type { CartItem } from "../services/pos.service";
import type { PaymentMethod } from "../types/pos.types";

interface CartSummaryProps {
  cart: CartItem[];
  cartTotal: number;
  cartCount: number;
  exchangeRate: number;
  showCheckout: boolean;
  paymentMethod: PaymentMethod;
  onUpdateQuantity: (localId: string, delta: number) => void;
  onUpdateWeight: (localId: string, grams: number) => void;
  onSelectSample: (localId: string, sampleId: string) => void;
  onRemoveFromCart: (localId: string) => void;
  onClearCart: () => void;
  onSuspend: () => void;
  onShowCheckout: () => void;
  onCancelCheckout: () => void;
  onConfirmCheckout: () => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  getSaleType: (categoryId?: number) => "unit" | "weight" | "sample";
  formatBs: (amount: number) => string;
}

export default function CartSummary({
  cart,
  cartTotal,
  cartCount,
  exchangeRate,
  showCheckout,
  paymentMethod,
  onUpdateQuantity,
  onUpdateWeight,
  onSelectSample,
  onRemoveFromCart,
  onClearCart,
  onSuspend,
  onShowCheckout,
  onCancelCheckout,
  onConfirmCheckout,
  onPaymentMethodChange,
  getSaleType,
  formatBs,
}: CartSummaryProps) {
  return (
    <Card className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-(--text-primary) flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Carrito
          {cartCount > 0 && (
            <span className="bg-(--brand-500) text-white text-xs px-2 py-0.5 rounded-full">{cartCount}</span>
          )}
        </h3>
        {cart.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={onSuspend}
              title="Suspender venta para continuar después"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              <Pause className="w-3 h-3" />
              Suspender
            </button>
            <button
              onClick={onClearCart}
              title="Limpiar carrito"
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Limpiar
            </button>
          </div>
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
            <CartItemComponent
              key={item.product.localId}
              item={item}
              exchangeRate={exchangeRate}
              saleType={getSaleType(item.product.categoryId)}
              onUpdateQuantity={onUpdateQuantity}
              onUpdateWeight={onUpdateWeight}
              onSelectSample={onSelectSample}
              onRemove={onRemoveFromCart}
              formatBs={formatBs}
            />
          ))
        )}
      </div>

      <div className="border-t border-(--border-color) pt-4 space-y-3">
        <div className="flex justify-between text-(--text-secondary)">
          <span>Subtotal</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xl font-bold text-(--text-primary)">
          <span>Total</span>
          <span className="text-green-400">${cartTotal.toFixed(2)}</span>
        </div>
        {exchangeRate > 0 && (
          <div className="text-center text-blue-400 text-sm">
            Total: {formatBs(cartTotal * exchangeRate)}
          </div>
        )}

        {showCheckout ? (
          <div className="space-y-3">
            <PaymentSelector paymentMethod={paymentMethod} onMethodChange={onPaymentMethodChange} />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancelCheckout} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={onConfirmCheckout} className="flex-1 bg-green-500 hover:bg-green-400">
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={onShowCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 bg-(--brand-600) hover:bg-(--brand-500) disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            Cobrar ${cartTotal.toFixed(2)}
          </Button>
        )}
      </div>
    </Card>
  );
}
