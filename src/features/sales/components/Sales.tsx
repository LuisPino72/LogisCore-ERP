import { useState, useEffect, useCallback } from "react";
import { Sale } from "@/lib/db";
import Card from "@/common/Card";
import { ConfirmationModal } from "@/common/ConfirmationModal";
import { useSales } from "../hooks/useSales";
import { ShoppingBag, Download } from "lucide-react";

import SalesStatsGrid from "./SalesStatsGrid";
import SalesFilters from "./SalesFilters";
import SalesTable from "./SalesTable";
import SaleDetailModal from "./SaleDetailModal";

export default function Sales() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ isOpen: boolean; localId: string | null }>({
    isOpen: false,
    localId: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const {
    loading,
    filters,
    filteredSales,
    paginatedSales,
    currentPage,
    totalPages,
    stats,
    setSearch,
    setDateRange,
    setCustomDateRange,
    setPaymentFilter,
    setStatusFilter,
    setCurrentPage,
    loadSales,
    cancelSale,
    exportCSV,
  } = useSales();

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleCancelSale = useCallback((localId: string) => {
    setConfirmCancel({ isOpen: true, localId });
  }, []);

  const confirmCancelSale = useCallback(async () => {
    if (!confirmCancel.localId) return;
    setCancellingId(confirmCancel.localId);
    try {
      await cancelSale(confirmCancel.localId);
    } catch {
      // Error already handled in hook
    } finally {
      setCancellingId(null);
      setConfirmCancel({ isOpen: false, localId: null });
    }
  }, [confirmCancel.localId, cancelSale]);

  const handleCustomDateApply = useCallback(() => {
    if (customStart && customEnd) {
      setCustomDateRange(new Date(customStart), new Date(customEnd));
      setShowDatePicker(false);
    }
  }, [customStart, customEnd, setCustomDateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-bold text-(--text-primary) flex items-center gap-2"
            title="Historial de todas las ventas registradas"
          >
            <ShoppingBag className="w-6 h-6" />
            Ventas
          </h2>
          <p className="text-(--text-secondary)">{filteredSales.length} transacciones</p>
        </div>
        <button
          onClick={exportCSV}
          title="Exportar lista de ventas a archivo CSV"
          className="flex items-center gap-2 px-4 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-secondary) hover:text-white hover:bg-(--brand-500)/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <SalesStatsGrid stats={stats} />

      <SalesFilters
        search={filters.search}
        dateRange={filters.dateRange}
        paymentFilter={filters.paymentFilter}
        statusFilter={filters.statusFilter}
        showDatePicker={showDatePicker}
        customStart={customStart}
        customEnd={customEnd}
        onSearchChange={setSearch}
        onDateRangeChange={setDateRange}
        onCustomDateApply={handleCustomDateApply}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}
        onPaymentFilterChange={setPaymentFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <Card>
        <SalesTable
          sales={paginatedSales}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          filteredCount={filteredSales.length}
          cancellingId={cancellingId}
          onViewDetails={setSelectedSale}
          onCancelSale={handleCancelSale}
          onPageChange={setCurrentPage}
        />
      </Card>

      {selectedSale && (
        <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}

      <ConfirmationModal
        isOpen={confirmCancel.isOpen}
        message="¿Estás seguro de cancelar esta venta?"
        title="Cancelar Venta"
        confirmText="Cancelar"
        onConfirm={confirmCancelSale}
        onCancel={() => setConfirmCancel({ isOpen: false, localId: null })}
      />
    </div>
  );
}
