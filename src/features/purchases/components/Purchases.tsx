import { useState, useEffect, useCallback, useMemo } from "react";
import { Purchase, Supplier } from "../../../lib/db";
import { usePurchases } from "../hooks/usePurchases";
import Card from "../../../common/Card";
import Button from "../../../common/Button";
import Input from "../../../common/Input";
import {
  ShoppingBasket,
  Plus,
  Truck,
  Package,
  X,
  Check,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { SortField, PurchaseStatus } from "../types/purchases.types";

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

const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "Esta semana", days: 7 },
  { label: "Este mes", days: 30 },
  { label: "Últimos 3 meses", days: 90 },
];

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

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    productId: "",
    quantity: 1,
    cost: 0,
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = useCallback((field: SortField) => {
    setSort({
      field,
      direction: sort.field === field && sort.direction === "desc" ? "asc" : "desc",
    });
  }, [sort.field, sort.direction, setSort]);

  const handleDatePreset = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFilters({ dateRange: { start, end } });
    setShowDatePicker(false);
  }, [setFilters]);

  const handleStatusFilter = useCallback((status: PurchaseStatus | "all") => {
    setFilters({ status });
  }, [setFilters]);

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

  const removeItem = useCallback((index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }, [form]);

  const handleSubmit = useCallback(async () => {
    const subtotal = form.items.reduce((sum, item) => sum + item.total, 0);
    const selectedSupplier = suppliers.find(
      (s) => s.localId === form.supplierId,
    );

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

  const handleDeleteSupplier = useCallback(async (localId: string) => {
    const confirmed = window.confirm("¿Estás seguro de eliminar este proveedor?");
    if (confirmed) {
      await deleteSupplier(localId);
    }
  }, [deleteSupplier]);

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-30" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1 inline text-(--brand-400)" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 inline text-(--brand-400)" />
    );
  };

  const renderPurchaseCard = (purchase: Purchase) => {
    return (
      <div
        key={purchase.localId}
        className="bg-(--bg-secondary) border border-(--border-color) rounded-xl p-4 shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-(--text-primary)">
              {purchase.supplier}
            </h3>
            <p className="text-xs text-(--text-muted) font-mono">
              {purchase.invoiceNumber}
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              purchase.status === "completed"
                ? "bg-green-500/10 text-green-400"
                : purchase.status === "pending"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-red-500/10 text-red-400"
            }`}>
            {purchase.status === "completed"
              ? "Completado"
              : purchase.status === "pending"
                ? "Pendiente"
                : "Cancelado"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-(--text-secondary) mb-3">
          <span>{purchase.createdAt.toLocaleDateString()}</span>
          <span>{purchase.items.length} items</span>
        </div>
        <div className="pt-3 border-t border-(--border-color) flex items-center justify-between">
          <span className="text-lg font-bold text-green-400">
            ${purchase.total.toFixed(2)}
          </span>
          <button
            onClick={() =>
              setExpandedPurchase(
                expandedPurchase === purchase.localId ? null : purchase.localId,
              )
            }
            title={expandedPurchase === purchase.localId ? "Ocultar detalles" : "Ver detalles de la compra"}
            className="text-(--brand-400) text-sm hover:underline">
            {expandedPurchase === purchase.localId ? "Ocultar" : "Ver detalles"}
          </button>
        </div>
        {expandedPurchase === purchase.localId && (
          <div className="mt-3 pt-3 border-t border-(--border-color)">
            {purchase.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1">
                <span className="text-(--text-secondary)">
                  {item.productName}
                </span>
                <span className="text-(--text-primary)">
                  {item.quantity} x ${item.cost}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2" title="Historial de compras a proveedores">
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
                  className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-(--brand-600) text-white" : "text-(--text-muted) hover:text-(--text-primary)"}`}>
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Ver como tarjetas"
                  className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-(--brand-600) text-white" : "text-(--text-muted) hover:text-(--text-primary)"}`}>
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
              }}>
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
          }`}>
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
          }`}>
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Proveedores ({suppliers.length})
          </span>
        </button>
      </div>

      {activeTab === "purchases" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text">
                    Total Completado
                  </p>
                  <p className="text-2xl font-bold text-green-400">
                    ${stats?.totalCompleted.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {stats?.countCompleted || 0} compras
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text">Pendiente</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    ${stats?.totalPending.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {stats?.countPending || 0} compras
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Truck className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text">Total Compras</p>
                  <p className="text-2xl font-bold text-(--text-primary)">
                    ${((stats?.totalCompleted || 0) + (stats?.totalPending || 0)).toFixed(2)}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    Promedio: ${stats?.avgPurchase.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="p-3 bg-(--brand-500)/20 rounded-lg">
                  <Package className="w-6 h-6 text-(--brand-400)" />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar compras..."
                title="Buscar por proveedor o número de factura"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => handleStatusFilter(e.target.value as PurchaseStatus | "all")}
              title="Filtrar por estado"
              className="px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)">
              <option value="all">Todos los estados</option>
              <option value="completed">Completado</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                title="Filtrar por rango de fechas"
                className="flex items-center gap-2 px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) hover:bg-(--bg-secondary) transition-colors">
                <Calendar className="w-4 h-4" />
                {filters.dateRange.start || filters.dateRange.end
                  ? `${filters.dateRange.start?.toLocaleDateString() || ""} - ${filters.dateRange.end?.toLocaleDateString() || ""}`
                  : "Filtrar por fecha"}
              </button>
              {showDatePicker && (
                <div className="absolute top-full mt-2 right-0 bg-(--bg-secondary) border border-(--border-color) rounded-lg shadow-xl z-20 p-3 min-w-[200px]">
                  <div className="space-y-1">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleDatePreset(preset.days)}
                        className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                        {preset.label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setFilters({ dateRange: { start: null, end: null } });
                        setShowDatePicker(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-(--text-secondary) hover:bg-(--bg-tertiary) rounded-lg transition-colors">
                      Limpiar filtro
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="secondary" onClick={exportCSV} title="Exportar compras a CSV">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>

          <Card>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPurchases.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-(--text-muted)">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay compras registradas</p>
                  </div>
                ) : (
                  filteredPurchases.map(renderPurchaseCard)
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-(--border-color)">
                      <th
                        className="text-left py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                        onClick={() => handleSort("createdAt")}
                        title="Ordenar por fecha">
                        Fecha <SortIcon field="createdAt" />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                        onClick={() => handleSort("supplier")}
                        title="Ordenar por proveedor">
                        Proveedor <SortIcon field="supplier" />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                        onClick={() => handleSort("invoiceNumber")}
                        title="Ordenar por número de factura">
                        Factura <SortIcon field="invoiceNumber" />
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold uppercase">
                        Items
                      </th>
                      <th
                        className="text-right py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                        onClick={() => handleSort("total")}
                        title="Ordenar por total">
                        Total <SortIcon field="total" />
                      </th>
                      <th
                        className="text-center py-3 px-4 text-xs font-semibold uppercase cursor-pointer hover:text-(--text-primary)"
                        onClick={() => handleSort("status")}
                        title="Ordenar por estado">
                        Estado <SortIcon field="status" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-(--text-muted)">
                          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No hay compras registradas</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((purchase) => (
                        <>
                          <tr
                            key={purchase.localId}
                            className="border-b border-(--border-color) hover:bg-(--brand-500)/5 cursor-pointer"
                            onClick={() =>
                              setExpandedPurchase(
                                expandedPurchase === purchase.localId
                                  ? null
                                  : purchase.localId,
                              )
                            }>
                            <td className="py-3 px-4 text-(--text-primary)">
                              {purchase.createdAt.toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-(--text-secondary)">
                              {purchase.supplier}
                            </td>
                            <td className="py-3 px-4 text-(--text-muted) font-mono text-sm">
                              {purchase.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-center text-(--text-secondary)">
                              {purchase.items.length}
                            </td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">
                              ${purchase.total.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  purchase.status === "completed"
                                    ? "bg-green-500/20 text-green-400"
                                    : purchase.status === "pending"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-red-500/20 text-red-400"
                                }`}>
                                {purchase.status === "completed"
                                  ? "Completado"
                                  : purchase.status === "pending"
                                    ? "Pendiente"
                                    : "Cancelado"}
                              </span>
                            </td>
                          </tr>
                          {expandedPurchase === purchase.localId && (
                            <tr
                              key={`${purchase.localId}-details`}
                              className="bg-(--bg-primary)/50">
                              <td colSpan={6} className="py-4 px-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {purchase.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between bg-(--bg-tertiary)/50 p-2 rounded-lg">
                                      <span className="text-(--text-secondary) text-sm">
                                        {item.productName}
                                      </span>
                                      <span className="text-(--text-primary) font-medium">
                                        {item.quantity} x ${item.cost}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-(--border-color)">
                <span className="text-sm text-(--text-muted)">
                  Mostrando {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, total)} de {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Página anterior"
                    className="p-2 rounded-lg hover:bg-(--bg-tertiary) disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-5 h-5 text-(--text-secondary)" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          currentPage === pageNum
                            ? "bg-(--brand-600) text-white"
                            : "hover:bg-(--bg-tertiary) text-(--text-secondary)"
                        }`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Página siguiente"
                    className="p-2 rounded-lg hover:bg-(--bg-tertiary) disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronRight className="w-5 h-5 text-(--text-secondary)" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "suppliers" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar proveedores..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-(--border-color)">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Teléfono
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Notas
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-(--text-muted)">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay proveedores registrados</p>
                      </td>
                    </tr>
                  ) : (
                    suppliers
                      .filter((s) =>
                        filters.search
                          ? s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                            s.phone?.toLowerCase().includes(filters.search.toLowerCase())
                          : true
                      )
                      .map((supplier) => (
                        <tr
                          key={supplier.localId}
                          className="border-b border-(--border-color) hover:bg-(--brand-500)/5">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-(--bg-tertiary) rounded-lg flex items-center justify-center border border-(--border-color)">
                                <User className="w-5 h-5 text-(--text-muted)" />
                              </div>
                              <span className="font-medium text-(--text-primary)">
                                {supplier.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-(--text-secondary)">
                            {supplier.phone || "-"}
                          </td>
                          <td className="py-4 px-4 text-(--text-muted) max-w-xs truncate">
                            {supplier.notes || "-"}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => editSupplier(supplier)}
                                title="Editar proveedor"
                                className="p-2 hover:bg-(--bg-tertiary) rounded-lg text-(--text-muted) hover:text-(--text-primary) transition-all">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSupplier(supplier.localId)
                                }
                                title="Eliminar proveedor"
                                className="p-2 hover:bg-red-500/10 rounded-lg text-(--text-muted) hover:text-red-400 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-primary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color) sticky top-0 bg-(--bg-primary)">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                Nueva Compra
              </h3>
              <button
                onClick={() => setShowModal(false)}
                title="Cerrar"
                className="p-1 hover:bg-(--bg-tertiary) rounded">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1.5">
                  Proveedor
                </label>
                <select
                  value={form.supplierId || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supplierId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary)">
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.localId} value={s.localId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Número de Factura"
                value={form.invoiceNumber}
                onChange={(e) =>
                  setForm({ ...form, invoiceNumber: e.target.value })
                }
                placeholder="FACT-001"
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-(--text-secondary)">
                    Items
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddItem(true)}>
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-(--bg-tertiary) p-3 rounded-lg border border-(--border-color)">
                      <div>
                        <p className="text-(--text-primary)">
                          {item.productName}
                        </p>
                        <p className="text-sm text-(--text-muted)">
                          {item.quantity} x ${item.cost}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">
                          ${(item.quantity * item.cost).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(index)}
                          title="Eliminar item"
                          className="p-1 hover:bg-(--bg-primary) rounded">
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
                    onChange={(e) =>
                      setNewItem({ ...newItem, productId: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-(--bg-secondary) border border-(--border-color) rounded-lg text-(--text-primary)">
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.localId} value={p.localId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      label="Cantidad"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      label="Costo unitario"
                      step="0.01"
                      value={newItem.cost}
                      onChange={(e) =>
                        setNewItem({ ...newItem, cost: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addItem}>
                      Agregar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowAddItem(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t border-(--border-color) pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-(--text-primary)">Total</span>
                  <span className="text-green-400">
                    $
                    {form.items
                      .reduce((sum, item) => sum + item.quantity * item.cost, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={form.items.length === 0}>
                Registrar Compra
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-(--bg-secondary) border border-(--border-color) rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h3>
              <button
                onClick={() => {
                  setShowSupplierModal(false);
                  setEditingSupplier(null);
                }}
                title="Cerrar"
                className="p-1 hover:bg-(--bg-tertiary) rounded">
                <X className="w-5 h-5 text-(--text-muted)" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Nombre del Proveedor"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                placeholder="Ej: Distribuidora ABC"
                required
              />
              <Input
                label="Teléfono"
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, phone: e.target.value })
                }
                placeholder="+54 9 11 1234 5678"
              />
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1.5">
                  Notas
                </label>
                <textarea
                  value={supplierForm.notes}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, notes: e.target.value })
                  }
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500) resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-(--border-color)">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSupplierModal(false);
                    setEditingSupplier(null);
                  }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSupplierSubmit}
                  disabled={!supplierForm.name}>
                  {editingSupplier ? "Guardar Cambios" : "Crear Proveedor"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
