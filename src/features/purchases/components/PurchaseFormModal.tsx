import Button from "@/common/Button";
import Input from "@/common/Input";
import { X, Plus } from "lucide-react";
import type { Product, Supplier } from "@/lib/db";

interface PurchaseFormItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  total: number;
}

interface PurchaseFormData {
  supplierId: string | undefined;
  supplierName: string;
  invoiceNumber: string;
  items: PurchaseFormItem[];
}

interface PurchaseFormModalProps {
  isOpen: boolean;
  products: Product[];
  suppliers: Supplier[];
  form: PurchaseFormData;
  showAddItem: boolean;
  newItem: { productId: string; quantity: number; cost: number };
  onClose: () => void;
  onFormChange: (form: PurchaseFormData) => void;
  onShowAddItemChange: (show: boolean) => void;
  onNewItemChange: (item: { productId: string; quantity: number; cost: number }) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
}

export default function PurchaseFormModal({
  isOpen,
  products,
  suppliers,
  form,
  showAddItem,
  newItem,
  onClose,
  onFormChange,
  onShowAddItemChange,
  onNewItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
}: PurchaseFormModalProps) {
  if (!isOpen) return null;

  const total = form.items.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color) sticky top-0 bg-(--bg-primary)">
          <h3 className="text-lg font-semibold text-(--text-primary)">Nueva Compra</h3>
          <button onClick={onClose} title="Cerrar" className="p-1 hover:bg-(--bg-tertiary) rounded">
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1.5">Proveedor</label>
            <select
              value={form.supplierId || ""}
              onChange={(e) => onFormChange({ ...form, supplierId: e.target.value || undefined })}
              className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)"
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((s) => (
                <option key={s.localId} value={s.localId}>{s.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Número de Factura"
            value={form.invoiceNumber}
            onChange={(e) => onFormChange({ ...form, invoiceNumber: e.target.value })}
            placeholder="FACT-001"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-(--text-secondary)">Items</label>
              <Button size="sm" variant="secondary" onClick={() => onShowAddItemChange(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-2">
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-(--bg-tertiary) p-3 rounded-lg border border-(--border-color)"
                >
                  <div>
                    <p className="text-(--text-primary)">{item.productName}</p>
                    <p className="text-sm text-(--text-muted)">{item.quantity} x ${item.cost}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">${(item.quantity * item.cost).toFixed(2)}</span>
                    <button
                      onClick={() => onRemoveItem(index)}
                      title="Eliminar item"
                      className="p-1 hover:bg-(--bg-primary) rounded"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showAddItem && (
            <div className="bg-(--bg-tertiary) p-4 rounded-lg space-y-3 border border-(--border-color)">
              <select
                value={newItem.productId}
                onChange={(e) => onNewItemChange({ ...newItem, productId: e.target.value })}
                className="w-full px-4 py-2.5 bg-(--bg-secondary) border border-(--border-color) rounded-lg text-(--text-primary)"
              >
                <option value="">Seleccionar producto</option>
                {products.map((p) => (
                  <option key={p.localId} value={p.localId}>{p.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  label="Cantidad"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) => onNewItemChange({ ...newItem, quantity: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Costo unitario"
                  step="0.01"
                  value={newItem.cost}
                  onChange={(e) => onNewItemChange({ ...newItem, cost: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onAddItem}>Agregar</Button>
                <Button size="sm" variant="secondary" onClick={() => onShowAddItemChange(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <div className="border-t border-(--border-color) pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-(--text-primary)">Total</span>
              <span className="text-green-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={onSubmit} disabled={form.items.length === 0}>
            Registrar Compra
          </Button>
        </div>
      </div>
    </div>
  );
}
