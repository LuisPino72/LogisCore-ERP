import { CreditCard, Banknote, Smartphone } from "lucide-react";
import type { PaymentMethod } from "../types/pos.types";

interface PaymentSelectorProps {
  paymentMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}

export default function PaymentSelector({ paymentMethod, onMethodChange }: PaymentSelectorProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onMethodChange("cash")}
        title="Pagar en efectivo"
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
          paymentMethod === "cash"
            ? "bg-green-500/20 border-green-500 text-green-400"
            : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"
        }`}
      >
        <Banknote className="w-5 h-5" />
        Efectivo
      </button>
      <button
        onClick={() => onMethodChange("card")}
        title="Pagar con tarjeta"
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
          paymentMethod === "card"
            ? "bg-(--brand-500)/20 border-(--brand-500) text-(--brand-400)"
            : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"
        }`}
      >
        <CreditCard className="w-5 h-5" />
        Tarjeta
      </button>
      <button
        onClick={() => onMethodChange("pago_movil")}
        title="Pagar por pago móvil"
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
          paymentMethod === "pago_movil"
            ? "bg-purple-500/20 border-purple-500 text-purple-400"
            : "border-(--border-color) text-(--text-secondary) hover:bg-(--bg-tertiary)"
        }`}
      >
        <Smartphone className="w-5 h-5" />
        Pago Móvil
      </button>
    </div>
  );
}
