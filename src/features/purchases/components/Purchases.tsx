import { useState, useEffect, useCallback, useMemo } from "react";
import { usePurchases } from "../hooks/usePurchases";
import Card from "@/common/Card";
import Button from "@/common/Button";
import { ConfirmationModal } from "@/common/ConfirmationModal";
import {
  ShoppingBasket,
  Plus,
  Truck,
  User,
  LayoutGrid,
  List,
} from "lucide-react";
import type { SortField, PurchaseStatus } from "../types/purchases.types";
import type { Supplier } from "@/lib/db";

import PurchaseStatsCards from "./PurchaseStatsCards";
import PurchaseFilters from "./PurchaseFilters";
import PurchaseCard from "./PurchaseCard";
import PurchaseTable from "./PurchaseTable";
import SupplierTable from "./SupplierTable";
import PurchaseFormModal from "./PurchaseFormModal";
import SupplierFormModal from "./SupplierFormModal";

type ViewMode = "table" | "grid";
type Tab = "purchases" | "suppliers";

interface PurchaseForm {
  supplierId: string | undefined;
  supplierName: string;
  invoiceNumber: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    cost: number;
    total: number;
  }[];
}

interface SupplierForm {
  name: string;
  phone: string;
  notes: string;
}

export default function Purchases() {
  const {
    purchases,
    suppliers,
    products,
    stats,
    total,
    currentPage,
    totalPages,
    sort,
    filters,
    loadData,
    createPurchase,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    setSort,
    setPage,
    setFilters,
    exportCSV,
  } = usePurchases();

  const [activeTab, setActiveTab] = useState<Tab>("purchases");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [form, setForm] = useState<PurchaseForm>({
    supplierId: undefined,
    supplierName: "",
    invoiceNumber: "",
    items: [],
  });

  const [supplierForm, setSupplierForm] = useState<SupplierForm>({
    name: "",
    phone: "",
    notes: "",
  });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; localId: string | null }>({
    isOpen: false,
    localId: null,
  });

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    productId: "",
    quantity: 1,
    cost: 0,
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = useCallback(
    (field: SortField) => {
      setSort({
        field,
        direction: sort.field === field && sort.direction === "desc" ? "asc" : "desc",
      });
    },
    [sort.field, sort.direction, setSort]
  );

  const handleDatePreset = useCallback(
    (days: number) => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      setFilters({ dateRange: { start, end } });
      setShowDatePicker(false);
    },
    [setFilters]
  );

  const handleStatusFilter = useCallback(
    (status: PurchaseStatus | "all") => {
      setFilters({ status });
    },
    [setFilters]
  );

  const addItem = useCallback(() => {
    const product = products.find((p) => p.localId === newItem.productId);
    if (!product) return;

    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productId: product.localId,
          productName: product.name,
          quantity: newItem.quantity,
          cost: newItem.cost,
          total: newItem.quantity * newItem.cost,
        },
      ],
    });
    setNewItem({ productId: "", quantity: 1, cost: 0 });
    setShowAddItem(false);
  }, [products, newItem, form]);

  const removeItem = useCallback(
    (index: number) => {
      setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    },
    [form]
  );

  const handleSubmit = useCallback(async () => {
    const subtotal = form.items.reduce((sum, item) => sum + item.total, 0);
    const selectedSupplier = suppliers.find((s) => s.localId === form.supplierId);

    const success = await createPurchase({
      supplier: selectedSupplier?.name || form.supplierName || "Sin proveedor",
      invoiceNumber: form.invoiceNumber,
      items: form.items,
      subtotal,
      tax: 0,
      total: subtotal,
      status: "completed",
    });

    if (success) {
      setShowModal(false);
      setForm({
        supplierId: undefined,
        supplierName: "",
        invoiceNumber: "",
        items: [],
      });
    }
  }, [form, suppliers, createPurchase]);

  const handleSupplierSubmit = useCallback(async () => {
    let success: boolean;
    if (editingSupplier) {
      success = await updateSupplier(editingSupplier.localId, {
        name: supplierForm.name,
        phone: supplierForm.phone || undefined,
        notes: supplierForm.notes || undefined,
      });
    } else {
      success = await createSupplier({
        name: supplierForm.name,
        phone: supplierForm.phone || undefined,
        notes: supplierForm.notes || undefined,
        isActive: true,
      });
    }

    if (success) {
      setShowSupplierModal(false);
      setEditingSupplier(null);
      setSupplierForm({ name: "", phone: "", notes: "" });
    }
  }, [editingSupplier, supplierForm, createSupplier, updateSupplier]);

  const handleDeleteSupplier = useCallback((localId: string) => {
    setConfirmDelete({ isOpen: true, localId });
  }, []);

  const confirmDeleteSupplier = useCallback(async () => {
    if (!confirmDelete.localId) return;
    await deleteSupplier(confirmDelete.localId);
    setConfirmDelete({ isOpen: false, localId: null });
  }, [confirmDelete.localId, deleteSupplier]);

  const editSupplier = useCallback((supplier: Supplier) => {
    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone || "",
      notes: supplier.notes || "",
    });
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  }, []);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !p.supplier.toLowerCase().includes(searchLower) &&
          !p.invoiceNumber.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (filters.status !== "all" && p.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [purchases, filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold text-(--text-primary) flex items-center gap-2"
            title="Historial de compras a proveedores"
          >
            <ShoppingBasket className="w-6 h-6" />
            Compras
          </h2>
          <p className="text-(--text-secondary)">
            Gestión de proveedores y abastecimiento
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === "purchases" && (
            <>
              <div className="flex items-center bg-(--bg-tertiary)/50 rounded-lg p-1 border border-(--border-color)">
                <button
                  onClick={() => setViewMode("table")}
                  title="Ver como tabla"
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-(--brand-600) text-white"
                      : "text-(--text-muted) hover:text-(--text-primary)"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Ver como tarjetas"
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-(--brand-600) text-white"
                      : "text-(--text-muted) hover:text-(--text-primary)"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Compra
              </Button>
            </>
          )}
          {activeTab === "suppliers" && (
            <Button
              onClick={() => {
                setEditingSupplier(null);
                setSupplierForm({ name: "", phone: "", notes: "" });
                setShowSupplierModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proveedor
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b border-(--border-color)">
        <button
          onClick={() => setActiveTab("purchases")}
          title="Ver historial de compras"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "purchases"
              ? "border-(--brand-500) text-(--brand-400)"
              : "border-transparent text-(--text-muted) hover:text-(--text-primary)"
          }`}
        >
          <span className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Compras
          </span>
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          title="Gestionar proveedores"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "suppliers"
              ? "border-(--brand-500) text-(--brand-400)"
              : "border-transparent text-(--text-muted) hover:text-(--text-primary)"
          }`}
        >
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Proveedores ({suppliers.length})
          </span>
        </button>
      </div>

      {activeTab === "purchases" && (
        <>
          <PurchaseStatsCards stats={stats} />

          <PurchaseFilters
            search={filters.search}
            status={filters.status}
            dateRange={filters.dateRange}
            showDatePicker={showDatePicker}
            onSearchChange={(value) => setFilters({ search: value })}
            onStatusChange={handleStatusFilter}
            onDatePreset={handleDatePreset}
            onClearDateFilter={() => setFilters({ dateRange: { start: null, end: null } })}
            onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}
            onExport={exportCSV}
          />

          <Card>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPurchases.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-(--text-muted)">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay compras registradas</p>
                  </div>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <PurchaseCard
                      key={purchase.localId}
                      purchase={purchase}
                      expanded={expandedPurchase === purchase.localId}
                      onToggleExpand={() =>
                        setExpandedPurchase(
                          expandedPurchase === purchase.localId ? null : purchase.localId
                        )
                      }
                    />
                  ))
                )}
              </div>
            ) : (
              <PurchaseTable
                purchases={filteredPurchases}
                sort={sort}
                expandedPurchase={expandedPurchase}
                currentPage={currentPage}
                totalPages={totalPages}
                total={total}
                onSort={handleSort}
                onToggleExpand={(localId) =>
                  setExpandedPurchase(expandedPurchase === localId ? null : localId)
                }
                onPageChange={setPage}
              />
            )}
          </Card>
        </>
      )}

      {activeTab === "suppliers" && (
        <>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Buscar proveedores..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>

          <Card>
            <SupplierTable
              suppliers={suppliers.filter((s) =>
                filters.search
                  ? s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                    s.phone?.toLowerCase().includes(filters.search.toLowerCase())
                  : true
              )}
              onEdit={editSupplier}
              onDelete={handleDeleteSupplier}
            />
          </Card>
        </>
      )}

      <PurchaseFormModal
        isOpen={showModal}
        products={products}
        suppliers={suppliers}
        form={form}
        showAddItem={showAddItem}
        newItem={newItem}
        onClose={() => setShowModal(false)}
        onFormChange={setForm}
        onShowAddItemChange={setShowAddItem}
        onNewItemChange={setNewItem}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        onSubmit={handleSubmit}
      />

      <SupplierFormModal
        isOpen={showSupplierModal}
        editingSupplier={editingSupplier}
        form={supplierForm}
        onClose={() => {
          setShowSupplierModal(false);
          setEditingSupplier(null);
        }}
        onFormChange={setSupplierForm}
        onSubmit={handleSupplierSubmit}
      />

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        message="¿Estás seguro de eliminar este proveedor?"
        title="Eliminar Proveedor"
        confirmText="Eliminar"
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setConfirmDelete({ isOpen: false, localId: null })}
      />
    </div>
  );
}
